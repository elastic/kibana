/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';

import { isResponseError } from '@kbn/es-errors';

import moment from 'moment';

import type { Agent } from '../../types';
import { appContextService } from '../app_context';
import { SO_SEARCH_LIMIT } from '../../../common/constants';
import { agentsKueryNamespaceFilter, buildFilterWithNamespace } from '../spaces/agent_namespaces';

import { getAgentActions } from './actions';
import { closePointInTime, getAgentsByKuery, openPointInTime } from './crud';
import type { BulkActionsResolver } from './bulk_actions_resolver';
import type { RetryParams } from './retry_helper';
import { CHECK_TASK_INTERVAL_MINUTES, getRetryParams, MAX_RETRY_COUNT } from './retry_helper';

/**
 * Keep alive for the point in time the runner pages with. Every search resets the point in time's
 * TTL to this value, so it has to comfortably exceed how long a single batch takes: the 1m default
 * in getAgentsByKuery expires it whenever a batch is slower than that, and the next search 404s.
 */
export const PIT_KEEP_ALIVE = '10m';

export interface ActionParams {
  kuery: string;
  showInactive?: boolean;
  batchSize?: number;
  total?: number;
  actionId?: string;
  spaceId?: string;
  // additional parameters specific to an action e.g. reassign to new policy id
  [key: string]: any;
}

export abstract class ActionRunner {
  protected esClient: ElasticsearchClient;
  protected soClient: SavedObjectsClientContract;

  protected actionParams: ActionParams;
  protected retryParams: RetryParams;

  private bulkActionsResolver?: BulkActionsResolver;
  private checkTaskId?: string;
  /** Agents processed across every run of this action, not just the current one. */
  private nbAgentsProcessed = 0;

  constructor(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    actionParams: ActionParams,
    retryParams: RetryParams
  ) {
    this.esClient = esClient;
    this.soClient = soClient;
    this.actionParams = { ...actionParams, actionId: actionParams.actionId ?? uuidv4() };
    this.retryParams = retryParams;
    this.nbAgentsProcessed = retryParams.nbAgentsProcessed ?? 0;
  }

  protected abstract getActionType(): string;

  protected abstract getTaskType(): string;

  protected abstract processAgents(agents: Agent[]): Promise<{ actionId: string }>;

  // first attempt to run bulk action async in a task, called from API handlers
  public async runActionAsyncTask(): Promise<{ actionId: string }> {
    appContextService
      .getLogger()
      .info(
        `Running action asynchronously, actionId: ${this.actionParams.actionId}${
          this.actionParams.total ? ', total agents:' + this.actionParams.total : ''
        }`
      );

    if (!this.bulkActionsResolver) {
      this.bulkActionsResolver = await appContextService.getBulkActionsResolver();
    }

    const taskId = this.bulkActionsResolver!.getTaskId(
      this.actionParams.actionId!,
      this.getTaskType()
    );
    await this.bulkActionsResolver!.run(
      this.actionParams,
      {
        ...this.retryParams,
        retryCount: (this.retryParams.retryCount ?? 0) + 1,
      },
      this.getTaskType(),
      taskId
    );
    return { actionId: this.actionParams.actionId! };
  }

  /**
   * Common runner logic accross all agent bulk actions
   * Starts action execution immeditalely, asynchronously
   * On errors, starts a task with Task Manager to retry max MAX_RETRY_COUNT times
   * If the last batch was stored in the check task's state, retry continues from there (searchAfter)
   */
  public async runActionAsyncWithRetry(): Promise<{ actionId: string }> {
    const logger = appContextService.getLogger();
    if (!this.bulkActionsResolver) {
      this.bulkActionsResolver = await appContextService.getBulkActionsResolver();
    }

    // Recurring task that watches this action, so it is resumed after a Kibana crash or after a
    // runner dies mid-flight. Failing to schedule it must not stop the action from running.
    try {
      this.checkTaskId = await this.ensureCheckResultTask();
    } catch (error) {
      logger.error(
        `Could not schedule the check task for action ${this.actionParams.actionId}, continuing without it: ${error.message}`,
        { error }
      );
    }

    await withSpan({ name: this.getActionType(), type: 'action' }, () =>
      this.processAgentsInBatches()
        .then(async () => {
          if (!this.checkTaskId) {
            return;
          }
          try {
            // no need for check task, action succeeded
            await this.bulkActionsResolver!.removeIfExists(this.checkTaskId);
          } catch (error) {
            // The action did succeed, so this must not be treated as a failure and retried.
            // The check task removes itself once it sees the action is complete.
            logger.warn(
              `Could not remove check task ${this.checkTaskId} after action ${this.actionParams.actionId} completed, it will remove itself: ${error.message}`
            );
          }
        })
        .catch(async (error) => {
          try {
            // A 404 here means the point in time opened when the action started has expired.
            // Retrying with the same pitId would 404 again every time until the retry budget is
            // spent, so drop it: searchAfter alone pages the live index.
            if (isResponseError(error) && error.statusCode === 404) {
              logger.error(
                `404 error from Elasticsearch during action ${this.actionParams.actionId}, retrying without the expired point in time: ${error.message}`
              );
              this.retryParams = { ...this.retryParams, pitId: undefined };
            }
            if (this.retryParams.retryCount) {
              logger.error(
                `Retry #${this.retryParams.retryCount} of task ${this.retryParams.taskId} failed: ${error.message}`
              );

              if (this.retryParams.retryCount >= MAX_RETRY_COUNT) {
                logger.warn(`Stopping after retry #${MAX_RETRY_COUNT}. Error: ${error.message}`);

                // clean up tasks after last retry reached
                await Promise.all(
                  [this.checkTaskId, this.retryParams.taskId]
                    .filter((taskId): taskId is string => !!taskId)
                    .map((taskId) => this.bulkActionsResolver!.removeIfExists(taskId))
                );

                return;
              }
            } else {
              logger.error(`Action failed: ${error.message}`);
            }
            const taskId = this.bulkActionsResolver!.getTaskId(
              this.actionParams.actionId!,
              this.getTaskType()
            );
            await this.bulkActionsResolver!.run(
              this.actionParams,
              {
                ...this.retryParams,
                retryCount: (this.retryParams.retryCount ?? 0) + 1,
                nbAgentsProcessed: this.nbAgentsProcessed,
              },
              this.getTaskType(),
              taskId
            );

            logger.info(`Retrying in task: ${taskId}`);
          } catch (schedulingError) {
            // Last line of defence: if we cannot even schedule the retry, the recurring check
            // task is what will pick the action back up.
            logger.error(
              `Could not schedule a retry for action ${this.actionParams.actionId} after "${error.message}": ${schedulingError.message}. The check task will resume it.`,
              { error: schedulingError }
            );
          }
        })
    );

    return { actionId: this.actionParams.actionId! };
  }

  /**
   * Schedule the recurring check task for this action, or leave the existing one in place.
   * It is recurring so that Task Manager owns the rescheduling: the runner only has to update
   * the checkpoint in its state, never remove and recreate it.
   */
  private async ensureCheckResultTask() {
    const taskId = this.bulkActionsResolver!.getCheckTaskId(
      this.actionParams.actionId!,
      this.getTaskType()
    );
    const retryParams: RetryParams = getRetryParams(this.getTaskType(), this.retryParams);

    return await this.bulkActionsResolver!.run(
      this.actionParams,
      {
        ...retryParams,
        retryCount: 1,
      },
      this.getTaskType(),
      taskId,
      {
        runAt: moment(new Date()).add(CHECK_TASK_INTERVAL_MINUTES, 'm').toDate(),
        schedule: { interval: `${CHECK_TASK_INTERVAL_MINUTES}m` },
        isCheckTask: true,
      }
    );
  }

  /**
   * Record the latest batch checkpoint on the check task so a resumed runner continues from it.
   * A failed checkpoint only costs re-processing one batch on resume, which processBatch already
   * guards against, so it must never abort the action.
   */
  private async updateCheckpoint() {
    if (!this.checkTaskId) {
      return;
    }
    try {
      await this.bulkActionsResolver!.updateCheckTaskState(this.checkTaskId, {
        searchAfter: this.retryParams.searchAfter,
        nbAgentsProcessed: this.nbAgentsProcessed,
      });
    } catch (error) {
      appContextService
        .getLogger()
        .warn(
          `Could not update the checkpoint on check task ${this.checkTaskId}: ${error.message}`
        );
    }
  }

  private async processBatch(agents: Agent[]): Promise<{ actionId: string; skipped?: boolean }> {
    if (this.retryParams.retryCount) {
      try {
        const actions = await getAgentActions(this.esClient, this.actionParams!.actionId!);

        for (const action of actions) {
          if (action.agents?.[0] === agents[0].id) {
            if (action.type !== 'UPDATE_TAGS') {
              appContextService
                .getLogger()
                .debug(
                  `skipping batch as there is already an action document present with last agent ids, actionId: ${this
                    .actionParams!.actionId!}`
                );
              return { actionId: this.actionParams.actionId!, skipped: true };
            }
          }
        }
      } catch (error) {
        appContextService.getLogger().debug(error.message); // if action not found, swallow
      }
    }

    return await this.processAgents(agents);
  }

  async processAgentsInBatches(): Promise<{ actionId: string }> {
    const start = Date.now();
    let pitId = this.retryParams.pitId;

    // A resumed run has had its expired point in time cleared. Open a fresh one rather than
    // paging without one: a checkpoint saved under a point in time carries Elasticsearch's
    // implicit `_shard_doc` tiebreaker, so it has one more value than the plain sort has
    // clauses, and a non-PIT search would reject it with a 400.
    if (!pitId) {
      pitId = await openPointInTime(this.esClient, PIT_KEEP_ALIVE);
      this.retryParams.pitId = pitId;
      appContextService
        .getLogger()
        .debug(`Opened a new point in time to resume action ${this.actionParams.actionId}`);
    }

    const perPage = this.actionParams.batchSize ?? SO_SEARCH_LIMIT;

    appContextService.getLogger().debug('kuery: ' + this.actionParams.kuery);

    const getAgents = async () => {
      const namespaceFilter = await agentsKueryNamespaceFilter(this.actionParams.spaceId);
      const kuery = buildFilterWithNamespace(namespaceFilter, this.actionParams.kuery);

      return getAgentsByKuery(this.esClient, this.soClient, {
        kuery,
        showAgentless: this.actionParams.showAgentless,
        showInactive: this.actionParams.showInactive ?? false,
        page: 1,
        perPage,
        pitId,
        pitKeepAlive: PIT_KEEP_ALIVE,
        searchAfter: this.retryParams.searchAfter,
      });
    };

    const res = await getAgents();
    if (res.pit) {
      pitId = res.pit;
      this.retryParams.pitId = pitId;
    }

    let currentAgents = res.agents;
    if (currentAgents.length === 0) {
      appContextService
        .getLogger()
        .debug('currentAgents returned 0 hits, returning from bulk action query');
      return { actionId: this.actionParams.actionId! }; // stop executing if there are no more results
    }

    const firstBatch = await this.processBatch(currentAgents);
    let allAgentsProcessed = currentAgents.length;
    if (!firstBatch.skipped) {
      this.nbAgentsProcessed += currentAgents.length;
    }
    // The cursor is advanced only once the batch is processed, so a runner that dies mid-batch
    // leaves a checkpoint pointing before it. Cursor and count always describe the same point:
    // advancing the count without the cursor would re-fetch a batch on resume and count it twice.
    this.retryParams.searchAfter = currentAgents[currentAgents.length - 1].sort!;
    await this.updateCheckpoint();

    while (allAgentsProcessed < res.total) {
      const nextPage = await getAgents();
      if (nextPage.pit) {
        pitId = nextPage.pit;
        this.retryParams.pitId = pitId;
      }
      currentAgents = nextPage.agents;
      if (currentAgents.length === 0) {
        appContextService
          .getLogger()
          .debug('currentAgents returned 0 hits, returning from bulk action query');
        break; // stop executing if there are no more results
      }
      const batch = await this.processBatch(currentAgents);
      allAgentsProcessed += currentAgents.length;
      if (!batch.skipped) {
        this.nbAgentsProcessed += currentAgents.length;
      }
      // updating check task with latest checkpoint (this.retryParams.searchAfter)
      this.retryParams.searchAfter = currentAgents[currentAgents.length - 1].sort!;
      await this.updateCheckpoint();
    }

    if (pitId) {
      await closePointInTime(this.esClient, pitId!);
    }

    appContextService
      .getLogger()
      .info(`processed ${allAgentsProcessed} agents, took ${Date.now() - start}ms`);
    return { actionId: this.actionParams.actionId! };
  }
}
