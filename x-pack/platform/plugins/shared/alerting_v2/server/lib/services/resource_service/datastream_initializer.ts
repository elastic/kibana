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

    try {
      await DataStreamClient.initialize({
        logger: this.logger,
        dataStream: this.buildDataStreamDefinition(),
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
   * Installs the current-version index template before the data stream is deleted or wiped.
   *
   * `DataStreamClient.initializeTemplate` PUTs the template and then tries to apply
   * `putMapping` to the existing write index. When the write index still has v6 mappings,
   * ES rejects the `putMapping` (cannot convert a real object field to an alias in place).
   * That error is expected and caught here; the important outcome is the template PUT.
   *
   * Rather than inspecting the error shape (which ES may change across versions), we verify
   * the result by re-reading the template version. If the version is current, any error from
   * `putMapping` is discarded and we return. If the PUT itself failed, we rethrow so the
   * caller aborts rather than deleting the stream with a stale template.
   *
   * Once the current template is in place, any gap write (from any node or version) that
   * triggers an auto-create will use this template rather than rebuilding from the old shape.
   */
  public async installTemplate(): Promise<void> {
    let caughtError: unknown;

    try {
      await DataStreamClient.initializeTemplate({
        logger: this.logger,
        dataStream: this.buildDataStreamDefinition(),
        elasticsearchClient: this.esClient,
      });
    } catch (error) {
      this.logger.debug(
        `[alerting_v2] installTemplate: initializeTemplate threw for ` +
          `${this.resourceDefinition.dataStreamName} — verifying template version: ` +
          `${error instanceof Error ? error.message : String(error)}`
      );
      caughtError = error;
    }

    // Verify the template was installed. We don't inspect the error because the ES error
    // shape (status code, type) can change across releases.
    const { index_templates: templates } = await this.esClient.indices.getIndexTemplate({
      name: this.resourceDefinition.dataStreamName,
    });
    const rawVersion = templates[0]?.index_template?._meta?.version;
    const installedVersion = typeof rawVersion === 'number' ? rawVersion : -1;

    if (installedVersion >= this.resourceDefinition.version) {
      // Template is current. Any error was the expected putMapping rejection, not a PUT failure.
      return;
    }

    // Template was not installed — the PUT itself must have failed. Abort.
    if (caughtError !== undefined) {
      throw caughtError;
    }
    throw new Error(
      `[alerting_v2] Template for ${this.resourceDefinition.dataStreamName} reports ` +
        `version ${installedVersion < 0 ? '(none)' : installedVersion} after install attempt, ` +
        `expected >= ${this.resourceDefinition.version}`
    );
  }

  private buildDataStreamDefinition(): DataStreamDefinition<
    typeof this.resourceDefinition.mappings
  > {
    return {
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
  }

  /**
   * One-time destructive migration. Runs before DataStreamClient.initialize().
   *
   * Reads the live mapping and checks whether `episode.id` is still a real object field.
   * If so, the data stream is wiped: converting a real object field to an alias cannot be
   * done in place (ES rejects the mapping change) and @kbn/data-streams never rolls over.
   *
   * The check is mapping-shape-based rather than version-based so that it remains correct
   * even if another PR increments the template version before this migration ships.
   * It is idempotent: once `episode.id` is an alias the gate never fires again.
   *
   * Skips safely on errors (returns false), including fresh installs where neither the
   * template nor the data stream exists yet.
   */
  private async maybeDestroyForMigration(): Promise<void> {
    const { episodeToAlertMigration, dataStreamName } = this.resourceDefinition;
    if (!episodeToAlertMigration) return;

    // Read the deployed template version for logging and for fast-path on fresh install.
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

    // Check the live mapping: if episode.id is already an alias the migration already ran.
    if (!(await this.hasLegacyEpisodeObjectField(dataStreamName))) {
      this.logger.info(
        `[alerting_v2] ${dataStreamName}: episode.id is already an alias field; migration already ran, skipping wipe.`
      );
      return;
    }

    this.logger.warn(
      `[alerting_v2] ${dataStreamName}: one-time destructive migration — ` +
        `episode.id is a real object field in the deployed template (v${
          deployedVersion ?? 'unknown'
        }), ` +
        `predating the episode→alert field rename. ` +
        `Wiping data stream; all rule-events history is lost. ` +
        `This fires exactly once; subsequent restarts skip this path. ` +
        `To trigger manually: POST /internal/alerting/v2/_reset_data_streams`
    );

    // Install the current template before deleting the stream. Any gap write from any
    // node or version that occurs between the delete and the subsequent initialize() call
    // will auto-create the stream from this template rather than rebuilding the old shape.
    await this.installTemplate();

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
          if (episode && 'properties' in episode) {
            // A post-migration mapping keeps `episode.*` as alias fields pointing at
            // `alert.*`. If `episode.id` is already an alias, the migration already
            // ran and we must not wipe again.
            const idField = episode.properties?.id;
            if (idField && 'type' in idField && idField.type === 'alias') return false;
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        // The stream was already wiped by another Kibana node; no legacy mapping to find.
        return false;
      }
      this.logger.warn(
        `[alerting_v2] Could not read mapping for ${dataStreamName}; skipping episode→alert wipe. ` +
          `Trigger POST /internal/alerting/v2/_reset_data_streams if rule-events data looks stale: ${error.message}`
      );
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
