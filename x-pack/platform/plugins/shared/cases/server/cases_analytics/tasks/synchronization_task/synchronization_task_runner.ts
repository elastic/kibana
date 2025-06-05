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
  RUNNING = 0,
  COMPLETED = 1,
  FAILED = 2,
  MISSING_TASK_ID = 3,
}

const LOOKBACK_WINDOW = 5 * 60 * 1000;

export class SynchronizationTaskRunner implements CancellableTask {
  private readonly sourceIndex: string;
  private readonly destIndex: string;
  private readonly sourceQuery: QueryDslQueryContainer;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly logger: Logger;
  private readonly errorSource = TaskErrorSource.FRAMEWORK;
  private readonly lastSyncedAt: Date | undefined;
  private readonly syncTaskId: TaskId | undefined;

  constructor({
    taskInstance,
    getESClient,
    logger,
  }: SynchronizationTaskRunnerFactoryConstructorParams) {
    this.lastSyncedAt = taskInstance.state.lastSyncedAt;
    this.syncTaskId = taskInstance.state.syncTaskId;
    this.sourceIndex = taskInstance.params.sourceIndex;
    this.destIndex = taskInstance.params.destIndex;

    /**
     * Ideally the different getSourceQuery functions would be part of the
     * task instance parameters. This is not possible since the task instance
     * is stored in ES and the function gets converted into string.
     */
    this.sourceQuery = SYNCHRONIZATION_QUERIES_DICTIONARY[this.destIndex](
      new Date(this.lastSyncedAt ? this.lastSyncedAt : Date.now() - LOOKBACK_WINDOW) // TODO
    );

    this.getESClient = getESClient;
    this.logger = logger;
  }

  public async run() {
    const esClient = await this.getESClient();
    let state: SynchronizationTaskState = {};

    try {
      const previousReindexStatus = await this.getPreviousReindexStatus(esClient);
      this.logger.debug(`Previous synchronization task status ${previousReindexStatus}.`, {
        tags: ['cai-synchronization', this.destIndex],
      });

      if (previousReindexStatus === ReindexStatus.RUNNING) {
        state = this.getPreviousState();
      } else if (
        previousReindexStatus === ReindexStatus.COMPLETED ||
        previousReindexStatus === ReindexStatus.MISSING_TASK_ID // probably the first task execution
      ) {
        if (await this.isIndexAvailable(esClient)) {
          state = await this.synchronizeIndex(esClient);
        } else {
          state = this.getPreviousState();
        }
      } else {
        // ReindexStatus.FAILED
        // What to do?
      }

      return {
        state,
      };
    } catch (e) {
      this.logger.error(
        `Synchronization reindex of ${this.destIndex} failed. Error: ${e.message}`,
        {
          tags: ['cai-synchronization', this.destIndex, `${this.errorSource}-error`],
        }
      );

      if (isRetryableEsClientError(e)) {
        throwRetryableError(
          createTaskRunError(
            new Error(`Synchronization reindex of ${this.destIndex} failed. Error: ${e.message}`),
            this.errorSource
          ),
          true
        );
      }

      throwUnrecoverableError(createTaskRunError(e, this.errorSource));
    }
  }

  private async synchronizeIndex(esClient: ElasticsearchClient): Promise<SynchronizationTaskState> {
    const painlessScript = await this.getPainlessScript(esClient);

    if (painlessScript.found) {
      this.logger.debug(`Reindexing from ${this.sourceIndex} to ${this.destIndex}.`);

      const painlessScriptId = await this.getPainlessScriptId(esClient);
      const lastSyncedAt = Date.now();

      this.logger.debug(`Synchronizing ${this.destIndex} with ${this.sourceIndex}.`, {
        tags: ['cai-synchronization', this.destIndex],
      });

      const reindexResponse = await esClient.reindex({
        source: {
          index: this.sourceIndex,
          query: this.sourceQuery,
        },
        dest: { index: this.destIndex },
        script: {
          id: painlessScriptId,
        },
        /** If `true`, the request refreshes affected shards to make this operation visible to search. */
        refresh: true,
      });

      return {
        lastSyncedAt,
        syncTaskId: reindexResponse.task,
      };
    } else {
      throw createTaskRunError(
        new Error(
          `Synchronization reindex of ${this.destIndex} failed. Error: Painless script not found.`
        ),
        this.errorSource
      );
    }
  }

  private async getPainlessScript(esClient: ElasticsearchClient) {
    const painlessScriptId = await this.getPainlessScriptId(esClient);

    this.logger.debug(`Getting painless script with id ${painlessScriptId}.`, {
      tags: ['cai-synchronization', this.destIndex],
    });

    return esClient.getScript({
      id: painlessScriptId,
    });
  }

  private getPreviousState(): SynchronizationTaskState {
    return {
      lastSyncedAt: this.lastSyncedAt,
      syncTaskId: this.syncTaskId,
    };
  }

  private async getPainlessScriptId(esClient: ElasticsearchClient): Promise<string> {
    const mapping = await this.getMapping(esClient);
    const painlessScriptId = mapping[this.destIndex].mappings._meta?.painless_script_id;

    if (!painlessScriptId) {
      throw createTaskRunError(
        new Error(
          `Synchronization reindex of ${this.destIndex} failed. Error: Painless script id missing from mapping.`
        ),
        this.errorSource
      );
    }

    return painlessScriptId;
  }

  private async getMapping(esClient: ElasticsearchClient): Promise<IndicesGetMappingResponse> {
    this.logger.debug(`Getting mapping of index ${this.destIndex}.`, {
      tags: ['cai-synchronization', this.destIndex],
    });

    return esClient.indices.getMapping({
      index: this.destIndex,
    });
  }

  private async isIndexAvailable(esClient: ElasticsearchClient) {
    this.logger.debug(`Checking ${this.destIndex} index availability.`, {
      tags: ['cai-synchronization', this.destIndex],
    });

    return esClient.cluster.health({
      index: this.destIndex,
      wait_for_status: 'green',
      timeout: '300ms', // this is probably too much
      wait_for_active_shards: 'all',
    });
  }

  private async getPreviousReindexStatus(esClient: ElasticsearchClient): Promise<ReindexStatus> {
    this.logger.debug(
      `Checking previous synchronization task status for index ${this.destIndex}.`,
      {
        tags: ['cai-synchronization', this.destIndex],
      }
    );

    if (this.syncTaskId) {
      const taskResponse = await esClient.tasks.get({ task_id: this.syncTaskId.toString() });

      if (!taskResponse.completed) {
        return ReindexStatus.RUNNING;
      } else {
        if (taskResponse.response?.failures?.length) {
          return ReindexStatus.FAILED;
        }
        return ReindexStatus.COMPLETED;
      }
    }

    return ReindexStatus.MISSING_TASK_ID;
  }

  public async cancel() {}
}
