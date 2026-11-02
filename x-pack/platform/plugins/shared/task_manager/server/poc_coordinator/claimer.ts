/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam.
 *
 * Fork of task_claimers/strategy_mget.ts, with these deliberate differences:
 *
 *  1. NO HYDRATION. The original ends with taskStore.bulkGet() to inflate the
 *     claimed candidates into full ConcreteTaskInstances (params/state/
 *     decrypted API keys). That drags ISavedObjectsRepository and the ESO
 *     client across the seam, and ships secrets through the coordinator. In
 *     the split design the coordinator returns slim ClaimedTaskRefs
 *     ({id, taskType, post-claim version}) and the EXECUTOR hydrates with its
 *     own full TaskStore. Control crosses the seam; data stays where it is
 *     consumed.
 *  2. No APM transaction wrapper (pulled TASK_MANAGER_TRANSACTION_TYPE from
 *     task_running, and apm's context is execution-side anyway).
 *  3. No TaskClaim events$ (main-thread monitoring consumes those; claim
 *     stats cross channel 2 instead).
 *  4. getCapacity reads the last executor CapacitySnapshot — advisory and
 *     possibly stale, over-claim is tolerated by design.
 *  5. Claim-time retryAt logic inlined (original getRetryAt pulls
 *     isRetryableError from task_running; at claim time the "error" is a
 *     fresh plain Error, for which isRetryableError always yields null -> retry).
 */

import { minimatch } from 'minimatch';
import { random } from 'lodash';

import type { PartialConcreteTaskInstance, TaskClaimCandidate } from '../task';
import { TaskStatus, TaskCost, getTaskCostFromInstance, DEFAULT_TIMEOUT } from '../task';
import { startTaskTimer } from '../task_events';
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
import type { TaskTypeDictionary } from '../task_type_dictionary';
import { sharedConcurrencyTaskTypes } from '../task_type_dictionary';
import type { SearchOpts } from '../task_store';
import { isOk } from '../lib/result_type';
import { intervalFromDate, maxIntervalFromDate, parseIntervalAsSecond } from '../lib/intervals';

import type { CoordinatorStore } from './coordinator_store';
import type { CoordinatorDefinitionsRegistry } from './definitions_registry';
import type { CoordinatorPartitioner } from './coordinator_partitioner';
import type {
  ClaimedTaskBatch,
  ClaimedTaskRef,
  CoordinatorLogger,
  SerializedTaskTypeDefinition,
} from './types';

const SIZE_MULTIPLIER_FOR_TASK_FETCH = 4;

export interface CoordinatorClaimOpts {
  store: CoordinatorStore;
  definitions: CoordinatorDefinitionsRegistry;
  partitioner: CoordinatorPartitioner;
  logger: CoordinatorLogger;
  claimOwnershipUntil: Date;
  /** Advisory capacity from the last executor snapshot. */
  getCapacity: (taskType?: string) => number;
  excludedTaskTypePatterns: string[];
  defaultMaxAttempts: number;
  cycle: number;
}

export async function claimAvailableTasks(opts: CoordinatorClaimOpts): Promise<ClaimedTaskBatch> {
  const { store, definitions, logger, getCapacity, cycle } = opts;
  const initialCapacity = getCapacity();
  const stopTaskTimer = startTaskTimer();

  const { docs, versionMap } = await searchAvailableTasks({
    ...opts,
    size: initialCapacity * TaskCost.Tiny * SIZE_MULTIPLIER_FOR_TASK_FETCH,
  });

  if (docs.length === 0) {
    return { tasks: [], stats: emptyStats(), timing: stopTaskTimer(), cycle };
  }

  // mget the latest version of each candidate, filter out stale/missing
  const docLatestVersions = await store.getDocVersions(docs.map((doc) => `task:${doc.id}`));
  const currentTasks: TaskClaimCandidate[] = [];
  let staleTasks = 0;
  let missingTasks = 0;
  for (const searchDoc of docs) {
    const searchVersion = versionMap.get(searchDoc.id);
    const latestVersion = docLatestVersions.get(`task:${searchDoc.id}`);
    if (!searchVersion || !latestVersion || latestVersion.error) {
      missingTasks++;
      continue;
    }
    if (
      searchVersion.seqNo === latestVersion.seqNo &&
      searchVersion.primaryTerm === latestVersion.primaryTerm
    ) {
      currentTasks.push(searchDoc);
    } else {
      staleTasks++;
    }
  }

  // apply limited-concurrency selection, then the capacity constraint
  const candidateTasks = selectTasksByCapacity(definitions, currentTasks, getCapacity);
  const tasksToRun: TaskClaimCandidate[] = [];
  let leftOverTasks = 0;
  let capacityAccumulator = 0;
  for (const task of candidateTasks) {
    const taskCost =
      getTaskCostFromInstance(task.cost) ?? definitions.get(task.taskType)?.cost ?? TaskCost.Normal;
    if (capacityAccumulator + taskCost <= initialCapacity) {
      tasksToRun.push(task);
      capacityAccumulator += taskCost;
    } else {
      leftOverTasks++;
      capacityAccumulator = initialCapacity;
    }
  }

  // stamp the claim: ownerId is the task manager id this coordinator claims FOR
  const now = new Date();
  const taskUpdates: PartialConcreteTaskInstance[] = tasksToRun.map((task) => ({
    id: task.id,
    version: task.version,
    scheduledAt:
      task.retryAt != null && new Date(task.retryAt).getTime() < Date.now()
        ? task.retryAt
        : task.runAt,
    status: TaskStatus.Running,
    startedAt: now,
    attempts: task.attempts + 1,
    retryAt: getClaimRetryAt(task, definitions.get(task.taskType)) ?? null,
    ownerId: store.taskManagerId,
  }));

  const typeById = new Map<string, string>(tasksToRun.map((task) => [task.id, task.taskType]));

  let conflicts = 0;
  let bulkUpdateErrors = 0;
  const claimedRefs: ClaimedTaskRef[] = [];
  const updateResults = await store.bulkPartialUpdate(taskUpdates);
  for (const updateResult of updateResults) {
    if (isOk(updateResult)) {
      const { id, version } = updateResult.value;
      claimedRefs.push({
        id: id!,
        taskType: typeById.get(id!) ?? 'unknown',
        version: version!,
      });
    } else {
      const { id, status, error } = updateResult.error;
      if (status === 409) {
        conflicts++;
      } else {
        logger.error(`Error updating task ${id} during claim: ${JSON.stringify(error)}`);
        bulkUpdateErrors++;
      }
    }
  }

  const stats = {
    tasksUpdated: claimedRefs.length,
    tasksConflicted: conflicts,
    tasksClaimed: claimedRefs.length,
    tasksLeftUnclaimed: leftOverTasks,
    tasksErrors: bulkUpdateErrors,
    staleTasks,
  };

  logger.info(
    `[cycle ${cycle}] coordinator claimed: ${claimedRefs.length}; stale: ${staleTasks}; conflicts: ${conflicts}; missing: ${missingTasks}; capacity reached: ${leftOverTasks}; updateErrors: ${bulkUpdateErrors}`
  );

  return { tasks: claimedRefs, stats, timing: stopTaskTimer(), cycle };
}

function emptyStats() {
  return {
    tasksUpdated: 0,
    tasksConflicted: 0,
    tasksClaimed: 0,
    tasksLeftUnclaimed: 0,
    tasksErrors: 0,
    staleTasks: 0,
  };
}

/* ------------------------- search (fork of searchAvailableTasks) ------------------------- */

interface SearchArgs extends CoordinatorClaimOpts {
  size: number;
}

let lastPartitionWarningLog: number | undefined;
const NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL = 60000;

async function searchAvailableTasks({
  definitions,
  excludedTaskTypePatterns,
  store,
  getCapacity,
  size,
  partitioner,
  logger,
}: SearchArgs) {
  const taskTypes = new Set(definitions.getAllTypes());
  const excludedTaskTypes = new Set(
    definitions
      .getAllTypes()
      .filter((type) =>
        excludedTaskTypePatterns.some((pattern) => minimatch(type, pattern))
      )
  );
  const claimPartitions = buildClaimPartitions({
    types: taskTypes,
    excludedTaskTypes,
    getCapacity,
    definitions,
  });
  const partitions = await partitioner.getPartitions();
  if (
    partitions.length === 0 &&
    (lastPartitionWarningLog == null ||
      lastPartitionWarningLog <= Date.now() - NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL)
  ) {
    logger.warn(
      `Background task node "${partitioner.getPodName()}" has no assigned partitions, claiming against all partitions`
    );
    lastPartitionWarningLog = Date.now();
  }
  if (partitions.length !== 0 && lastPartitionWarningLog) {
    lastPartitionWarningLog = undefined;
  }

  const dictionary = definitions as unknown as TaskTypeDictionary;
  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(dictionary);
  const searches: SearchOpts[] = [];

  if (claimPartitions.unlimitedTypes.length > 0) {
    const queryForUnlimitedTasks = mustBeAllOf(
      EnabledTask,
      OneOfTaskTypes('task.taskType', claimPartitions.unlimitedTypes),
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      RecognizedTask
    );
    const queryUnlimitedTasks = matchesClauses(
      queryForUnlimitedTasks,
      filterDownBy(InactiveTasks),
      partitions.length ? tasksWithPartitions(partitions) : undefined
    );
    searches.push({ query: queryUnlimitedTasks, sort, size, seq_no_primary_term: true });
  }

  for (const [types, capacity] of claimPartitions.limitedTypes) {
    const queryForLimitedTasks = mustBeAllOf(
      EnabledTask,
      OneOfTaskTypes('task.taskType', types.split(',')),
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
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
    });
  }

  return store.msearch(searches);
}

interface ClaimPartitions {
  unlimitedTypes: string[];
  limitedTypes: Map<string, number>;
}

interface BuildClaimPartitionsOpts {
  types: Set<string>;
  excludedTaskTypes: Set<string>;
  getCapacity: (taskType?: string) => number;
  definitions: CoordinatorDefinitionsRegistry;
}

function buildClaimPartitions(opts: BuildClaimPartitionsOpts): ClaimPartitions {
  const result: ClaimPartitions = { unlimitedTypes: [], limitedTypes: new Map() };
  const { types, excludedTaskTypes, getCapacity, definitions } = opts;
  for (const type of types) {
    const definition = definitions.get(type);
    if (definition == null) continue;
    if (excludedTaskTypes.has(type)) continue;
    if (definition.maxConcurrency == null) {
      result.unlimitedTypes.push(definition.type);
      continue;
    }

    const isSharingConcurrency = sharedConcurrencyTaskTypes(type);
    if (isSharingConcurrency) {
      let minCapacity = null;
      for (const sharedType of isSharingConcurrency) {
        const def = definitions.get(sharedType);
        if (def) {
          const capacity = getCapacity(def.type) / def.cost;
          if (minCapacity == null || capacity < minCapacity) minCapacity = capacity;
        }
      }
      if (minCapacity) result.limitedTypes.set(isSharingConcurrency.join(','), minCapacity);
    } else {
      const capacity = getCapacity(definition.type) / definition.cost;
      if (capacity !== 0) result.limitedTypes.set(definition.type, capacity);
    }
  }
  return result;
}

/* --------------- limited-concurrency selection (fork of selectTasksByCapacity) --------------- */

function selectTasksByCapacity(
  definitions: CoordinatorDefinitionsRegistry,
  tasks: TaskClaimCandidate[],
  getCapacity: (taskType?: string) => number
): TaskClaimCandidate[] {
  const limitedMap = new Map<string, number | null>();
  for (const def of definitions.getAllDefinitions()) {
    if (def.maxConcurrency != null) {
      limitedMap.set(def.type, def.maxConcurrency);
    }
  }

  const result: TaskClaimCandidate[] = [];
  for (const task of tasks) {
    const concurrency = limitedMap.get(task.taskType);
    if (concurrency == null) {
      result.push(task);
      continue;
    }
    if (concurrency > 0) {
      result.push(task);
      const sharesConcurrencyWith = sharedConcurrencyTaskTypes(task.taskType);
      if (sharesConcurrencyWith) {
        for (const taskType of sharesConcurrencyWith) {
          if (limitedMap.has(taskType)) limitedMap.set(taskType, concurrency - 1);
        }
      } else {
        limitedMap.set(task.taskType, concurrency - 1);
      }
    }
  }
  return result;
}

/* --------------------- claim-time retryAt (fork of lib/get_retry_at.ts) --------------------- */

type RetryFields = Pick<TaskClaimCandidate, 'schedule' | 'timeoutOverride' | 'attempts'>;

function getClaimRetryAt(
  task: RetryFields,
  def: SerializedTaskTypeDefinition | undefined
): Date | undefined {
  const taskTimeout = getTimeout(task, def);
  const timeout = parseIntervalAsSecond(taskTimeout) > 300 ? DEFAULT_TIMEOUT : taskTimeout;

  if (task.schedule) {
    return maxIntervalFromDate(new Date(), task.schedule.interval, timeout);
  }

  // Original: getRetryDate with a fake 'Task timeout' error; isRetryableError on a
  // plain Error is null -> retry=true -> delay-based date. Inlined here.
  const result = new Date(Date.now() + calculateDelayBasedOnAttempts(task.attempts + 1));
  return intervalFromDate(result, timeout);
}

function calculateDelayBasedOnAttempts(attempts: number) {
  if (attempts === 1) return 30 * 1000;
  const defaultBackoffPerFailure = 5 * 60 * 1000;
  const maxDelay = 60 * 60 * 1000;
  return random(Math.min(maxDelay, defaultBackoffPerFailure * Math.pow(2, attempts - 2)));
}

function getTimeout(
  task: Pick<RetryFields, 'schedule' | 'timeoutOverride'>,
  def: { timeout?: string } | undefined
): string {
  if (task.schedule) return def?.timeout ?? DEFAULT_TIMEOUT;
  return task.timeoutOverride ? task.timeoutOverride : def?.timeout ?? DEFAULT_TIMEOUT;
}
