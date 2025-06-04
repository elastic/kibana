/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { errors as EsErrors } from '@elastic/elasticsearch';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
  QueryDslQueryContainer,
  StoredScript,
} from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import {
  CAI_NUMBER_OF_SHARDS,
  CAI_AUTO_EXPAND_REPLICAS,
  CAI_REFRESH_INTERVAL,
  CAI_INDEX_MODE,
  CAI_DEFAULT_TIMEOUT,
} from './constants';
import { fullJitterBackoffFactory } from '../common/retry_service/full_jitter_backoff';
import { scheduleCAIBackfillTask } from './tasks/backfill_task';
import { CasesAnalyticsRetryService } from './retry_service';

interface AnalyticsIndexParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName: string;
  isServerless: boolean;
  mappings: MappingTypeMapping;
  painlessScript: StoredScript;
  painlessScriptId: string;
  sourceIndex: string;
  sourceQuery: QueryDslQueryContainer;
  taskId: string;
  taskManager: TaskManagerStartContract;
}

export class AnalyticsIndex {
  private readonly logger: Logger;
  private readonly indexName: string;
  private readonly esClient: ElasticsearchClient;
  private readonly mappings: MappingTypeMapping;
  private readonly indexSettings?: IndicesIndexSettings;
  private readonly painlessScriptId: string;
  private readonly painlessScript: StoredScript;
  private readonly retryService: CasesAnalyticsRetryService;
  private readonly taskManager: TaskManagerStartContract;
  private readonly taskId: string;
  private readonly sourceIndex: string;
  private readonly sourceQuery: QueryDslQueryContainer;

  constructor({
    logger,
    esClient,
    isServerless,
    indexName,
    mappings,
    painlessScriptId,
    painlessScript,
    taskManager,
    taskId,
    sourceIndex,
    sourceQuery,
  }: AnalyticsIndexParams) {
    this.logger = logger;
    this.esClient = esClient;
    this.indexName = indexName;
    this.mappings = mappings;
    this.painlessScriptId = painlessScriptId;
    this.painlessScript = painlessScript;
    this.taskManager = taskManager;
    this.taskId = taskId;
    this.sourceIndex = sourceIndex;
    this.sourceQuery = sourceQuery;
    this.indexSettings = {
      // settings are not supported on serverless ES
      ...(isServerless
        ? {}
        : {
            number_of_shards: CAI_NUMBER_OF_SHARDS,
            auto_expand_replicas: CAI_AUTO_EXPAND_REPLICAS,
            refresh_interval: CAI_REFRESH_INTERVAL,
            mode: CAI_INDEX_MODE,
          }),
    };
    /**
     * We should wait at least 5ms before retrying and no more that 2sec
     */
    const backOffFactory = fullJitterBackoffFactory({ baseDelay: 5, maxBackoffTime: 2000 });
    this.retryService = new CasesAnalyticsRetryService(this.logger, backOffFactory);
  }

  public async upsertIndex() {
    try {
      await this.retryService.retryWithBackoff(() => this._upsertIndex());
    } catch (error) {
      // We do not throw because errors should not break execution
      this.logger.error(
        `[${this.indexName}] Failed to create index. Error message: ${error.message}`
      );
    }
  }

  private async _upsertIndex() {
    try {
      const indexExists = await this.indexExists();

      if (!indexExists) {
        this.logger.debug(`[${this.indexName}] Index does not exist. Creating.`);
        await this.createIndexMapping();
      } else {
        this.logger.debug(`[${this.indexName}] Index exists. Updating mapping.`);
        await this.updateIndexMapping();
      }
    } catch (error) {
      this.handleError('Failed to create the index.', error);
    }
  }

  private async updateIndexMapping() {
    try {
      const shouldUpdateMapping = await this.shouldUpdateMapping();

      if (shouldUpdateMapping) {
        await this.updateMapping();
      } else {
        this.logger.debug(`[${this.indexName}] Mapping version is up to date. Skipping update.`);
      }
    } catch (error) {
      this.handleError('Failed to update the index mapping.', error);
    }
  }

  private async getCurrentMapping() {
    return this.esClient.indices.getMapping({
      index: this.indexName,
    });
  }

  private async updateMapping() {
    this.logger.debug(`[${this.indexName}] Updating the painless script.`);
    await this.putScript();

    this.logger.debug(`[${this.indexName}] Updating index mapping.`);
    await this.esClient.indices.putMapping({
      index: this.indexName,
      ...this.mappings,
    });

    this.logger.debug(`[${this.indexName}] Scheduling the backfill task.`);
    await this.scheduleBackfillTask();
  }

  private async createIndexMapping() {
    this.logger.debug(`[${this.indexName}] Creating painless script.`);
    await this.putScript();

    this.logger.debug(`[${this.indexName}] Creating index.`);
    await this.esClient.indices.create({
      index: this.indexName,
      timeout: CAI_DEFAULT_TIMEOUT,
      mappings: this.mappings,
      settings: {
        index: this.indexSettings,
      },
    });

    this.logger.debug(`[${this.indexName}] Scheduling the backfill task.`);
    await this.scheduleBackfillTask();
  }

  private async indexExists(): Promise<boolean> {
    this.logger.debug(`[${this.indexName}] Checking if index exists.`);
    return this.esClient.indices.exists({
      index: this.indexName,
    });
  }

  private async shouldUpdateMapping(): Promise<boolean> {
    const currentMapping = await this.getCurrentMapping();
    return (
      currentMapping[this.indexName].mappings._meta?.mapping_version <
      this.mappings._meta?.mapping_version
    );
  }

  private handleError(message: string, error: EsErrors.ElasticsearchClientError) {
    this.logger.error(`[${this.indexName}] ${message} Error message: ${error.message}`);
    this.logger.error(error.message);

    throw error;
  }

  private async putScript() {
    await this.esClient.putScript({
      id: this.painlessScriptId,
      script: this.painlessScript,
    });
  }

  private async scheduleBackfillTask() {
    await scheduleCAIBackfillTask({
      taskId: this.taskId,
      sourceIndex: this.sourceIndex,
      sourceQuery: this.sourceQuery,
      destIndex: this.indexName,
      taskManager: this.taskManager,
      logger: this.logger,
    });
  }
}
