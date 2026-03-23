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
import { appContextService } from '..';
import { SO_SEARCH_LIMIT } from '../../../common/constants';
import { agentsKueryNamespaceFilter } from '../spaces/agent_namespaces';

import { getAgentActions } from './actions';
import { closePointInTime, getAgentsByKuery } from './crud';
import type { BulkActionsResolver } from './bulk_actions_resolver';
import type { RetryParams } from './retry_helper';
import { getRetryParams, MAX_RETRY_COUNT } from './retry_helper';

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
   * On errors, starts a task with Task Manager to retry max 3 times
   * If the last batch was stored in state, retry continues from there (searchAfter)
   */
  public async runActionAsyncWithRetry(): Promise<{ actionId: string }> {
    if (!this.bulkActionsResolver) {
      this.bulkActionsResolver = await appContextService.getBulkActionsResolver();
    }

    // create task to check result with some delay, this runs in case of kibana crash too
    this.checkTaskId = await this.createCheckResultTask();

    await withSpan({ name: this.getActionType(), type: 'action' }, () =>
      this.processAgentsInBatches()
        .then(async () => {
          if (this.checkTaskId) {
            // no need for check task, action succeeded
            await this.bulkActionsResolver!.removeIfExists(this.checkTaskId);
          }
        })
        .catch(async (error) => {
          // 404 error comes when PIT query is closed
          if (isResponseError(error) && error.statusCode === 404) {
            const errorMessage =
              '404 error from elasticsearch, not retrying. Error: ' + error.message;
            appContextService.getLogger().warn(errorMessage);
            return;
          }
          if (this.retryParams.retryCount) {
            appContextService
              .getLogger()
              .error(
                `Retry #${this.retryParams.retryCount} of task ${this.retryParams.taskId} failed: ${error.message}`
              );

            if (this.retryParams.retryCount === MAX_RETRY_COUNT) {
              const errorMessage = `Stopping after retry #${MAX_RETRY_COUNT}. Error: ${error.message}`;
              appContextService.getLogger().warn(errorMessage);

              // clean up tasks after last retry reached
              await Promise.all([
                this.bulkActionsResolver!.removeIfExists(this.checkTaskId!),
                this.bulkActionsResolver!.removeIfExists(this.retryParams.taskId!),
              ]);

              return;
            }
          } else {
            appContextService.getLogger().error(`Action failed: ${error.message}`);
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

          appContextService.getLogger().info(`Retrying in task: ${taskId}`);
        })
    );

    return { actionId: this.actionParams.actionId! };
  }

  private async createCheckResultTask() {
    const taskId = this.bulkActionsResolver!.getTaskId(
      this.actionParams.actionId!,
      this.getTaskType() + ':check'
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
      moment(new Date()).add(5, 'm').toDate()
    );
  }

  private async processBatch(agents: Agent[]): Promise<{ actionId: string }> {
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
              return { actionId: this.actionParams.actionId! };
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

    const perPage = this.actionParams.batchSize ?? SO_SEARCH_LIMIT;

    appContextService.getLogger().debug('kuery: ' + this.actionParams.kuery);

    const getAgents = async () => {
      const namespaceFilter = await agentsKueryNamespaceFilter(this.actionParams.spaceId);

      const kuery = [
        ...(namespaceFilter ? [namespaceFilter] : []),
        ...(this.actionParams.kuery ? [this.actionParams.kuery] : []),
      ].join(' AND ');

      return getAgentsByKuery(this.esClient, this.soClient, {
        kuery,
        showAgentless: this.actionParams.showAgentless,
        showInactive: this.actionParams.showInactive ?? false,
        page: 1,
        perPage,
        pitId,
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

    await this.processBatch(currentAgents);
    let allAgentsProcessed = currentAgents.length;

    while (allAgentsProcessed < res.total) {
      const lastAgent = currentAgents[currentAgents.length - 1];
      this.retryParams.searchAfter = lastAgent.sort!;
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
      await this.processBatch(currentAgents);
      allAgentsProcessed += currentAgents.length;
      if (this.checkTaskId) {
        // updating check task with latest checkpoint (this.retryParams.searchAfter)
        await this.bulkActionsResolver?.removeIfExists(this.checkTaskId);
        this.checkTaskId = await this.createCheckResultTask();
      }
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
