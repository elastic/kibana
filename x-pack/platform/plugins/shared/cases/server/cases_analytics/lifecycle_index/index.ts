/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Owner } from '../../../common/constants/types';
import {
  CAI_NUMBER_OF_SHARDS,
  CAI_AUTO_EXPAND_REPLICAS,
  CAI_REFRESH_INTERVAL,
  CAI_DEFAULT_TIMEOUT,
} from '../constants';
import {
  getLifecycleDestinationIndexName,
  getLifecycleDestinationIndexAlias,
  getLifecycleTransformId,
  CAI_LIFECYCLE_INDEX_VERSION,
} from './constants';
import { CAI_LIFECYCLE_INDEX_MAPPINGS } from './mappings';
import { getLifecycleTransformConfig } from './transform';

interface LifecycleTransformParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  spaceId: string;
  owner: Owner;
}

/**
 * Manages the lifecycle transform — an ES continuous transform that pivots
 * activity-index events into per-case lifecycle metrics (time-to-close,
 * counts, etc.).
 */
export class LifecycleTransform {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly isServerless: boolean;
  private readonly spaceId: string;
  private readonly owner: Owner;
  private readonly indexName: string;
  private readonly indexAlias: string;
  private readonly transformId: string;

  constructor({ esClient, logger, isServerless, spaceId, owner }: LifecycleTransformParams) {
    this.esClient = esClient;
    this.logger = logger;
    this.isServerless = isServerless;
    this.spaceId = spaceId;
    this.owner = owner;
    this.indexName = getLifecycleDestinationIndexName(spaceId, owner);
    this.indexAlias = getLifecycleDestinationIndexAlias(spaceId, owner);
    this.transformId = getLifecycleTransformId(spaceId, owner);
  }

  /**
   * Idempotent: creates the destination index + transform if they don't exist,
   * then ensures the transform is started.
   */
  public async upsert(): Promise<void> {
    try {
      await this.upsertDestinationIndex();
      await this.upsertTransform();
      await this.startTransform();
    } catch (error) {
      this.logger.error(
        `[${this.transformId}] Failed to upsert lifecycle transform. Error: ${error.message}`
      );
    }
  }

  private async upsertDestinationIndex(): Promise<void> {
    const exists = await this.esClient.indices.exists({ index: this.indexName });

    if (exists) {
      this.logger.debug(`[${this.transformId}] Destination index already exists.`);
      return;
    }

    const mappings = { ...CAI_LIFECYCLE_INDEX_MAPPINGS };
    mappings._meta = { mapping_version: CAI_LIFECYCLE_INDEX_VERSION };

    await this.esClient.indices.create({
      index: this.indexName,
      timeout: CAI_DEFAULT_TIMEOUT,
      mappings,
      settings: {
        index: {
          hidden: true,
          ...(this.isServerless
            ? {}
            : {
                number_of_shards: CAI_NUMBER_OF_SHARDS,
                auto_expand_replicas: CAI_AUTO_EXPAND_REPLICAS,
                refresh_interval: CAI_REFRESH_INTERVAL,
              }),
        },
      },
      aliases: {
        [this.indexAlias]: {
          is_write_index: true,
        },
      },
    });

    this.logger.info(`[${this.transformId}] Created lifecycle destination index.`);
  }

  private async upsertTransform(): Promise<void> {
    const transformExists = await this.transformExists();
    const config = getLifecycleTransformConfig(this.spaceId, this.owner);

    if (transformExists) {
      // Check if the stored version matches the desired version; update if not.
      const existingVersion = await this.getStoredTransformVersion();
      const desiredVersion = CAI_LIFECYCLE_INDEX_VERSION;

      if (existingVersion === desiredVersion) {
        this.logger.debug(`[${this.transformId}] Transform already exists at current version.`);
        return;
      }

      this.logger.info(
        `[${this.transformId}] Transform version mismatch (stored=${existingVersion}, desired=${desiredVersion}). Recreating.`
      );
      await this.esClient.transform.stopTransform({
        transform_id: this.transformId,
        wait_for_completion: true,
        force: true,
        allow_no_match: true,
      });
      await this.esClient.transform.deleteTransform({ transform_id: this.transformId });
    }

    await this.esClient.transform.putTransform(config);
    this.logger.info(`[${this.transformId}] Created lifecycle transform.`);
  }

  private async getStoredTransformVersion(): Promise<number | undefined> {
    try {
      const response = await this.esClient.transform.getTransform({
        transform_id: this.transformId,
      });
      const meta = response.transforms?.[0]?._meta as Record<string, unknown> | undefined;
      const ver = meta?.version;
      return typeof ver === 'number' ? ver : undefined;
    } catch {
      return undefined;
    }
  }

  private async startTransform(): Promise<void> {
    try {
      const stats = await this.esClient.transform.getTransformStats({
        transform_id: this.transformId,
      });

      const state = stats.transforms?.[0]?.state;

      if (state === 'started' || state === 'indexing') {
        this.logger.debug(`[${this.transformId}] Transform is already running (state=${state}).`);
        return;
      }

      const lastCheckpoint = stats.transforms?.[0]?.checkpointing?.last?.checkpoint ?? 0;
      // On the very first start (no previous checkpoint), scan from epoch so
      // that all existing activity documents are included in the first run.
      const from = lastCheckpoint === 0 ? '1970-01-01T00:00:00Z' : undefined;

      await this.esClient.transform.startTransform({
        transform_id: this.transformId,
        ...(from ? { from } : {}),
      });
      this.logger.info(
        `[${this.transformId}] Started lifecycle transform${from ? ' from epoch' : ''}.`
      );
    } catch (error) {
      // If transform was already started between our check and start call, ignore
      if (error.body?.error?.type === 'status_exception') {
        this.logger.debug(`[${this.transformId}] Transform already started (race condition).`);
        return;
      }
      throw error;
    }
  }

  private async transformExists(): Promise<boolean> {
    try {
      await this.esClient.transform.getTransform({ transform_id: this.transformId });
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}

export const createLifecycleAnalyticsTransform = (
  params: LifecycleTransformParams
): LifecycleTransform => new LifecycleTransform(params);
