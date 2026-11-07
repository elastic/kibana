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
import { AgentActionNotFoundError } from '../../errors';
import { appContextService } from '../app_context';
import { SO_SEARCH_LIMIT } from '../../../common/constants';
import { agentsKueryNamespaceFilter, buildFilterWithNamespace } from '../spaces/agent_namespaces';

import { getAgentActions } from './actions';
import { closePointInTime, getAgentsByKuery, openPointInTime } from './crud';
import type { BulkActionsResolver } from './bulk_actions_resolver';
import type { BulkActionCheckTaskState, RetryParams } from './retry_helper';
import {
  CHECK_TASK_INTERVAL_MINUTES,
  getRetryParams,
  MAX_RETRY_COUNT,
  RejectedCheckpointError,
  RUNNER_HEARTBEAT_INTERVAL_MINUTES,
} from './retry_helper';

/**
 * Keep alive for the point in time the runner pages with. Every search resets the point in time's
 * TTL to this value, so it has to comfortably exceed how long a single batch takes: the 1m default
 * in getAgentsByKuery expires it whenever a batch is slower than that, and the next search 404s.
 */
export const PIT_KEEP_ALIVE = '10m';

/**
 * Sort the runner pages with. `agent.id` is a keyword present and unique on every
 * `.fleet-agents` document, so this is a total order and a saved cursor keeps the same meaning
 * in any point in time. The default `enrolled_at` + hostname sort is not unique, so it leans on
 * the point in time's implicit `_shard_doc` tiebreaker, which is only meaningful inside the
 * point in time that produced it: a checkpoint resumed under a fresh one could then skip agents
 * that tie on both fields. The order itself does not matter here, only that it is total.
 *
 * `agent` is optional on `FleetServerAgent`, so this leans on Fleet Server writing `agent.id` on
 * every document it enrolls — nothing in Kibana creates a `.fleet-agents` document. Several
 * documents missing it would tie on "missing last", fall back to the point in time's `_shard_doc`
 * as the default sort does, and could be skipped across a reopen. There is no strictly better key
 * available here: the document `_id` is the agent id, but sorting on `_id` needs fielddata, which
 * Elasticsearch disallows by default. The field is mapped as a keyword, so a tie degrades to the
 * same silent skip the default sort already had, not to an error.
 */
export const ACTION_SORT_FIELD = 'agent.id';
export const ACTION_SORT_ORDER = 'asc' as const;

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
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  /**
   * Ids of the agents earlier runs of this action already actioned, read once per run from the
   * action documents in `.fleet-actions`. Undefined until the first batch asks for it.
   */
  private actionedAgentIds?: Set<string>;

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
            // A 404 here means the point in time this run paged with has expired. Retrying with
            // the same pitId would 404 again every time until the retry budget is spent, so clear
            // it and let processAgentsInBatches open a fresh one.
            if (isResponseError(error) && error.statusCode === 404) {
              logger.error(
                `404 error from Elasticsearch during action ${this.actionParams.actionId}, retrying without the expired point in time: ${error.message}`
              );
              this.retryParams = { ...this.retryParams, pitId: undefined };
            }
            // Elasticsearch rejected the `search_after` value this run resumed from. The cursor
            // holds one value per sort clause, so a checkpoint taken under a different sort no
            // longer fits — an action that was in flight while Kibana was upgraded to a version
            // that changed ACTION_SORT_FIELD. It cannot be translated, so the action restarts
            // from the beginning, and the count restarts with it to stay consistent with the
            // cursor. Agents already actioned are deduplicated per agent by `processBatch`, which
            // does not depend on batch boundaries holding still across the restart.
            //
            // This is raised only around the first search of the run, so a 400 from a subclass's
            // writes in `processAgents` or from a later page is an ordinary failure and is
            // retried rather than restarting the action and resetting its count.
            if (error instanceof RejectedCheckpointError) {
              logger.error(
                `Elasticsearch rejected the saved checkpoint of action ${this.actionParams.actionId}, restarting it from the beginning: ${error.message}`
              );
              this.retryParams = { ...this.retryParams, searchAfter: undefined };
              this.nbAgentsProcessed = 0;
              // Clear the stored checkpoint too, so the check task does not hand the rejected
              // cursor back to the next run if this one dies before its first batch.
              await this.updateCheckpoint();
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
    await this.writeCheckTaskState({
      searchAfter: this.retryParams.searchAfter,
      // Checkpointed with the cursor: Elasticsearch can return a new point in time id on any
      // search, and the cursor is only meaningful against the one that produced it.
      pitId: this.retryParams.pitId,
      nbAgentsProcessed: this.nbAgentsProcessed,
    });
  }

  private async writeCheckTaskState(
    checkpoint: Partial<
      Pick<BulkActionCheckTaskState, 'searchAfter' | 'pitId' | 'nbAgentsProcessed'>
    >
  ) {
    if (!this.checkTaskId) {
      return;
    }
    try {
      await this.bulkActionsResolver!.updateCheckTaskState(this.checkTaskId, checkpoint);
    } catch (error) {
      appContextService
        .getLogger()
        .warn(
          `Could not update the checkpoint on check task ${this.checkTaskId}: ${error.message}`
        );
    }
  }

  /**
   * Refresh the checkpoint timestamp while a batch is in flight, so the watchdog can tell a slow
   * runner from a dead one.
   *
   * Nothing but the timestamp is written: the cursor and the count are only valid between
   * batches, and a heartbeat landing after an `advanceCheckpoint` would otherwise roll them back
   * by a batch.
   *
   * Without this, a batch slower than CHECK_TASK_INTERVAL_MINUTES is indistinguishable from a
   * dead runner and the watchdog starts a second runner alongside it. A resume racing a live
   * runner is the worse of the two outcomes, so the heartbeat is the right default.
   *
   * The cost is that a runner alive but wedged inside `processAgents` — a hung Elasticsearch call
   * with no timeout, say — keeps heartbeating, so the watchdog reads it as alive, never resumes,
   * and never increments `resumeCount` towards `MAX_CHECK_TASK_RESUMES`. That path has no bound
   * of its own, which is why the check task also stops unconditionally at `MAX_CHECK_TASK_RUNS`.
   * Such an action stays `IN_PROGRESS`, as it did before this PR; what the ceiling prevents is a
   * recurring task watching it for the lifetime of the Kibana process.
   */
  private startHeartbeat() {
    if (!this.checkTaskId || this.heartbeatTimer) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      void this.writeCheckTaskState({});
    }, RUNNER_HEARTBEAT_INTERVAL_MINUTES * 60 * 1000);
    // Must never hold Kibana open on shutdown.
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Move the count and the cursor past a batch that has been processed, then checkpoint both.
   *
   * They move together, after the batch is processed, so a runner that dies mid-batch leaves a
   * checkpoint pointing before it and both values describe the same point. Advancing one without
   * the other would make a resume re-read a batch and double count it, or leave the count
   * permanently short of `total` so completion is never recognised.
   */
  private async advanceCheckpoint(agents: Agent[]) {
    this.nbAgentsProcessed += agents.length;
    this.retryParams.searchAfter = agents[agents.length - 1].sort!;
    await this.updateCheckpoint();
  }

  /**
   * Agents this action has already actioned, collected once per run from the action documents
   * written by its earlier runs.
   *
   * `UPDATE_TAGS` documents are left out. Those retries restart from scratch behind a kuery that
   * already excludes the agents whose tags were written, so an agent still matching the kuery
   * while appearing in such a document is one whose write did not land, and it has to run again.
   *
   * Only "this action has written nothing yet" is swallowed. Any other read failure has to
   * propagate: deduplication that fails open re-actions every agent of every earlier run, so a
   * transient Elasticsearch timeout would be far more costly than failing the batch and retrying.
   */
  private async getActionedAgentIds(): Promise<Set<string>> {
    if (this.actionedAgentIds) {
      return this.actionedAgentIds;
    }
    const actionedAgentIds = new Set<string>();
    try {
      const actions = await getAgentActions(this.esClient, this.actionParams.actionId!);
      for (const action of actions) {
        if (action.type === 'UPDATE_TAGS') {
          continue;
        }
        for (const agentId of action.agents ?? []) {
          actionedAgentIds.add(agentId);
        }
      }
    } catch (error) {
      if (!(error instanceof AgentActionNotFoundError)) {
        throw error;
      }
      appContextService
        .getLogger()
        .debug(`No action document yet for action ${this.actionParams.actionId}, nothing to skip`);
    }
    this.actionedAgentIds = actionedAgentIds;
    return actionedAgentIds;
  }

  /**
   * Whether an error from `processAgents` means the batch held nothing the action could act on,
   * as opposed to a failure worth retrying. Subclasses that reject such a batch override this.
   *
   * It is only consulted for a batch that was partially deduplicated, which is the one case where
   * the answer is certain: a document covering part of the batch means an earlier run finished
   * the batch and wrote its error results, so the agents left over are the ones it deliberately
   * excluded and replaying them cannot produce a different outcome.
   */
  protected isBatchWithoutActionableAgents(error: Error): boolean {
    return false;
  }

  /**
   * Action the agents of a batch that earlier runs of this action did not already action.
   *
   * Deduplication is per agent rather than per batch. Keying on a batch — matching its first
   * agent against an existing action document — only identifies a batch while batch boundaries
   * hold still, and they do not: an action that restarts from the beginning repages the same
   * agents into different batches, so a batch could share its first agent with an actioned one
   * while also holding agents that were never actioned, and skipping it would drop them silently.
   *
   * Filtering also keeps a fully actioned batch from reaching `processAgents` at all, which
   * matters for the subclasses that reject a batch with nothing left to do: `reassignBatch`
   * throws `AgentAlreadyAssignedError` when every agent is already on the target policy, and a
   * batch replayed after a restart would otherwise fail that way through the whole retry budget
   * without ever reaching the agents behind it.
   */
  private async processBatch(agents: Agent[]): Promise<{ actionId: string }> {
    if (!this.retryParams.retryCount) {
      return await this.processAgents(agents);
    }

    const actionedAgentIds = await this.getActionedAgentIds();
    if (actionedAgentIds.size === 0) {
      return await this.processAgents(agents);
    }

    const remainingAgents = agents.filter(({ id }) => !actionedAgentIds.has(id));
    if (remainingAgents.length === 0) {
      appContextService
        .getLogger()
        .debug(
          `Skipping batch of action ${this.actionParams.actionId}, every agent in it was already actioned`
        );
      // The batch is still counted by the caller: its agents are done, and leaving them out would
      // hold the count below `total` so the check task's completion fallback never fires.
      return { actionId: this.actionParams.actionId! };
    }
    if (remainingAgents.length === agents.length) {
      return await this.processAgents(remainingAgents);
    }

    appContextService
      .getLogger()
      .debug(
        `Dropping ${
          agents.length - remainingAgents.length
        } already actioned agents from a batch of action ${this.actionParams.actionId}`
      );

    try {
      return await this.processAgents(remainingAgents);
    } catch (error) {
      // An earlier run finished this batch — that is what the document covering part of it means —
      // so the agents it left out are ones it could not act on: already on the target policy,
      // hosted, agentless. Replaying them throws the same error every time, which would spend the
      // whole retry budget on this batch and never reach the agents behind it.
      if (!this.isBatchWithoutActionableAgents(error)) {
        throw error;
      }
      appContextService
        .getLogger()
        .debug(
          `Skipping a replayed batch of action ${this.actionParams.actionId} with no actionable agents left: ${error.message}`
        );
      return { actionId: this.actionParams.actionId! };
    }
  }

  async processAgentsInBatches(): Promise<{ actionId: string }> {
    const start = Date.now();

    // The point in time is only missing once it has expired and the 404 handler cleared it (or
    // for an action type that restarts from scratch). Open a fresh one rather than paging without
    // one: a checkpoint saved under a point in time carries Elasticsearch's implicit `_shard_doc`
    // tiebreaker, so it has one more value than the plain sort has clauses, and a non-PIT search
    // would reject it with a 400.
    if (!this.retryParams.pitId) {
      this.retryParams.pitId = await openPointInTime(this.esClient, PIT_KEEP_ALIVE);
      appContextService
        .getLogger()
        .debug(`Opened a new point in time to resume action ${this.actionParams.actionId}`);
    }

    const perPage = this.actionParams.batchSize ?? SO_SEARCH_LIMIT;

    appContextService.getLogger().debug('kuery: ' + this.actionParams.kuery);

    // Reads the point in time off `retryParams` on every call rather than closing over it:
    // Elasticsearch may hand back a new id on any search, and the next page has to use it.
    const getAgents = async () => {
      const namespaceFilter = await agentsKueryNamespaceFilter(this.actionParams.spaceId);
      const kuery = buildFilterWithNamespace(namespaceFilter, this.actionParams.kuery);

      const res = await getAgentsByKuery(this.esClient, this.soClient, {
        kuery,
        showAgentless: this.actionParams.showAgentless,
        showInactive: this.actionParams.showInactive ?? false,
        page: 1,
        perPage,
        pitId: this.retryParams.pitId,
        pitKeepAlive: PIT_KEEP_ALIVE,
        sortField: ACTION_SORT_FIELD,
        sortOrder: ACTION_SORT_ORDER,
        searchAfter: this.retryParams.searchAfter,
      });
      if (res.pit) {
        this.retryParams.pitId = res.pit;
      }
      return res;
    };

    // Stamp the checkpoint before the first batch, and keep stamping it on a timer, so the
    // watchdog has a liveness signal from the moment the runner starts. Without it, a batch
    // slower than CHECK_TASK_INTERVAL_MINUTES looks identical to a dead runner: no checkpoint has
    // moved and no action document has been written yet, so the watchdog would start a second
    // runner alongside this one. This first write also persists a freshly opened point in time.
    await this.updateCheckpoint();
    this.startHeartbeat();

    // Only the first search of a run can be the one Elasticsearch rejects the resumed cursor on,
    // so it is the only one wrapped: every later page searches with a cursor Elasticsearch has
    // just handed back, and a failure from a batch's own writes has to stay an ordinary retryable
    // error rather than restart the action.
    const getPage = async (isFirstPage: boolean) => {
      try {
        return await getAgents();
      } catch (error) {
        if (
          isFirstPage &&
          this.retryParams.searchAfter &&
          isResponseError(error) &&
          error.statusCode === 400
        ) {
          throw new RejectedCheckpointError(error);
        }
        throw error;
      }
    };

    try {
      let allAgentsProcessed = 0;
      let total = 0;
      // One loop for every page, so the point in time is closed on the no-hits exit too rather
      // than left open for its whole keep alive.
      for (let isFirstPage = true; isFirstPage || allAgentsProcessed < total; isFirstPage = false) {
        const page = await getPage(isFirstPage);
        if (isFirstPage) {
          total = page.total;
        }
        if (page.agents.length === 0) {
          appContextService
            .getLogger()
            .debug('currentAgents returned 0 hits, returning from bulk action query');
          break; // stop executing if there are no more results
        }
        await this.processBatch(page.agents);
        allAgentsProcessed += page.agents.length;
        await this.advanceCheckpoint(page.agents);
      }

      // Closed on the way out of a finished run only, not in the `finally`: a run that throws
      // hands its point in time to the retry, which resumes the cursor against the very point in
      // time that produced it. One that is never resumed expires on its own keep alive.
      if (this.retryParams.pitId) {
        await closePointInTime(this.esClient, this.retryParams.pitId);
      }

      appContextService
        .getLogger()
        .info(`processed ${allAgentsProcessed} agents, took ${Date.now() - start}ms`);
      return { actionId: this.actionParams.actionId! };
    } finally {
      this.stopHeartbeat();
    }
  }
}
