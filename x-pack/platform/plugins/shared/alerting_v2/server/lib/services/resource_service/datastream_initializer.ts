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
    await this.maybeDestroyForMigration();
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
   * One-time destructive migration. Runs before DataStreamClient.initialize().
   *
   * Gate 1 (version): if the deployed template version is below `destroyOnVersionBelow`,
   * the mapping is stale and old documents are incompatible with the new schema.
   * Once version >= threshold is deployed this gate is permanently false.
   *
   * Gate 2 (field type): confirms `episode` is still a real object field rather than an
   * alias, guarding against hand-migrations and mapping-read failures (returns false on error).
   */
  private async maybeDestroyForMigration(): Promise<void> {
    const { destroyOnVersionBelow, dataStreamName } = this.resourceDefinition;
    if (destroyOnVersionBelow == null) return;

    // Gate 1: read the deployed template version.
    let deployedVersion: number | undefined;
    try {
      const { index_templates: templates } = await this.esClient.indices.getIndexTemplate({
        name: dataStreamName,
      });
      const rawVersion = templates[0]?.index_template?._meta?.version;
      if (typeof rawVersion === 'number' && rawVersion > 0) {
        deployedVersion = rawVersion;
      }
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) return; // fresh install — nothing to wipe
      this.logger.warn(
        `[alerting_v2] Could not read index template for ${dataStreamName}; skipping migration check: ${error.message}`
      );
      return;
    }

    if (deployedVersion === undefined || deployedVersion >= destroyOnVersionBelow) return;

    // Gate 2: confirm the data stream still has the legacy `episode` object field.
    if (!(await this.hasLegacyEpisodeObjectField(dataStreamName))) {
      this.logger.info(
        `[alerting_v2] ${dataStreamName}: template v${deployedVersion} < v${destroyOnVersionBelow} ` +
          `but episode field is not a legacy object; skipping wipe.`
      );
      return;
    }

    this.logger.warn(
      `[alerting_v2] ${dataStreamName}: one-time destructive migration — ` +
        `deployed template v${deployedVersion} predates the episode→alert field rename (v${destroyOnVersionBelow}). ` +
        `Wiping data stream; all rule-events history is lost. ` +
        `This fires exactly once; subsequent restarts skip this path. ` +
        `To trigger manually: POST /internal/alerting/v2/_reset_data_streams`
    );

    try {
      await this.esClient.indices.deleteDataStream({ name: dataStreamName });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) return; // another Kibana node already wiped
      throw error;
    }

    this.logger.info(
      `[alerting_v2] ${dataStreamName} wiped. Reinitializing with v${this.resourceDefinition.version} schema.`
    );
  }

  private async hasLegacyEpisodeObjectField(dataStreamName: string): Promise<boolean> {
    try {
      const response = await this.esClient.indices.getMapping({ index: dataStreamName });
      for (const index of Object.values(response)) {
        const props = index.mappings?.properties;
        if (props && 'episode' in props) {
          const episode = props.episode;
          if (episode && 'properties' in episode) return true;
        }
      }
      return false;
    } catch {
      // Can't confirm legacy mapping — err on the side of not wiping.
      return false;
    }
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
