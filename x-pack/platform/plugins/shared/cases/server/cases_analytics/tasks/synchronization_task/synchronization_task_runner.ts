/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import {
  createTaskRunError,
  TaskErrorSource,
  throwRetryableError,
  throwUnrecoverableError,
  type ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type {
  IndicesGetMappingResponse,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { isRetryableEsClientError } from '../../utils';
import { SYNCHRONIZATION_QUERIES_DICTIONARY } from '../../constants';

interface SynchronizationTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
}

interface SynchronizationTaskState {
  lastSyncSuccess?: Date | undefined;
  lastSyncAttempt?: Date | undefined;
  esReindexTaskId?: TaskId | undefined;
}

enum ReindexStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  MISSING_TASK_ID = 'missing_task_id',
}

const LOOKBACK_WINDOW = 5 * 60 * 1000;

export class SynchronizationTaskRunner implements CancellableTask {
  private readonly sourceIndex: string;
  private readonly destIndex: string;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly logger: Logger;
  private readonly errorSource = TaskErrorSource.FRAMEWORK;
  private readonly esReindexTaskId: TaskId | undefined;
  private lastSyncSuccess: Date | undefined;
  private lastSyncAttempt: Date | undefined;

  constructor({
    taskInstance,
    getESClient,
    logger,
  }: SynchronizationTaskRunnerFactoryConstructorParams) {
    if (taskInstance.state.lastSyncSuccess)
      this.lastSyncSuccess = new Date(taskInstance.state.lastSyncSuccess);
    if (taskInstance.state.lastSyncAttempt)
      this.lastSyncAttempt = new Date(taskInstance.state.lastSyncAttempt);
    this.esReindexTaskId = taskInstance.state.esReindexTaskId;
    this.sourceIndex = taskInstance.params.sourceIndex;
    this.destIndex = taskInstance.params.destIndex;
    this.getESClient = getESClient;
    this.logger = logger;
  }

  public async run() {
    const esClient = await this.getESClient();

    try {
      const previousReindexStatus = await this.getPreviousReindexStatus(esClient);
      this.logDebug(`Previous synchronization task status: "${previousReindexStatus}".`);

      if (previousReindexStatus === ReindexStatus.RUNNING) {
        /*
         * If the reindex task is still running we return the
         * same state and the next run will cover any missing
         * updates.
         **/
        return {
          state: this.getSyncState() as Record<string, unknown>,
        };
      }

      if (previousReindexStatus === ReindexStatus.COMPLETED) {
        /*
         * If the previous reindex task is completed we reindex
         * with a new time window.
         **/

        const indexAvailable = await this.isIndexAvailable(esClient);

        if (!indexAvailable) {
          return this.handleIndexNotAvailable();
        }

        this.updateLastSyncTimes({ updateSuccessTime: true });

        const esReindexTaskId = await this.synchronizeIndex({ esClient });

        return {
          state: {
            lastSyncSuccess: this.lastSyncSuccess,
            lastSyncAttempt: this.lastSyncAttempt,
            esReindexTaskId,
          } as Record<string, unknown>,
        };
      }

      if (
        /*
         * A missing task id can only happen if this is
         * the first task execution.
         **/
        previousReindexStatus === ReindexStatus.MISSING_TASK_ID ||
        previousReindexStatus === ReindexStatus.FAILED
      ) {
        const indexAvailable = await this.isIndexAvailable(esClient);

        if (!indexAvailable) {
          return this.handleIndexNotAvailable();
        }

        /*
         * There are two possible scenarios here:
         * 1. If the previous task failed (ReindexStatus.FAILED)
         * 2. If the state is missing
         *
         * In both cases we try to reindex without updating lastSyncSuccess.
         * This will ensure the reindex query is built with the correct value.
         **/
        this.updateLastSyncTimes({ updateSuccessTime: false });

        const esReindexTaskId = await this.synchronizeIndex({ esClient });

        return {
          state: {
            lastSyncSuccess: this.lastSyncSuccess,
            lastSyncAttempt: this.lastSyncAttempt,
            esReindexTaskId,
          } as Record<string, unknown>,
        };
      }

      throw new Error('Invalid task state.');
    } catch (e) {
      if (isRetryableEsClientError(e)) {
        throwRetryableError(
          createTaskRunError(new Error(this.handleErrorMessage(e.message)), this.errorSource),
          true
        );
      }

      this.handleErrorMessage(e.message);
      throwUnrecoverableError(createTaskRunError(e, this.errorSource));
    }
  }

  private updateLastSyncTimes({ updateSuccessTime }: { updateSuccessTime?: boolean }) {
    this.logDebug('Updating lastSyncAttempt and lastSyncSuccess before synchronization.');

    if (updateSuccessTime) {
      this.lastSyncSuccess = this.lastSyncAttempt;
    }
    this.lastSyncAttempt = new Date();
  }

  /**
   * This method does a call to elasticsearch that reindexes from this.destIndex
   * to this.sourceIndex. The query used takes into account the lastSyncSuccess
   * and lastSyncAttempt values in the class.
   *
   * @returns {SynchronizationTaskState} The updated task state
   */
  private async synchronizeIndex({
    esClient,
  }: {
    esClient: ElasticsearchClient;
  }): Promise<TaskId | undefined> {
    const painlessScript = await this.getPainlessScript(esClient);

    if (painlessScript.found) {
      this.logDebug(`Synchronizing with ${this.sourceIndex}.`);

      const sourceQuery = this.buildSourceQuery();
      const reindexResponse = await esClient.reindex({
        source: {
          index: this.sourceIndex,
          query: sourceQuery,
        },
        dest: { index: this.destIndex },
        script: {
          id: painlessScript._id,
        },
        /** If `true`, the request refreshes affected shards to make this operation visible to search. */
        refresh: true,
        /** We do not wait for the es reindex operation to be completed. */
        wait_for_completion: false,
      });

      return reindexResponse.task;
    } else {
      throw createTaskRunError(
        new Error(this.handleErrorMessage('Painless script not found.')),
        this.errorSource
      );
    }
  }

  private async getPreviousReindexStatus(esClient: ElasticsearchClient): Promise<ReindexStatus> {
    this.logDebug('Checking previous synchronization task status.');

    if (!this.esReindexTaskId) {
      return ReindexStatus.MISSING_TASK_ID;
    }

    const taskResponse = await esClient.tasks.get({ task_id: this.esReindexTaskId.toString() });

    if (!taskResponse.completed) {
      return ReindexStatus.RUNNING;
    }

    if (taskResponse.response?.failures?.length || taskResponse?.error) {
      return ReindexStatus.FAILED;
    }

    return ReindexStatus.COMPLETED;
  }

  private buildSourceQuery(): QueryDslQueryContainer {
    return SYNCHRONIZATION_QUERIES_DICTIONARY[this.destIndex](
      new Date(this.lastSyncSuccess ? this.lastSyncSuccess : Date.now() - LOOKBACK_WINDOW)
    );
  }

  private getSyncState(): SynchronizationTaskState {
    return {
      lastSyncSuccess: this.lastSyncSuccess,
      lastSyncAttempt: this.lastSyncAttempt,
      esReindexTaskId: this.esReindexTaskId,
    };
  }

  private async getMapping(esClient: ElasticsearchClient): Promise<IndicesGetMappingResponse> {
    this.logDebug('Getting index mapping.');

    return esClient.indices.getMapping({
      index: this.destIndex,
    });
  }

  private async getPainlessScript(esClient: ElasticsearchClient) {
    const painlessScriptId = await this.getPainlessScriptId(esClient);

    this.logDebug(`Getting painless script with id: "${painlessScriptId}".`);

    return esClient.getScript({
      id: painlessScriptId,
    });
  }

  private async getPainlessScriptId(esClient: ElasticsearchClient): Promise<string> {
    const mapping = await this.getMapping(esClient);
    const painlessScriptId = mapping[this.destIndex].mappings._meta?.painless_script_id;

    if (!painlessScriptId) {
      throw createTaskRunError(
        new Error(this.handleErrorMessage('Painless script id missing from mapping.')),
        this.errorSource
      );
    }

    return painlessScriptId;
  }

  private async isIndexAvailable(esClient: ElasticsearchClient): Promise<boolean> {
    this.logDebug('Checking index availability.');

    try {
      await esClient.cluster.health({
        index: this.destIndex,
        wait_for_status: 'green',
        timeout: '30s',
      });
      return true;
    } catch (error) {
      if (error instanceof errors.TimeoutError) return false;
      else {
        throw createTaskRunError(
          new Error(this.handleErrorMessage('Call to verify cluster health failed unexpectedly.')),
          this.errorSource
        );
      }
    }
  }

  private handleIndexNotAvailable() {
    /*
     * If the cluster is not available we silently fail
     * and the next run will cover any missing updates.
     **/
    this.logDebug('Cluster not ready. Skipping synchronization.');

    return {
      state: this.getSyncState() as Record<string, unknown>,
    };
  }

  public logDebug(message: string) {
    this.logger.debug(`[${this.destIndex}] ${message}`, {
      tags: ['cai-synchronization', this.destIndex],
    });
  }

  public handleErrorMessage(message: string) {
    const errorMessage = `[${this.destIndex}] Synchronization reindex failed. Error: ${message}`;

    this.logger.error(errorMessage, {
      tags: ['cai-synchronization', 'cai-synchronization-error', this.destIndex],
    });

    return errorMessage;
  }

  public async cancel() {}
}
