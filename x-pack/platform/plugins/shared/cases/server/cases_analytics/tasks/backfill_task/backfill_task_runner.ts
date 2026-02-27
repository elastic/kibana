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
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import type { ConfigType } from '../../../config';

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
      this.logDebug('Analytics index is disabled, skipping backfill task.');
      return;
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
      // ------------------------------------------------------------------
      // Diagnostic: count and sample matching source documents before reindex
      // ------------------------------------------------------------------
      this.logger.info(`[${this.destIndex}] Source query: ${JSON.stringify(this.sourceQuery)}`);

      const countResult = await esClient.count({
        index: this.sourceIndex,
        query: this.sourceQuery,
      });
      this.logger.info(
        `[${this.destIndex}] Source document count in "${this.sourceIndex}": ${countResult.count}`
      );

      if (countResult.count > 0) {
        const sampleResult = await esClient.search({
          index: this.sourceIndex,
          query: this.sourceQuery,
          size: 5,
          _source: ['type', 'namespaces', 'cases.owner', 'cases.title', 'cases.status'],
        });
        this.logger.info(
          `[${this.destIndex}] Sample source documents (up to 5): ${JSON.stringify(
            sampleResult.hits.hits.map((hit) => ({ _id: hit._id, _source: hit._source }))
          )}`
        );
      } else {
        this.logger.info(
          `[${this.destIndex}] No documents matched the source query — nothing will be reindexed. ` +
            `Check that the owner and spaceId in the query match your actual cases data.`
        );
      }
      // ------------------------------------------------------------------

      this.logDebug(`Reindexing from ${this.sourceIndex} to ${this.destIndex}.`);
      const painlessScriptId = await this.getPainlessScriptId(esClient);

      const reindexResponse = await esClient.reindex(
        {
          source: {
            index: this.sourceIndex,
            query: this.sourceQuery,
          },
          dest: { index: this.destIndex },
          script: {
            id: painlessScriptId,
          },
          refresh: true,
          /** Wait for completion so we can log errors and results directly. */
          wait_for_completion: true,
        },
        { requestTimeout: 300_000 }
      );

      this.logger.info(
        `[${this.destIndex}] Reindex complete — ` +
          `total=${reindexResponse.total} created=${reindexResponse.created} ` +
          `updated=${reindexResponse.updated} deleted=${reindexResponse.deleted} ` +
          `failures=${reindexResponse.failures?.length ?? 0} took=${reindexResponse.took}ms`
      );

      if (reindexResponse.failures && reindexResponse.failures.length > 0) {
        this.logger.error(
          `[${this.destIndex}] Reindex failures (first 5): ${JSON.stringify(
            reindexResponse.failures.slice(0, 5)
          )}`
        );
      }
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
    this.logger.debug(`[${this.destIndex}] ${message}`, {
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
