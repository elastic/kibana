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

interface BackfillTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
}

export class BackfillTaskRunner implements CancellableTask {
  private readonly sourceIndex: string;
  private readonly destIndex: string;
  private readonly sourceQuery: QueryDslQueryContainer;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly logger: Logger;
  private readonly errorSource = TaskErrorSource.FRAMEWORK;

  constructor({ taskInstance, getESClient, logger }: BackfillTaskRunnerFactoryConstructorParams) {
    this.sourceIndex = taskInstance.params.sourceIndex;
    this.destIndex = taskInstance.params.destIndex;
    this.sourceQuery = taskInstance.params.sourceQuery;
    this.getESClient = getESClient;
    this.logger = logger;
  }

  public async run() {
    const esClient = await this.getESClient();
    try {
      await this.waitForDestIndex(esClient);
      await this.backfillReindex(esClient);

      return {
        // one time only tasks get deleted so this state is not enough
        // for the periodic tasks to know the backfill was complete
        state: {}, // ?
      };
    } catch (e) {
      this.logger.error(`Backfill reindex of ${this.destIndex} failed. Error: ${e.message}`, {
        tags: ['backfill-run-failed', `${this.errorSource}-error`],
      });

      if (isRetryableEsClientError(e)) {
        throwRetryableError(
          createTaskRunError(
            new Error(`Backfill reindex of ${this.destIndex} failed. Error: ${e.message}`),
            this.errorSource
          ),
          true
        );
      }

      throwUnrecoverableError(createTaskRunError(e, this.errorSource));
    }
  }

  public async cancel() {}

  private async backfillReindex(esClient: ElasticsearchClient) {
    const painlessScript = await this.getPainlessScript(esClient);

    if (painlessScript.found) {
      this.logger.info(`Reindexing from ${this.sourceIndex} to ${this.destIndex}.`);
      await esClient.reindex({
        source: {
          index: this.sourceIndex,
          query: this.sourceQuery,
        },
        dest: { index: this.destIndex },
        script: painlessScript.script,
        /** If `true`, the request refreshes affected shards to make this operation visible to search. */
        refresh: true,
      });
    } else {
      throw createTaskRunError(
        new Error(
          `Backfill reindex of ${this.destIndex} failed. Error: Painless script not found.`
        ),
        this.errorSource
      );
    }
  }

  private async getPainlessScript(esClient: ElasticsearchClient) {
    const painlessScriptId = await this.getPainlessScriptId(esClient);

    this.logger.info(`Getting painless script with id ${painlessScriptId}.`);
    return esClient.getScript({
      id: painlessScriptId,
    });
  }

  private async getPainlessScriptId(esClient: ElasticsearchClient): Promise<string> {
    const currentMapping = await this.getCurrentMapping(esClient);
    const painlessScriptId = currentMapping[this.destIndex].mappings._meta?.painless_script_id;

    if (!painlessScriptId) {
      throw createTaskRunError(
        new Error(
          `Backfill reindex of ${this.destIndex} failed. Error: Painless script id missing from mapping.`
        ),
        this.errorSource
      );
    }

    return painlessScriptId;
  }

  private async getCurrentMapping(
    esClient: ElasticsearchClient
  ): Promise<IndicesGetMappingResponse> {
    this.logger.info(`Getting mapping of index ${this.destIndex}.`);
    return esClient.indices.getMapping({
      index: this.destIndex,
    });
  }

  private async waitForDestIndex(esClient: ElasticsearchClient) {
    return esClient.cluster.health({
      index: this.destIndex,
      wait_for_status: 'green',
      timeout: '300ms', // this is probably too much
      wait_for_active_shards: 'all',
    });
  }
}
