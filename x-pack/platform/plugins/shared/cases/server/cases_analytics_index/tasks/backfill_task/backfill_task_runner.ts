/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type {
  IndicesGetMappingResponse,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

interface BackfillTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
}

export class CaseAnalyticsIndexBackfillTaskRunner implements CancellableTask {
  private readonly sourceIndex: string;
  private readonly destIndex: string;
  private readonly sourceQuery: QueryDslQueryContainer;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly logger: Logger;

  constructor({ taskInstance, getESClient, logger }: BackfillTaskRunnerFactoryConstructorParams) {
    this.sourceIndex = taskInstance.params.sourceIndex;
    this.destIndex = taskInstance.params.destIndex;
    this.sourceQuery = taskInstance.params.sourceQuery;
    this.getESClient = getESClient;
    this.logger = logger;
  }

  public async run() {
    try {
      await this.backfillReindex();
      return {
        state: {},
      };
    } catch (e) {
      this.logger.error(`Backfill reindex of ${this.destIndex} failed. Error: ${e.message}`);
      return {
        state: {},
      };
    }
  }

  private async backfillReindex() {
    const esClient = await this.getESClient();
    const painlessScript = await this.getPainlessScript();

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
        // make sure the indexes are created?
        wait_for_active_shards: 'all',
      });
    } else {
      // log error?
    }
  }

  private async getPainlessScript() {
    const esClient = await this.getESClient();
    const painlessScriptId = await this.getPainlessScriptId();
    this.logger.info(`Getting painless script with id ${painlessScriptId}.`);
    return esClient.getScript({
      id: painlessScriptId,
    });
  }

  private async getPainlessScriptId() {
    const currentMapping = await this.getCurrentMapping();
    return currentMapping[this.destIndex].mappings._meta?.painless_script_id;
  }

  private async getCurrentMapping(): Promise<IndicesGetMappingResponse> {
    const esClient = await this.getESClient();

    this.logger.info(`Getting mapping of index ${this.destIndex}.`);
    return esClient.indices.getMapping({
      index: this.destIndex,
    });
  }

  public async cancel() {}
}
