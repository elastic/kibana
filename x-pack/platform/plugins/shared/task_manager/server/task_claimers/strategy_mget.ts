/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Basic operation of this task claimer:
// - search for candidate tasks to run, more than we actually can run
// - initial search returns a slimmer task document for I/O efficiency (no params or state)
// - for each task found, do an mget to get the current seq_no and primary_term
// - if the mget result doesn't match the search result, the task is stale
// - from the non-stale search results, return as many as we can run based on available
//   capacity and the cost of each task type to run

import type { Logger } from 'elastic-apm-node';
import apm from 'elastic-apm-node';
import { withActiveSpan } from '@kbn/tracing-utils';
import type { Subject } from 'rxjs';
import { createWrappedLogger } from '../lib/wrapped_logger';

import { sharedConcurrencyTaskTypes, type TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskClaimerOpts, ClaimOwnershipResult } from '.';
import { getEmptyClaimOwnershipResult, getExcludedTaskTypes } from '.';
import type {
  ConcreteTaskInstance,
  ConcreteTaskInstanceVersion,
  PartialConcreteTaskInstance,
} from '../task';
import { TaskStatus, TaskCost } from '../task';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import { TASK_MANAGER_MARK_AS_CLAIMED } from '../queries/task_claiming';
import type { TaskClaim } from '../task_events';
import { asTaskClaimEvent, startTaskTimer } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from '../queries/query_clauses';

import {
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  getClaimSort,
  EnabledTask,
  OneOfTaskTypes,
  RecognizedTask,
  tasksWithPartitions,
} from '../queries/mark_available_tasks_as_claimed';

import type { TaskStore, SearchOpts } from '../task_store';
import { isOk, asOk } from '../lib/result_type';
import { selectTasksByCapacity } from './lib/task_selector_by_capacity';
import { getTaskCost } from './lib/get_task_cost';
import type { TaskPartitioner } from '../lib/task_partitioner';
import { getRetryAt } from '../lib/get_retry_at';

interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
  size: number;
  taskTypes: Set<string>;
  getCapacity: (taskType?: string | undefined) => number;
  excludedTaskTypePatterns: string[];
  taskStore: TaskStore;
  events$: Subject<TaskClaim>;
  definitions: TaskTypeDictionary;
  taskMaxAttempts: Record<string, number>;
  taskPartitioner: TaskPartitioner;
  logger: Logger;
}

const SIZE_MULTIPLIER_FOR_TASK_FETCH = 4;

// The candidate search only needs task metadata to run capacity accounting and
// staleness checks; `state`/`params` can be arbitrarily large and are re-fetched
// in full (for the tasks actually claimed) by the bulkGet at the end of the
// claim cycle, so excluding them here shrinks every candidate search response
// without changing how many searches are issued.
const CANDIDATE_SEARCH_SOURCE_EXCLUDES = ['task.state', 'task.params'];

export async function claimAvailableTasksMget(
  opts: TaskClaimerOpts
): Promise<ClaimOwnershipResult> {
  return withActiveSpan(
    'mark-task-as-claimed',
    {
      attributes: { 'transaction.type': TASK_MANAGER_TRANSACTION_TYPE },
      // Make sure that this is a parent transaction (not a child of any other ongoing transaction)
      root: true,
    },
    async () => {
      const apmTrans = apm.startTransaction(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );

      try {
        const result = await claimAvailableTasks(opts);
        apmTrans.end('success');
        return result;
      } catch (err) {
        apmTrans.end('failure');
        throw err;
      }
    }
  );
}

async function claimAvailableTasks(opts: TaskClaimerOpts): Promise<ClaimOwnershipResult> {
  const { getCapacity, claimOwnershipUntil, batches, events$, taskStore, taskPartitioner } = opts;
  const { definitions, excludedTaskTypes, taskMaxAttempts } = opts;
  const logger = createWrappedLogger({ logger: opts.logger, tags: [claimAvailableTasksMget.name] });
  const initialCapacity = getCapacity();
  const stopTaskTimer = startTaskTimer();

  // get a list of candidate tasks to claim, with their version info
  const { docs, versionMap } = await searchAvailableTasks({
    definitions,
    taskTypes: new Set(definitions.getAllTypes()),
    excludedTaskTypePatterns: excludedTaskTypes,
    taskStore,
    events$,
    claimOwnershipUntil,
    getCapacity,
    // set size to accommodate the possibility of retrieving all
    // tasks with the smallest cost, with a size multipler to account
    // for possible conflicts
    size: initialCapacity * TaskCost.Tiny * SIZE_MULTIPLIER_FOR_TASK_FETCH,
    taskMaxAttempts,
    taskPartitioner,
    logger,
  });

  if (docs.length === 0)
    return {
      ...getEmptyClaimOwnershipResult(),
      timing: stopTaskTimer(),
    };

  // use mget to get the latest version of each task
  const docLatestVersions = await taskStore.getDocVersions(docs.map((doc) => `task:${doc.id}`));

  // filter out stale and missing tasks
  const currentTasks: ConcreteTaskInstance[] = [];
  const staleTasks: ConcreteTaskInstance[] = [];
  const missingTasks: ConcreteTaskInstance[] = [];

  for (const searchDoc of docs) {
    const searchVersion = versionMap.get(searchDoc.id);
    const latestVersion = docLatestVersions.get(`task:${searchDoc.id}`);
    if (!searchVersion || !latestVersion) {
      missingTasks.push(searchDoc);
      continue;
    }

    if (
      searchVersion.seqNo === latestVersion.seqNo &&
      searchVersion.primaryTerm === latestVersion.primaryTerm
    ) {
      currentTasks.push(searchDoc);
      continue;
    } else {
      staleTasks.push(searchDoc);
      continue;
    }
  }

  // apply limited concurrency limits (TODO: can currently starve other tasks)
  const candidateTasks = selectTasksByCapacity({ definitions, tasks: currentTasks, batches });

  // apply capacity constraint to candidate tasks
  const tasksToRun: ConcreteTaskInstance[] = [];
  const leftOverTasks: ConcreteTaskInstance[] = [];
  const tasksWithMalformedData: ConcreteTaskInstance[] = [];

  // for batchable task types, only the task that opens a new batch (every
  // `batchSize`-th task of that type) is charged capacity; the rest of the
  // batch rides along on that one slot. If the opening task doesn't fit, the
  // whole batch is left over, even though its continuation tasks cost nothing.
  const batchTaskCountByType = new Map<string, number>();
  const batchAdmittedByType = new Map<string, boolean>();

  let capacityAccumulator = 0;
  for (const task of candidateTasks) {
    const definition = definitions.get(task.taskType);
    const taskCost = getTaskCost(task, definitions);

    if (definition?.createBatchTaskRunner) {
      const batchSize = definition.batchSize ?? 1;
      const tasksSeenForType = batchTaskCountByType.get(task.taskType) ?? 0;
      const opensNewBatch = tasksSeenForType % batchSize === 0;
      batchTaskCountByType.set(task.taskType, tasksSeenForType + 1);

      if (opensNewBatch) {
        const admitted = capacityAccumulator + taskCost <= initialCapacity;
        batchAdmittedByType.set(task.taskType, admitted);
        if (admitted) {
          tasksToRun.push(task);
          capacityAccumulator += taskCost;
        } else {
          leftOverTasks.push(task);
          capacityAccumulator = initialCapacity;
        }
      } else if (batchAdmittedByType.get(task.taskType)) {
        tasksToRun.push(task);
      } else {
        leftOverTasks.push(task);
      }
      continue;
    }

    if (capacityAccumulator + taskCost <= initialCapacity) {
      tasksToRun.push(task);
      capacityAccumulator += taskCost;
    } else {
      leftOverTasks.push(task);
      capacityAccumulator = initialCapacity;
    }
  }

  // build the updated task objects we'll claim
  const now = new Date();
  const taskUpdates: PartialConcreteTaskInstance[] = [];
  for (const task of tasksToRun) {
    try {
      taskUpdates.push({
        id: task.id,
        version: task.version,
        scheduledAt:
          task.retryAt != null && new Date(task.retryAt).getTime() < Date.now()
            ? task.retryAt
            : task.runAt,
        status: TaskStatus.Running,
        startedAt: now,
        attempts: task.attempts + 1,
        retryAt: getRetryAt(task, definitions.get(task.taskType)) ?? null,
        ownerId: taskStore.taskManagerId,
      });
    } catch (error) {
      logger.error(
        `Error validating task schema ${task.id}:${task.taskType} during claim: ${JSON.stringify(
          error.message
        )}`
      );
      tasksWithMalformedData.push(task);
    }
  }

  // perform the task object updates, deal with errors
  const updatedTasks: Record<string, PartialConcreteTaskInstance> = {};
  let conflicts = 0;
  let bulkUpdateErrors = 0;
  let bulkGetErrors = 0;

  const updateResults = await taskStore.bulkPartialUpdate(taskUpdates);
  for (const updateResult of updateResults) {
    if (isOk(updateResult)) {
      updatedTasks[updateResult.value.id] = updateResult.value;
    } else {
      const { id, type, error, status } = updateResult.error;

      // check for 409 conflict errors
      if (status === 409) {
        conflicts++;
      } else {
        logger.error(`Error updating task ${id}:${type} during claim: ${JSON.stringify(error)}`);
        bulkUpdateErrors++;
      }
    }
  }

  // perform an mget to get the full task instance for claiming
  const fullTasksToRun = (await taskStore.bulkGet(Object.keys(updatedTasks))).reduce<
    ConcreteTaskInstance[]
  >((acc, task) => {
    if (isOk(task) && task.value.version !== updatedTasks[task.value.id].version) {
      logger.warn(
        `Task ${task.value.id} was modified during the claiming phase, skipping until the next claiming cycle.`
      );
      conflicts++;
    } else if (isOk(task)) {
      acc.push(task.value);
    } else {
      const { id, type, error } = task.error;
      logger.error(`Error getting full task ${id}:${type} during claim: ${error.message}`);
      bulkGetErrors++;
    }
    return acc;
  }, []);

  // TODO: need a better way to generate stats
  const message = `task claimer claimed: ${fullTasksToRun.length}; stale: ${staleTasks.length}; conflicts: ${conflicts}; missing: ${missingTasks.length}; capacity reached: ${leftOverTasks.length}; updateErrors: ${bulkUpdateErrors}; getErrors: ${bulkGetErrors}; malformed data errors: ${tasksWithMalformedData.length}`;
  logger.debug(message);

  // build results
  const finalResult = {
    stats: {
      tasksUpdated: fullTasksToRun.length,
      tasksConflicted: conflicts,
      tasksClaimed: fullTasksToRun.length,
      tasksLeftUnclaimed: leftOverTasks.length,
      tasksErrors: bulkUpdateErrors + bulkGetErrors + tasksWithMalformedData.length,
      staleTasks: staleTasks.length,
    },
    docs: fullTasksToRun,
    timing: stopTaskTimer(),
  };

  for (const doc of fullTasksToRun) {
    events$.next(asTaskClaimEvent(doc.id, asOk(doc), finalResult.timing));
  }

  return finalResult;
}

interface SearchAvailableTasksResponse {
  docs: ConcreteTaskInstance[];
  versionMap: Map<string, ConcreteTaskInstanceVersion>;
}

let lastPartitionWarningLog: number | undefined;
export const NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL = 60000;

async function searchAvailableTasks({
  definitions,
  taskTypes,
  excludedTaskTypePatterns,
  taskStore,
  getCapacity,
  size,
  taskPartitioner,
  logger,
}: OwnershipClaimingOpts): Promise<SearchAvailableTasksResponse> {
  const excludedTaskTypes = new Set(getExcludedTaskTypes(definitions, excludedTaskTypePatterns));
  const claimPartitions = buildClaimPartitions({
    types: taskTypes,
    excludedTaskTypes,
    getCapacity,
    definitions,
  });
  const partitions = await taskPartitioner.getPartitions();
  if (
    partitions.length === 0 &&
    (lastPartitionWarningLog == null ||
      lastPartitionWarningLog <= Date.now() - NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL)
  ) {
    logger.warn(
      `Background task node "${taskPartitioner.getPodName()}" has no assigned partitions, claiming against all partitions`
    );
    lastPartitionWarningLog = Date.now();
  }

  if (partitions.length !== 0 && lastPartitionWarningLog) {
    lastPartitionWarningLog = undefined;
    logger.info(
      `Background task node "${taskPartitioner.getPodName()}" now claiming with assigned partitions`
    );
  }

  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(definitions);
  const searches: SearchOpts[] = [];

  // not handling removed types yet

  // add search for unlimited types
  if (claimPartitions.unlimitedTypes.length > 0) {
    const queryForUnlimitedTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // a task type that's not excluded (may be removed or not)
      OneOfTaskTypes('task.taskType', claimPartitions.unlimitedTypes),
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      // must have a status that isn't 'unrecognized'
      RecognizedTask
    );

    const queryUnlimitedTasks = matchesClauses(
      queryForUnlimitedTasks,
      filterDownBy(InactiveTasks),
      partitions.length ? tasksWithPartitions(partitions) : undefined
    );
    searches.push({
      query: queryUnlimitedTasks,
      sort, // note: we could optimize this to not sort on priority, for this case
      size,
      seq_no_primary_term: true,
      _source_excludes: CANDIDATE_SEARCH_SOURCE_EXCLUDES,
    });
  }

  // add searches for limited types
  for (const [types, capacity] of claimPartitions.limitedTypes) {
    const queryForLimitedTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // Specific task type
      OneOfTaskTypes('task.taskType', types.split(',')),
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      // must have a status that isn't 'unrecognized'
      RecognizedTask
    );

    const query = matchesClauses(
      queryForLimitedTasks,
      filterDownBy(InactiveTasks),
      partitions.length ? tasksWithPartitions(partitions) : undefined
    );
    searches.push({
      query,
      sort,
      size: capacity * SIZE_MULTIPLIER_FOR_TASK_FETCH,
      seq_no_primary_term: true,
      _source_excludes: CANDIDATE_SEARCH_SOURCE_EXCLUDES,
    });
  }

  // add searches for batchable types: each gets a dedicated search fetching
  // up to `batchSize` docs per available slot, so a single poll cycle can
  // fill several batches for the type. No over-fetch multiplier here since
  // batch sizes can be large enough that a 4x multiplier is wasteful.
  for (const [type, { batchSize, slots }] of claimPartitions.batchTypes) {
    const queryForBatchTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // Specific task type
      OneOfTaskTypes('task.taskType', [type]),
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      // must have a status that isn't 'unrecognized'
      RecognizedTask
    );

    const query = matchesClauses(
      queryForBatchTasks,
      filterDownBy(InactiveTasks),
      partitions.length ? tasksWithPartitions(partitions) : undefined
    );
    searches.push({
      query,
      sort,
      size: batchSize * slots,
      seq_no_primary_term: true,
      _source_excludes: CANDIDATE_SEARCH_SOURCE_EXCLUDES,
    });
  }

  return await taskStore.msearch(searches);
}

interface ClaimPartitions {
  unlimitedTypes: string[];
  // Map where key is a limited concurrency task type and value is the current capacity
  // Key can also be a comma-delimited list of limited concurrency task types that share the same concurrency.
  //   In this case, the value is the minimum available capacity across all shared concurrency task types.
  //   For example, if taskTypeA and taskTypeB share concurrency and taskTypeA has a capacity of 2 while taskTypeB
  //     has a capacity of 4, the Map value will be
  //     Map {
  //       'taskTypeA,taskTypeB' => 2
  //     }
  limitedTypes: Map<string, number>;
  // Map where key is a batchable task type (createBatchTaskRunner) and value is
  // its batchSize and the number of batch "slots" currently available for it,
  // i.e. how many batches of that type could be run concurrently given capacity.
  batchTypes: Map<string, { batchSize: number; slots: number }>;
}

interface BuildClaimPartitionsOpts {
  types: Set<string>;
  excludedTaskTypes: Set<string>;
  getCapacity: (taskType?: string) => number;
  definitions: TaskTypeDictionary;
}

function buildClaimPartitions(opts: BuildClaimPartitionsOpts): ClaimPartitions {
  const result: ClaimPartitions = {
    unlimitedTypes: [],
    limitedTypes: new Map(),
    batchTypes: new Map(),
  };

  const { types, excludedTaskTypes, getCapacity, definitions } = opts;
  for (const type of types) {
    const definition = definitions.get(type);
    if (definition == null) continue;

    if (excludedTaskTypes.has(type)) continue;

    if (definition.createBatchTaskRunner) {
      // batchable types get their own dedicated search, sized to cover as
      // many batches as could currently be run, rather than folding into the
      // unlimited/limited partitions above.
      const availableCapacity = getCapacity(definition.type);
      const slots = Math.floor(availableCapacity / definition.cost);
      if (slots > 0 && definition.batchSize) {
        result.batchTypes.set(definition.type, { batchSize: definition.batchSize, slots });
      }
      continue;
    }

    if (definition.maxConcurrency == null) {
      result.unlimitedTypes.push(definition.type);
      continue;
    }

    // task type has maxConcurrency defined

    const isSharingConcurrency = sharedConcurrencyTaskTypes(type);
    if (isSharingConcurrency) {
      let minCapacity = null;
      for (const sharedType of isSharingConcurrency) {
        const def = definitions.get(sharedType);
        if (def) {
          const capacity = getCapacity(def.type) / def.cost;
          if (minCapacity == null) {
            minCapacity = capacity;
          } else if (capacity < minCapacity) {
            minCapacity = capacity;
          }
        }
      }
      if (minCapacity) {
        result.limitedTypes.set(isSharingConcurrency.join(','), minCapacity);
      }
    } else {
      const capacity = getCapacity(definition.type) / definition.cost;
      if (capacity !== 0) {
        result.limitedTypes.set(definition.type, capacity);
      }
    }
  }

  return result;
}
