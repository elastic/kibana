/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
  StoredScript,
} from '@elastic/elasticsearch/lib/api/types';
import {
  CAI_NUMBER_OF_SHARDS,
  CAI_AUTO_EXPAND_REPLICAS,
  CAI_REFRESH_INTERVAL,
  CAI_INDEX_MODE,
  CAI_DEFAULT_TIMEOUT,
} from '../constants';

interface AnalyticsIndexFactoryParams {
  logger: Logger;
  isServerless: boolean;
  esClient: ElasticsearchClient;
  indexName: string;
  mappings: MappingTypeMapping;
  painlessScriptId: string;
  painlessScript: StoredScript;
}

export class AnalyticsIndexFactory {
  protected readonly logger: Logger;
  protected readonly indexName: string;
  private readonly esClient: ElasticsearchClient;
  private readonly mappings: MappingTypeMapping;
  private readonly indexSettings?: IndicesIndexSettings;
  private readonly painlessScriptId: string;
  private readonly painlessScript: StoredScript;

  constructor({
    logger,
    esClient,
    isServerless,
    indexName,
    mappings,
    painlessScriptId,
    painlessScript,
  }: AnalyticsIndexFactoryParams) {
    this.logger = logger;
    this.esClient = esClient;
    this.indexName = indexName;
    this.mappings = mappings;
    this.painlessScriptId = painlessScriptId;
    this.painlessScript = painlessScript;
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
  }

  public async createIndex() {
    try {
      const indexExists = await this.indexExists();

      if (!indexExists) {
        this.logger.info(`[${this.indexName}] Index does not exist. Creating.`);
        await this.createIndexMapping();
      } else {
        this.logger.info(`[${this.indexName}] Index exists. Updating mapping.`);
        await this.updateIndexMapping();
      }
    } catch (err) {
      this.logger.error(`[${this.indexName}] Failed to create the index template.`);
      this.logger.error(err.message);
    }
  }

  private async updateIndexMapping() {
    try {
      const shouldUpdateMapping = await this.shouldUpdateMapping();

      if (shouldUpdateMapping) {
        await this.updateMapping();
      } else {
        this.logger.debug(`${this.indexName} mapping version is up to date. Skipping update.`);
      }
    } catch (err) {
      this.logger.error(`[${this.indexName}] Failed to create the index template.`);
      this.logger.error(err.message);
    }
  }

  private async getCurrentMapping() {
    return this.esClient.indices.getMapping({
      index: this.indexName,
    });
  }

  private async updateMapping() {
    this.logger.info(`[${this.indexName}] Updating the painless script.`);
    await this.esClient.putScript({
      id: this.painlessScriptId,
      script: this.painlessScript,
    });

    this.logger.info(`[${this.indexName}] Updating index mapping.`);
    await this.esClient.indices.putMapping({
      index: this.indexName,
      ...this.mappings,
    });

    this.logger.info(`[${this.indexName}] Scheduling the backfill task.`);
    await this.scheduleBackfillTask();
  }

  private async createIndexMapping() {
    this.logger.info(`[${this.indexName}] Creating painless script.`);
    await this.esClient.putScript({
      id: this.painlessScriptId,
      script: this.painlessScript,
    });

    this.logger.info(`[${this.indexName}] Creating index.`);
    await this.esClient.indices.create({
      index: this.indexName,
      timeout: CAI_DEFAULT_TIMEOUT,
      mappings: this.mappings,
      settings: {
        index: this.indexSettings,
      },
    });

    this.logger.info(`[${this.indexName}] Scheduling the backfill task.`);
    await this.scheduleBackfillTask();
  }

  private async indexExists(): Promise<boolean> {
    this.logger.info(`[${this.indexName}] Checking if index exists.`);
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

  // Needs to be implemented by child class
  protected async scheduleBackfillTask() {
    this.logger.error(`[${this.indexName}] scheduleBackfillTask not implemented`);
  }
}
