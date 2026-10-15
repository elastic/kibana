/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamClient, type DataStreamDefinition } from '@kbn/data-streams';
import type { Logger } from '@kbn/logging';
import { isResponseError } from '@kbn/es-errors';
import type { ResourceDefinition } from '../../../resources/datastreams/types';
import type { IResourceInitializer } from './resource_manager';

const TOTAL_FIELDS_LIMIT = 2500;

// Expand to zero replicas on single-node clusters, where a replica can never
// be allocated and would leave the cluster health permanently yellow.
const AUTO_EXPAND_REPLICAS = '0-1';

// Max Java long. Installing at the highest priority keeps our managed template
// from being rejected for tying with a user template whose patterns overlap
// `.rule-events*` / `.alert-actions*` (ES only rejects overlapping templates at
// equal priority). Stringified to avoid JS number precision loss.
const INDEX_TEMPLATE_PRIORITY = `${9223372036854775807n}` as unknown as number;

export class DatastreamInitializer implements IResourceInitializer {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly resourceDefinition: ResourceDefinition
  ) {}

  public async initialize(): Promise<void> {
    const dataStreamDefinition: DataStreamDefinition<typeof this.resourceDefinition.mappings> = {
      name: this.resourceDefinition.dataStreamName,
      hidden: true,
      version: this.resourceDefinition.version,
      template: {
        aliases: {},
        priority: INDEX_TEMPLATE_PRIORITY,
        mappings: this.resourceDefinition.mappings,
        lifecycle: this.resourceDefinition.lifecycle,
        settings: {
          'index.auto_expand_replicas': AUTO_EXPAND_REPLICAS,
          'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
          'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
          'index.lifecycle.prefer_ilm': false,
        },
        _meta: {
          managed: true,
          description: `${this.resourceDefinition.dataStreamName} index template`,
        },
      },
    };

    try {
      await DataStreamClient.initialize({
        logger: this.logger,
        dataStream: dataStreamDefinition,
        elasticsearchClient: this.esClient,
      });
    } catch (error) {
      if (!isResponseError(error) || error.statusCode !== 409) {
        throw error;
      }

      this.logger.debug(`Data stream already exists: ${this.resourceDefinition.dataStreamName}.`);
    }

    await this.updateExistingIndicesReplicaSettings();
  }

  /**
   * Applies `auto_expand_replicas` to the data stream's existing backing indices: the index
   * template only affects indices created after it was installed, so without this, deployments
   * that created the data stream before the setting was added would keep an unallocatable
   * replica shard until the next rollover.
   */
  private async updateExistingIndicesReplicaSettings(): Promise<void> {
    try {
      await this.esClient.indices.putSettings({
        index: this.resourceDefinition.dataStreamName,
        settings: { 'index.auto_expand_replicas': AUTO_EXPAND_REPLICAS },
      });
    } catch (error) {
      // Best effort: replica expansion only affects cluster health reporting and
      // must not block the initialization of alerting resources.
      this.logger.warn(
        `Failed to update auto_expand_replicas for ${this.resourceDefinition.dataStreamName}: ${error.message}`
      );
    }
  }
}
