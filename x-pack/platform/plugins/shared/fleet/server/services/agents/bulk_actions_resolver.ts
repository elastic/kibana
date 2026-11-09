/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsErrorHelpers, type SavedObjectsClientContract } from '@kbn/core/server';
import { withTimeout } from '@kbn/std';
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import moment from 'moment';

import { appContextService } from '../app_context';
import { AGENT_ACTIONS_INDEX } from '../../../common/constants';
import { retryTransientEsErrors } from '../epm/elasticsearch/retry';

import { ReassignActionRunner } from './reassign_action_runner';
import { UpgradeActionRunner } from './upgrade_action_runner';
import { UpdateAgentTagsActionRunner } from './update_agent_tags_action_runner';
import { UnenrollActionRunner } from './unenroll_action_runner';
import type { ActionParams } from './action_runner';
import { RequestDiagnosticsActionRunner } from './request_diagnostics_action_runner';
import type { BulkActionCheckTaskState, RetryParams } from './retry_helper';
import {
  CHECK_TASK_INTERVAL_MINUTES,
  MAX_CHECK_TASK_RESUMES,
  MAX_CHECK_TASK_RUNS,
  getRetryParams,
} from './retry_helper';
import { BulkActionTaskType } from './bulk_action_types';
import { MigrateActionRunner } from './migrate_action_runner';
import { ChangePrivilegeActionRunner } from './change_privilege_runner';
import { RollbackActionRunner } from './rollback_action_runner';
import { RestartActionRunner } from './restart_action_runner';

/** Suffix appended to the task type to build a check task's id: `<taskType>:check:<actionId>`. */
export const CHECK_TASK_TYPE_SUFFIX = ':check';
const CHECK_TASK_ID_MARKER = `${CHECK_TASK_TYPE_SUFFIX}:`;

/**
 * A check task scheduled before this was introduced has no `isCheckTask` param. `ensureScheduled`
 * routes an id that already exists to `updateScheduleOfExistingTask`, which only updates the
 * schedule (and only for an Idle task), never the params, so such a task would otherwise keep
 * taking the ordinary retry branch forever. Fall back to its id.
 */
export const isCheckTaskInstance = (taskInstance: ConcreteTaskInstance): boolean =>
  (taskInstance.params as BulkActionTaskParams)?.isCheckTask === true ||
  taskInstance.id.includes(CHECK_TASK_ID_MARKER);

export interface BulkActionTaskParams {
  actionParams: ActionParams;
  retryParams: RetryParams;
  isCheckTask?: boolean;
}

/**
 * What the check task hands back to Task Manager. `shouldDeleteTask` is how a task asks to be
 * removed (see `SuccessfulRunResult` in task_manager/server/task.ts).
 */
interface CheckTaskRunResult {
  state: BulkActionCheckTaskState;
  schedule?: IntervalSchedule;
  shouldDeleteTask?: boolean;
}

type DoRetry = (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  actionParams: ActionParams,
  retryParams: RetryParams
) => Promise<{ actionId: string }>;

/**
 * Create and run retry tasks of agent bulk actions
 */
export class BulkActionsResolver {
  private taskManager?: TaskManagerStartContract;

  createTaskRunner(core: CoreSetup, taskType: BulkActionTaskType) {
    return ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
      const getDeps = async () => {
        const [coreStart] = await core.getStartServices();
        return {
          esClient: coreStart.elasticsearch.client.asInternalUser,
          soClient: appContextService.getInternalUserSOClientWithoutSpaceExtension(),
        };
      };

      const runnerMap = {
        [BulkActionTaskType.UNENROLL_RETRY]: UnenrollActionRunner,
        [BulkActionTaskType.REASSIGN_RETRY]: ReassignActionRunner,
        [BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY]: UpdateAgentTagsActionRunner,
        [BulkActionTaskType.UPGRADE_RETRY]: UpgradeActionRunner,
        [BulkActionTaskType.REQUEST_DIAGNOSTICS_RETRY]: RequestDiagnosticsActionRunner,
        [BulkActionTaskType.MIGRATE_RETRY]: MigrateActionRunner,
        [BulkActionTaskType.PRIVILEGE_LEVEL_CHANGE_RETRY]: ChangePrivilegeActionRunner,
        [BulkActionTaskType.ROLLBACK_RETRY]: RollbackActionRunner,
        [BulkActionTaskType.RESTART_RETRY]: RestartActionRunner,
      };

      return createRetryTask(
        taskInstance,
        getDeps,
        async (
          esClient: ElasticsearchClient,
          soClient: SavedObjectsClientContract,
          actionParams: ActionParams,
          retryParams: RetryParams
        ) =>
          await new runnerMap[taskType](
            esClient,
            soClient,
            actionParams,
            retryParams
          ).runActionAsyncWithRetry()
      );
    };
  }

  constructor(taskManager: TaskManagerSetupContract, core: CoreSetup) {
    const definitions = Object.values(BulkActionTaskType)
      .map((type) => {
        return [
          type,
          {
            title: 'Bulk Action Retry',
            timeout: '1m',
            maxAttempts: 1,
            createTaskRunner: this.createTaskRunner(core, type),
          },
        ];
      })
      .reduce((acc, current) => {
        acc[current[0] as string] = current[1];
        return acc;
      }, {} as any);
    taskManager.registerTaskDefinitions(definitions);
  }

  public async start(taskManager: TaskManagerStartContract) {
    this.taskManager = taskManager;
  }

  public getTaskId(actionId: string, type: string) {
    return `${type}:${actionId}`;
  }

  public getCheckTaskId(actionId: string, type: string) {
    return this.getTaskId(actionId, `${type}${CHECK_TASK_TYPE_SUFFIX}`);
  }

  public async run(
    actionParams: ActionParams,
    retryParams: RetryParams,
    taskType: string,
    taskId: string,
    options: {
      runAt?: Date;
      schedule?: IntervalSchedule;
      isCheckTask?: boolean;
      maxRetryAttempts?: number;
    } = {}
  ) {
    const logger = appContextService.getLogger();
    if (!this.taskManager) {
      logger.warn(`Task manager is not available, cannot schedule task ${taskId}`);
      return taskId;
    }
    const { runAt, schedule, isCheckTask, maxRetryAttempts } = options;
    const params: BulkActionTaskParams = {
      actionParams,
      retryParams,
      ...(isCheckTask ? { isCheckTask: true } : {}),
    };

    await retryTransientEsErrors(
      () =>
        this.taskManager!.ensureScheduled({
          id: taskId,
          taskType,
          scope: ['fleet'],
          state: {},
          params,
          ...(schedule ? { schedule } : {}),
          runAt: runAt ?? moment(new Date()).add(3, 's').toDate(),
        }),
      { logger, maxAttempts: maxRetryAttempts }
    );
    logger.info('Scheduling task ' + taskId);
    return taskId;
  }

  /**
   * `maxRetryAttempts` caps the backoff, for a caller with less time than the default budget takes
   * — the default sleeps 2+4+8+16+32s, longer than a check task's 1m timeout.
   */
  public async removeIfExists(taskId: string, options: { maxRetryAttempts?: number } = {}) {
    const logger = appContextService.getLogger();
    if (!this.taskManager) {
      return;
    }
    logger.info('Removing task ' + taskId);
    await retryTransientEsErrors(() => this.taskManager!.removeIfExists(taskId), {
      logger,
      maxAttempts: options.maxRetryAttempts,
    });
  }

  /**
   * Persist the latest batch checkpoint into the check task's state, so a resumed runner can
   * continue from there. Unlike the previous remove-and-recreate approach this is a single
   * update and never leaves the action without a check task.
   */
  public async updateCheckTaskState(
    taskId: string,
    checkpoint: Partial<
      Pick<
        BulkActionCheckTaskState,
        'searchAfter' | 'pitId' | 'nbAgentsProcessed' | 'retryCount' | 'stoppedAt'
      >
    >
  ) {
    const logger = appContextService.getLogger();
    if (!this.taskManager) {
      return;
    }
    const result = await retryTransientEsErrors(
      () =>
        this.taskManager!.bulkUpdateState([taskId], (state) => {
          const nextState: BulkActionCheckTaskState = {
            ...state,
            ...checkpoint,
            checkpointUpdatedAt: new Date().toISOString(),
          };
          return nextState;
        }),
      { logger }
    );

    // bulkUpdateState resolves even when the update failed for the task: a missing task, or a
    // conflict still failing after its own retries, comes back in `errors`.
    const [firstError] = result?.errors ?? [];
    if (firstError) {
      throw new Error(
        `Could not update the state of task ${taskId}: ${
          firstError.error.message ?? firstError.error
        }`
      );
    }
  }

  /**
   * Read a check task's current state, or undefined when there is no such task.
   *
   * Only a missing task is swallowed. Any other failure is thrown, because the caller uses this to
   * decide whether a runner is alive: a transient read failure read as "no state" looks exactly
   * like a runner that has stopped heartbeating, and would earn a live runner a second runner
   * alongside it. Failing the check task's run instead costs one interval and nothing else.
   */
  public async getCheckTaskState(taskId: string): Promise<BulkActionCheckTaskState | undefined> {
    if (!this.taskManager) {
      return undefined;
    }
    try {
      const task = await this.taskManager.get(taskId);
      return task?.state as BulkActionCheckTaskState | undefined;
    } catch (error) {
      if (!isTaskNotFoundError(error)) {
        throw error;
      }
      appContextService.getLogger().debug(`There is no task ${taskId} to read the state of`);
      return undefined;
    }
  }

  /**
   * A task document's status, or undefined when there is none. Used by the check task to tell a
   * retry that is still going to run from one that is only taking up its id: `ensureScheduled` is
   * a no-op on an id that already exists, so a task left behind in a terminal status has to be
   * removed before a resume can be scheduled under it.
   *
   * As with `getCheckTaskState`, only a missing task is swallowed: a read failure taken as "no
   * retry task" would let the watchdog resume an action whose retry is already queued.
   */
  public async getTaskStatus(taskId: string): Promise<TaskStatus | undefined> {
    if (!this.taskManager) {
      return undefined;
    }
    try {
      return (await this.taskManager.get(taskId))?.status;
    } catch (error) {
      if (!isTaskNotFoundError(error)) {
        throw error;
      }
      return undefined;
    }
  }
}

/**
 * How long a failed check task run will wait to re-read its state before giving up on it. Small
 * against the task's 1m timeout, since the run has already spent part of that.
 */
const FAILED_RUN_STATE_READ_TIMEOUT_MS = 5_000;

/** A task that does not exist comes back as a 404 from the saved objects client. */
const isTaskNotFoundError = (error: Error & { statusCode?: number }): boolean =>
  SavedObjectsErrorHelpers.isNotFoundError(error) || error.statusCode === 404;

/**
 * Statuses that mean a scheduled task is still going to run. These task types are registered with
 * `maxAttempts: 1`, so a retry task whose run threw or expired is left `Failed` and will never
 * run again; treating that as queued would stop the watchdog resuming the action while also never
 * incrementing `resumeCount`, so nothing would ever bound it.
 */
const PENDING_TASK_STATUSES: readonly TaskStatus[] = [
  TaskStatus.Idle,
  TaskStatus.Claiming,
  TaskStatus.Running,
];

/**
 * Liveness probe against `.fleet-actions`: whether a document for this action was written within
 * the given window. Only ever used as a positive signal that a runner is alive, never to conclude
 * that an action is finished — runners do not all write exactly one document per batch, and
 * rollback writes its documents under its own action ids rather than the runner's.
 *
 * A runner on this code heartbeats the checkpoint, which is a stronger and cheaper signal, so
 * this is now mainly here for a check task created before the heartbeat existed: its runner
 * writes nothing between batches, and an action document is the only sign it is still alive.
 */
const hasRecentActionDoc = async (
  esClient: ElasticsearchClient,
  actionId: string,
  recentWindowMinutes: number
): Promise<boolean> => {
  const res = await esClient.search({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    // one hit is enough to know a runner is alive
    size: 1,
    _source: false,
    track_total_hits: false,
    terminate_after: 1,
    query: {
      bool: {
        must: [
          { term: { action_id: actionId } },
          { range: { '@timestamp': { gte: `now-${recentWindowMinutes}m` } } },
        ],
      },
    },
  });

  return (res.hits.hits?.length ?? 0) > 0;
};

/**
 * Handler for the recurring check task that watches a bulk action runner. It only restarts the
 * runner when nothing has written to the checkpoint since the previous run, so a slow-but-alive
 * runner — which heartbeats the checkpoint while a batch is in flight — never ends up with a
 * second runner alongside it.
 */
const runCheckTask = async (
  taskInstance: ConcreteTaskInstance,
  esClient: ElasticsearchClient
): Promise<CheckTaskRunResult> => {
  const logger = appContextService.getLogger();
  const state: BulkActionCheckTaskState = taskInstance.state ?? {};
  const { actionParams } = taskInstance.params as BulkActionTaskParams;
  const actionId = actionParams.actionId!;

  const resolver = await appContextService.getBulkActionsResolver();

  // Task Manager deletes a task that asks for it, rather than the task deleting itself and then
  // writing to a document that no longer exists: a recurring task's own update is not 404 aware,
  // so self-removal would make every completed action log a task failure.
  const deleteSelf = (): CheckTaskRunResult => ({ state, shouldDeleteTask: true });

  /**
   * Task Manager writes the state returned here over the current task document, and its version
   * conflict resolution also prefers the returned state, so a checkpoint the runner writes
   * between the read this builds on and that write is lost. The base state is therefore the
   * freshest read this run has made — on the paths that re-read the document, the one taken after
   * every other round trip — and the resume is handed to a separate task rather than started here
   * so that the window normally has no writer in it at all. A checkpoint lost this way costs one
   * re-read batch on the next resume, which processBatch deduplicates and still counts.
   *
   * The schedule is returned on every path so that a check task created before this was a
   * recurring task is adopted into the recurring cadence. Such a task is Running while it is
   * handled here, and bulkUpdateSchedules only updates Idle tasks, so `ensureScheduled` from the
   * resumed runner cannot do it.
   */
  const runCount = (state.runCount ?? 0) + 1;
  const withWatcherFields = (
    fields: Partial<BulkActionCheckTaskState>,
    baseState: BulkActionCheckTaskState = state
  ): CheckTaskRunResult => ({
    state: {
      ...baseState,
      runCount,
      ...fields,
    },
    schedule: { interval: `${CHECK_TASK_INTERVAL_MINUTES}m` },
  });

  // The runner removes this task when it finishes, but that removal can itself fail, so the check
  // task also stops itself once the checkpoint says every agent was processed. This uses the
  // runner's own count rather than counting action documents: runners do not all write one
  // document per batch, and rollback writes none under this action id.
  const { total } = actionParams;
  if (total !== undefined && (state.nbAgentsProcessed ?? 0) >= total) {
    logger.debug(
      `Bulk action ${actionId} is complete (${state.nbAgentsProcessed}/${total} agents), removing check task ${taskInstance.id}`
    );
    return deleteSelf();
  }

  // A runner that has spent its whole retry budget records this before removing the tasks, and
  // removing them can fail. Resuming here would hand the action another MAX_RETRY_COUNT attempts
  // under a fresh `retryCount: 1`, which is the opposite of what that runner decided.
  if (state.stoppedAt) {
    logger.debug(
      `Bulk action ${actionId} gave up at ${state.stoppedAt}, removing check task ${taskInstance.id}`
    );
    return deleteSelf();
  }

  // Unconditional ceiling, checked before anything that could make this run look alive. Every
  // other limit here only bounds a path that resumes, and a runner wedged inside `processAgents`
  // keeps heartbeating, so it is read as alive forever and never reaches one. Without this the
  // watchdog would outlive the action for as long as Kibana runs.
  if (runCount > MAX_CHECK_TASK_RUNS) {
    logger.warn(
      `Bulk action ${actionId} has not completed after ${MAX_CHECK_TASK_RUNS} check task runs (${
        state.nbAgentsProcessed ?? 0
      }/${total} agents), removing check task ${taskInstance.id} and giving up on it`
    );
    return deleteSelf();
  }

  if (!resolver) {
    // The claimed state is the only one available here — reading the current one needs the resolver
    // that is missing — so this run can roll a checkpoint back. It only happens when the plugin's
    // context is not started, in which case no runner is checkpointing either.
    logger.warn(`Cannot resume bulk action ${actionId}, the bulk actions resolver is unavailable`);
    return withWatcherFields({});
  }

  const hasRecentBatch = await hasRecentActionDoc(esClient, actionId, CHECK_TASK_INTERVAL_MINUTES);
  const retryTaskId = resolver.getTaskId(actionId, taskInstance.taskType);
  const retryTaskStatus = await resolver.getTaskStatus(retryTaskId);
  const hasPendingRetryTask = !!retryTaskStatus && PENDING_TASK_STATUSES.includes(retryTaskStatus);

  // Read the state last, after every other round trip, rather than deciding on the state claimed
  // at the start of this run. A live runner heartbeats every RUNNER_HEARTBEAT_INTERVAL_MINUTES,
  // and a heartbeat landing during one of those reads would otherwise be missed and earn it a
  // second runner. A heartbeat landing after this read still cannot stop the scheduling below;
  // closing that last window needs a conditional claim on the task document, which Task Manager's
  // state API does not offer. What survives it is one duplicated boundary batch, which
  // `processBatch` deduplicates per agent.
  const freshState = (await resolver.getCheckTaskState(taskInstance.id)) ?? state;
  const { checkpointUpdatedAt } = freshState;
  const checkpointMoved =
    !!checkpointUpdatedAt && checkpointUpdatedAt !== state.lastObservedCheckpointAt;

  if (checkpointMoved || hasRecentBatch) {
    logger.debug(`Bulk action ${actionId} is still alive, not resuming`);
    return withWatcherFields({ lastObservedCheckpointAt: checkpointUpdatedAt }, freshState);
  }

  // Re-check completion against the fresh state: the runner may have finished during the reads
  // above, and its own removal of this task races with the return value below.
  if (total !== undefined && (freshState.nbAgentsProcessed ?? 0) >= total) {
    logger.debug(
      `Bulk action ${actionId} is complete (${freshState.nbAgentsProcessed}/${total} agents), removing check task ${taskInstance.id}`
    );
    return deleteSelf();
  }

  // A retry task that is still going to run will restart the action by itself, and
  // `ensureScheduled` would be a no-op on its id, so resuming into it would log a resume and
  // spend an attempt without scheduling anything.
  if (hasPendingRetryTask) {
    logger.debug(
      `Bulk action ${actionId} already has a retry task queued as ${retryTaskId} (${retryTaskStatus}), not resuming`
    );
    return withWatcherFields({ lastObservedCheckpointAt: checkpointUpdatedAt }, freshState);
  }

  const resumeCount = (freshState.resumeCount ?? 0) + 1;
  if (resumeCount > MAX_CHECK_TASK_RESUMES) {
    logger.warn(
      `Bulk action ${actionId} stalled after ${MAX_CHECK_TASK_RESUMES} resume attempts, giving up and removing check task ${taskInstance.id}`
    );
    return deleteSelf();
  }

  logger.info(
    `Bulk action ${actionId} made no progress in the last ${CHECK_TASK_INTERVAL_MINUTES}m, resuming (attempt ${resumeCount}) from batch ${freshState.searchAfter}`
  );

  // A checkpoint the runner has written supersedes the one in the task's params, including when
  // it has been cleared: a 400 restart clears the cursor deliberately, and falling back to the
  // params would hand the rejected cursor straight back. `checkpointUpdatedAt` is what tells the
  // two apart — only a check task created before the checkpoint moved into task state still has
  // a checkpoint in its params worth reading.
  //
  // getRetryParams is applied last so action types that must restart from scratch (update tags,
  // whose kuery excludes already-tagged agents) still have the checkpoint stripped.
  const params = taskInstance.params as BulkActionTaskParams;
  const checkpoint: Pick<
    RetryParams,
    'searchAfter' | 'nbAgentsProcessed' | 'pitId' | 'retryCount'
  > = checkpointUpdatedAt
    ? {
        searchAfter: freshState.searchAfter,
        nbAgentsProcessed: freshState.nbAgentsProcessed,
        // Continues the action's retry budget rather than restarting it: an action that has
        // already spent its attempts must not be handed another MAX_RETRY_COUNT just because the
        // runner that spent them could not remove this task.
        retryCount: freshState.retryCount,
        // The point in time is taken from the checkpoint, not from the params: Elasticsearch
        // may hand back a new id on any search, and only the latest one is guaranteed to be
        // valid. It is kept rather than cleared because a stall shorter than its keep alive
        // leaves it usable, and if it has expired the search 404s and that handler clears it so
        // the next run opens a fresh one.
        pitId: freshState.pitId,
      }
    : {
        searchAfter: params.retryParams?.searchAfter,
        nbAgentsProcessed: params.retryParams?.nbAgentsProcessed,
        retryCount: params.retryParams?.retryCount,
        pitId: params.retryParams?.pitId,
      };
  const retryParams = getRetryParams(taskInstance.taskType, {
    ...params.retryParams,
    ...checkpoint,
  });

  // The runner is started by its own retry task rather than detached from this one. It outlives
  // this task's timeout either way, but running it elsewhere keeps it from writing a checkpoint
  // while Task Manager is persisting the state returned below, and gives the resume the same
  // scheduling and failure handling as an ordinary retry.
  try {
    // A retry task left behind in a terminal status (Failed, after its single attempt threw or
    // expired) still owns its id, and `ensureScheduled` would silently do nothing. Clear it first
    // so the resume below actually creates a task.
    if (retryTaskStatus) {
      logger.debug(
        `Removing the ${retryTaskStatus} retry task ${retryTaskId} of bulk action ${actionId} before resuming it`
      );
      // Capped for the same reason as the scheduling below, and more urgently: the default backoff
      // sleeps past this task's 1m timeout, and an expired run has its return value discarded —
      // including, for a check task created before this one was recurring, the schedule that
      // adopts it. The watchdog would then be removed as a finished one-shot task.
      await resolver.removeIfExists(retryTaskId, { maxRetryAttempts: 0 });
    }
    await resolver.run(
      actionParams,
      { ...retryParams, retryCount: checkpoint.retryCount ?? 1, taskId: retryTaskId },
      taskInstance.taskType,
      retryTaskId,
      // Scheduling must not retry on its own backoff here. This task is itself the retry loop, so
      // a transient failure costs one interval, while the default backoff sleeps longer than the
      // 1m task timeout. An expired run is worse than a late one: `shouldUpdateExpiredTask` in
      // Task Manager reads the schedule off the stored document, so a check task created before
      // this was recurring would have the schedule returned below discarded and be removed as a
      // finished one-shot task, leaving the action unwatched.
      { maxRetryAttempts: 0 }
    );
  } catch (error) {
    // The attempt is counted either way, so an action whose resume keeps failing to schedule
    // trips MAX_CHECK_TASK_RESUMES instead of being watched forever.
    logger.error(
      `Could not schedule the resume of bulk action ${actionId} (attempt ${resumeCount}): ${error.message}`,
      { error }
    );
  }

  return withWatcherFields(
    {
      resumeCount,
      lastObservedCheckpointAt: checkpointUpdatedAt,
    },
    freshState
  );
};

/**
 * The state a failed check task run hands back.
 *
 * Task Manager replaces the stored state with whatever `run()` returns — on the error path too,
 * where it reuses the state as of the claim — so returning the state this run claimed would roll
 * the cursor, the point in time, the count and the child action ids back to where they stood when
 * the check task woke up, discarding every checkpoint the runner has written since. A run that
 * failed has by definition observed nothing worth recording, so it reads the current state back and
 * adds only its own `runCount` to it.
 *
 * When even that read fails — likely, when the read is what failed in the first place — the claimed
 * state is all there is, and Task Manager offers no way to leave the field alone.
 *
 * It is given a deadline of its own rather than the Elasticsearch request timeout. The run that
 * brought us here has already spent part of this task's 1m budget, often waiting on Elasticsearch,
 * and a run that expires has its whole return value discarded: the `runCount` this is here to
 * advance, and the schedule that adopts a check task created before this one was recurring. A
 * stale state costs one replayed stretch of an action; an expired run costs the watchdog.
 */
const getStateForFailedCheckTaskRun = async (
  taskInstance: ConcreteTaskInstance
): Promise<BulkActionCheckTaskState> => {
  const claimedState: BulkActionCheckTaskState = taskInstance.state ?? {};
  const logger = appContextService.getLogger();
  let currentState = claimedState;
  try {
    const resolver = await appContextService.getBulkActionsResolver();
    const read = await withTimeout({
      promise: Promise.resolve(resolver?.getCheckTaskState(taskInstance.id)),
      timeoutMs: FAILED_RUN_STATE_READ_TIMEOUT_MS,
      unref: true,
    });
    if (read.timedout) {
      logger.warn(
        `Timed out reading the state of check task ${taskInstance.id} after a failed run, falling back to the one it claimed`
      );
    } else {
      currentState = read.value ?? claimedState;
    }
  } catch (error) {
    logger.warn(
      `Could not read the state of check task ${taskInstance.id} after a failed run, falling back to the one it claimed: ${error.message}`
    );
  }
  return { ...currentState, runCount: (currentState.runCount ?? 0) + 1 };
};

export function createRetryTask(
  taskInstance: ConcreteTaskInstance,
  getDeps: () => Promise<{ esClient: ElasticsearchClient; soClient: SavedObjectsClientContract }>,
  doRetry: DoRetry
) {
  return {
    async run() {
      const logger = appContextService.getLogger();
      const { esClient, soClient } = await getDeps();

      if (isCheckTaskInstance(taskInstance)) {
        try {
          return await runCheckTask(taskInstance, esClient);
        } catch (error) {
          // Never throw out of a recurring task: Task Manager would mark it failed and we would
          // lose the only thing watching this action. The schedule is returned here too, so a
          // legacy one-shot check task is not deleted as finished after a failed run.
          logger.error(`Bulk action check task ${taskInstance.id} failed: ${error.message}`, {
            error,
          });
          return {
            // The run still counts towards MAX_CHECK_TASK_RUNS, or a check task whose every run
            // throws would never reach the ceiling that is meant to be unconditional.
            state: await getStateForFailedCheckTaskRun(taskInstance),
            schedule: { interval: `${CHECK_TASK_INTERVAL_MINUTES}m` },
          };
        }
      }

      logger.info('Running bulk action retry task');

      const retryParams: RetryParams = getRetryParams(
        taskInstance.taskType,
        taskInstance.params.retryParams
      );
      logger.debug(
        retryParams.retryCount === 1
          ? `Running task ${taskInstance.id}`
          : `Retry #${retryParams.retryCount} of task ${taskInstance.id}`
      );

      if (retryParams.searchAfter) {
        logger.info('Continuing task from batch ' + retryParams.searchAfter);
      }

      // Intentionally not awaited: the runner outlives this task's 1m timeout. The catch is what
      // keeps a failure here from becoming an unhandled rejection.
      doRetry(esClient, soClient, taskInstance.params.actionParams, {
        ...retryParams,
        taskId: taskInstance.id,
      }).catch((error) => {
        logger.error(
          `Bulk action runner started by task ${taskInstance.id} failed: ${error.message}`,
          { error }
        );
      });

      logger.info('Completed bulk action retry task');
    },

    async cancel() {},
  };
}
