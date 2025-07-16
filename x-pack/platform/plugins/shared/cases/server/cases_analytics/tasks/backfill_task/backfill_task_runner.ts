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
import type { ConfigType } from '../../../config';
import { isRetryableEsClientError } from '../../utils';

interface BackfillTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
}

export class BackfillTaskRunner implements CancellableTask {
  private readonly sourceIndex: string;
  private readonly destIndex: string;
  private readonly sourceQuery: QueryDslQueryContainer;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly logger: Logger;
  private readonly errorSource = TaskErrorSource.FRAMEWORK;
  private readonly analyticsConfig: ConfigType['analytics'];

  constructor({
    taskInstance,
    getESClient,
    logger,
    analyticsConfig,
  }: BackfillTaskRunnerFactoryConstructorParams) {
    this.sourceIndex = taskInstance.params.sourceIndex;
    this.destIndex = taskInstance.params.destIndex;
    this.sourceQuery = taskInstance.params.sourceQuery;
    this.getESClient = getESClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
  }

  public async run() {
    if (!this.analyticsConfig.index.enabled) {
      this.logDebug('Analytics index is disabled, proceeding anyway.');
      // this.logDebug('Analytics index is disabled, skipping backfill task.');
      // return;
    }

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
      if (isRetryableEsClientError(e)) {
        throwRetryableError(
          createTaskRunError(new Error(this.getErrorMessage(e.message)), this.errorSource),
          true
        );
      }

      this.logger.error(`[${this.destIndex}] Backfill reindex failed. Error: ${e.message}`, {
        tags: ['cai-backfill', 'cai-backfill-error', this.destIndex],
      });
      throwUnrecoverableError(createTaskRunError(e, this.errorSource));
    }
  }

  public async cancel() {}

  private async backfillReindex(esClient: ElasticsearchClient) {
    const painlessScript = await this.getPainlessScript(esClient);

    if (painlessScript.found) {
      this.logDebug(`Reindexing from ${this.sourceIndex} to ${this.destIndex}.`);
      const painlessScriptId = await this.getPainlessScriptId(esClient);

      await esClient.reindex({
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
        /** We do not wait for the es reindex operation to be completed. */
        wait_for_completion: false,
      });
    } else {
      throw createTaskRunError(
        new Error(this.getErrorMessage('Painless script not found.')),
        this.errorSource
      );
    }
  }

  private async getPainlessScript(esClient: ElasticsearchClient) {
    const painlessScriptId = await this.getPainlessScriptId(esClient);

    this.logDebug(`Getting painless script with id ${painlessScriptId}.`);
    return esClient.getScript({
      id: painlessScriptId,
    });
  }

  private async getPainlessScriptId(esClient: ElasticsearchClient): Promise<string> {
    const currentMapping = await this.getCurrentMapping(esClient);
    const painlessScriptId = currentMapping[this.destIndex].mappings._meta?.painless_script_id;

    if (!painlessScriptId) {
      throw createTaskRunError(
        new Error(this.getErrorMessage('Painless script id missing from mapping.')),
        this.errorSource
      );
    }

    return painlessScriptId;
  }

  private async getCurrentMapping(
    esClient: ElasticsearchClient
  ): Promise<IndicesGetMappingResponse> {
    this.logDebug('Getting index mapping.');
    return esClient.indices.getMapping({
      index: this.destIndex,
    });
  }

  private async waitForDestIndex(esClient: ElasticsearchClient) {
    this.logDebug('Checking index availability.');
    return esClient.cluster.health({
      index: this.destIndex,
      wait_for_status: 'green',
      timeout: '30s',
    });
  }

  public logDebug(message: string) {
    this.logger.info(`[${this.destIndex}] ${message}`, {
      tags: ['cai-backfill', this.destIndex],
    });
  }

  public getErrorMessage(message: string) {
    const errorMessage = `[${this.destIndex}] Backfill reindex failed. Error: ${message}`;

    this.logger.error(errorMessage, {
      tags: ['cai-backfill', 'cai-backfill-error', this.destIndex],
    });

    return errorMessage;
  }
}
