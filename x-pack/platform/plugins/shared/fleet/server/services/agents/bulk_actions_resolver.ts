/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type SavedObjectsClientContract } from '@kbn/core/server';
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
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
 * updates an existing task's schedule but not its params, so such a task would be adopted as a
 * recurring task and then keep taking the ordinary retry branch forever. Fall back to its id.
 */
export const isCheckTaskInstance = (taskInstance: ConcreteTaskInstance): boolean =>
  (taskInstance.params as BulkActionTaskParams)?.isCheckTask === true ||
  taskInstance.id.includes(CHECK_TASK_ID_MARKER);

export interface BulkActionTaskParams {
  actionParams: ActionParams;
  retryParams: RetryParams;
  isCheckTask?: boolean;
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
    options: { runAt?: Date; schedule?: IntervalSchedule; isCheckTask?: boolean } = {}
  ) {
    const logger = appContextService.getLogger();
    if (!this.taskManager) {
      logger.warn(`Task manager is not available, cannot schedule task ${taskId}`);
      return taskId;
    }
    const { runAt, schedule, isCheckTask } = options;
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
      { logger }
    );
    logger.info('Scheduling task ' + taskId);
    return taskId;
  }

  public async removeIfExists(taskId: string) {
    const logger = appContextService.getLogger();
    if (!this.taskManager) {
      return;
    }
    logger.info('Removing task ' + taskId);
    await retryTransientEsErrors(() => this.taskManager!.removeIfExists(taskId), { logger });
  }

  /**
   * Persist the latest batch checkpoint into the check task's state, so a resumed runner can
   * continue from there. Unlike the previous remove-and-recreate approach this is a single
   * update and never leaves the action without a check task.
   */
  public async updateCheckTaskState(
    taskId: string,
    checkpoint: Pick<BulkActionCheckTaskState, 'searchAfter' | 'nbAgentsProcessed'>
  ) {
    const logger = appContextService.getLogger();
    if (!this.taskManager) {
      return;
    }
    const result = await retryTransientEsErrors(
      () =>
        this.taskManager!.bulkUpdateState([taskId], (state) => ({
          ...state,
          ...checkpoint,
          checkpointUpdatedAt: new Date().toISOString(),
        })),
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
   * Read a check task's current state. Used to merge watcher metadata onto the freshest
   * checkpoint rather than onto the one claimed at the start of the run.
   */
  public async getCheckTaskState(taskId: string): Promise<BulkActionCheckTaskState | undefined> {
    if (!this.taskManager) {
      return undefined;
    }
    try {
      const task = await this.taskManager.get(taskId);
      return task?.state as BulkActionCheckTaskState | undefined;
    } catch (error) {
      appContextService
        .getLogger()
        .debug(`Could not read the state of task ${taskId}: ${error.message}`);
      return undefined;
    }
  }
}

/**
 * Liveness probe against `.fleet-actions`: whether a document for this action was written within
 * the given window. Only ever used as a positive signal that a runner is alive, never to conclude
 * that an action is finished — runners do not all write exactly one document per batch, and
 * rollback writes its documents under its own action ids rather than the runner's.
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
 * runner when the action has made no progress since the previous run, so a slow-but-alive runner
 * never ends up with a second runner alongside it.
 */
const runCheckTask = async (
  taskInstance: ConcreteTaskInstance,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  doRetry: DoRetry
): Promise<{ state: BulkActionCheckTaskState }> => {
  const logger = appContextService.getLogger();
  const state: BulkActionCheckTaskState = taskInstance.state ?? {};
  const { actionParams } = taskInstance.params as BulkActionTaskParams;
  const actionId = actionParams.actionId!;

  const resolver = await appContextService.getBulkActionsResolver();
  const removeSelf = async () => {
    await resolver?.removeIfExists(taskInstance.id);
  };

  /**
   * Task Manager writes the state returned here over the current task document, so echoing back
   * the state claimed at the start of the run would rewind a checkpoint the live runner wrote in
   * the meantime. Merge the watcher's own fields onto the freshest state instead.
   */
  const withWatcherFields = async (
    fields: Partial<BulkActionCheckTaskState>
  ): Promise<{ state: BulkActionCheckTaskState }> => ({
    state: { ...((await resolver?.getCheckTaskState(taskInstance.id)) ?? state), ...fields },
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
    await removeSelf();
    return { state };
  }

  const checkpointMoved =
    !!state.checkpointUpdatedAt && state.checkpointUpdatedAt !== state.lastObservedCheckpointAt;
  const hasRecentBatch = await hasRecentActionDoc(esClient, actionId, CHECK_TASK_INTERVAL_MINUTES);

  if (checkpointMoved || hasRecentBatch) {
    logger.debug(`Bulk action ${actionId} is still progressing, not resuming`);
    return await withWatcherFields({ lastObservedCheckpointAt: state.checkpointUpdatedAt });
  }

  const resumeCount = (state.resumeCount ?? 0) + 1;
  if (resumeCount > MAX_CHECK_TASK_RESUMES) {
    logger.warn(
      `Bulk action ${actionId} stalled after ${MAX_CHECK_TASK_RESUMES} resume attempts, giving up and removing check task ${taskInstance.id}`
    );
    await removeSelf();
    return { state };
  }

  logger.info(
    `Bulk action ${actionId} made no progress in the last ${CHECK_TASK_INTERVAL_MINUTES}m, resuming (attempt ${resumeCount}) from batch ${state.searchAfter}`
  );

  // getRetryParams is applied last so action types that must restart from scratch (update tags,
  // whose kuery excludes already-tagged agents) still have the checkpoint stripped.
  const retryParams = getRetryParams(taskInstance.taskType, {
    ...(taskInstance.params as BulkActionTaskParams).retryParams,
    searchAfter: state.searchAfter,
    // The params still carry the point in time the API handler opened when the action started.
    // We only get here after at least one interval without progress, and getAgentsByKuery renews
    // the PIT with a 1m keep alive, so it is long expired and searching with it would 404.
    // searchAfter alone pages the live index.
    pitId: undefined,
  });

  // Intentionally not awaited: the runner outlives this task's 1m timeout. The catch is what
  // keeps a failure here from becoming an unhandled rejection.
  doRetry(esClient, soClient, actionParams, {
    ...retryParams,
    retryCount: 1,
    taskId: taskInstance.id,
  }).catch((error) => {
    logger.error(
      `Resuming bulk action ${actionId} from check task ${taskInstance.id} failed: ${error.message}`,
      { error }
    );
  });

  return await withWatcherFields({
    resumeCount,
    lastObservedCheckpointAt: state.checkpointUpdatedAt,
  });
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
          return await runCheckTask(taskInstance, esClient, soClient, doRetry);
        } catch (error) {
          // Never throw out of a recurring task: Task Manager would mark it failed and we would
          // lose the only thing watching this action.
          logger.error(`Bulk action check task ${taskInstance.id} failed: ${error.message}`, {
            error,
          });
          return { state: taskInstance.state ?? {} };
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
