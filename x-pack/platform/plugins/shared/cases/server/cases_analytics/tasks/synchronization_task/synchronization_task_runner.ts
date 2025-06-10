/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

type SynchronizationTaskState = Record<string, unknown>;

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
  private readonly syncTaskId: TaskId | undefined;
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
    this.syncTaskId = taskInstance.state.syncTaskId;
    this.sourceIndex = taskInstance.params.sourceIndex;
    this.destIndex = taskInstance.params.destIndex;
    this.getESClient = getESClient;
    this.logger = logger;
  }

  public async run() {
    const esClient = await this.getESClient();
    let state: SynchronizationTaskState = {};

    try {
      const previousReindexStatus = await this.getPreviousReindexStatus(esClient);
      this.handleDebug(`Previous synchronization task status ${previousReindexStatus}.`);

      if (previousReindexStatus === ReindexStatus.RUNNING) {
        /*
         * If the reindex task is still running we return the
         * same state and the next run will cover any missing
         * updates.
         **/
        state = this.getSyncState();
      } else if (previousReindexStatus === ReindexStatus.COMPLETED) {
        await this.isIndexAvailable(esClient);
        this.updateLastSyncTimes({ updateSuccessTime: true });
        state = await this.synchronizeIndex({ esClient });
      } else if (
        /*
         * A missing task id can only happen if this is
         * the first task execution.
         **/
        (previousReindexStatus === ReindexStatus.MISSING_TASK_ID &&
          !this.lastSyncAttempt &&
          !this.lastSyncSuccess) ||
        previousReindexStatus === ReindexStatus.FAILED
      ) {
        await this.isIndexAvailable(esClient);

        /*
         * There are two possible scenarios here:
         * 1. If the previous task failed (ReindexStatus.FAILED)
         * 2. If the state is missing
         *
         * In both cases we try to reindex without updating lastSyncSuccess.
         * This will ensure the reindex query is built with the correct value.
         **/
        this.updateLastSyncTimes({ updateSuccessTime: false });
        state = await this.synchronizeIndex({ esClient });
      } else {
        /*
         * This should never happen, this else can only be reached if the
         * the condition (previousReindexStatus === ReindexStatus.MISSING_TASK_ID &&
         * !this.lastSyncAttempt && !this.lastSyncSuccess) fails.
         *
         * That would mean, we have an invalid task state
         **/
        throw new Error('Invalid task state.');
      }

      return {
        state,
      };
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
    this.handleDebug('Updating lastSyncAttempt and lastSyncSuccess before synchronization.');

    if (updateSuccessTime) {
      this.lastSyncSuccess = this.lastSyncAttempt;
    }
    this.lastSyncAttempt = new Date(Date.now());
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
  }): Promise<SynchronizationTaskState> {
    const painlessScript = await this.getPainlessScript(esClient);

    if (painlessScript.found) {
      this.handleDebug(`Synchronizing with ${this.sourceIndex}.`);

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
      });

      this.handleDebug(JSON.stringify(reindexResponse));

      return {
        lastSyncSuccess: this.lastSyncSuccess,
        lastSyncAttempt: this.lastSyncAttempt,
        syncTaskId: reindexResponse.task,
      };
    } else {
      throw createTaskRunError(
        new Error(this.handleErrorMessage('Painless script not found.')),
        this.errorSource
      );
    }
  }

  private async getPreviousReindexStatus(esClient: ElasticsearchClient): Promise<ReindexStatus> {
    this.handleDebug('Checking previous synchronization task status.');

    if (this.syncTaskId) {
      const taskResponse = await esClient.tasks.get({ task_id: this.syncTaskId.toString() });
      if (!taskResponse.completed) {
        return ReindexStatus.RUNNING;
      } else {
        if (taskResponse.response?.failures?.length || taskResponse.response?.error) {
          return ReindexStatus.FAILED;
        }
        return ReindexStatus.COMPLETED;
      }
    }

    return ReindexStatus.MISSING_TASK_ID;
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
      syncTaskId: this.syncTaskId,
    };
  }

  private async getMapping(esClient: ElasticsearchClient): Promise<IndicesGetMappingResponse> {
    this.handleDebug('Getting index mapping.');

    return esClient.indices.getMapping({
      index: this.destIndex,
    });
  }

  private async getPainlessScript(esClient: ElasticsearchClient) {
    const painlessScriptId = await this.getPainlessScriptId(esClient);

    this.handleDebug(`Getting painless script with id ${painlessScriptId}.`);

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

  private async isIndexAvailable(esClient: ElasticsearchClient) {
    this.handleDebug('Checking index availability.');

    return esClient.cluster.health({
      index: this.destIndex,
      wait_for_status: 'green',
      timeout: '300ms', // this is probably too much
      wait_for_active_shards: 'all',
    });
  }

  public handleDebug(message: string) {
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
