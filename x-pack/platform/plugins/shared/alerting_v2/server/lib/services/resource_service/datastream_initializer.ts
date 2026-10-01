/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamClient, type DataStreamDefinition } from '@kbn/data-streams';
import type { Logger } from '@kbn/logging';
import { isResponseError } from '@kbn/es-errors';
import type { ResourceDefinition } from '../../../resources/datastreams/types';
import { EsUnacknowledgedError } from '../retry_service/es_unacknowledged_error';
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
  ) {
    const { dataStreamName, forceReset, version } = resourceDefinition;
    if (forceReset && forceReset.version >= version) {
      throw new Error(
        `Data stream ${dataStreamName}: forceReset.version (${forceReset.version}) must be below version (${version})`
      );
    }
  }

  public async initialize(): Promise<void> {
    // The template references the pipeline, so it must exist first.
    await this.installIngestPipeline();

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
          'index.final_pipeline': this.resourceDefinition.finalPipeline.id,
        },
        _meta: {
          managed: true,
          description: `${this.resourceDefinition.dataStreamName} index template`,
        },
      },
    };

    await this.resetOutdatedDataStream(dataStreamDefinition);

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

    await this.updateExistingIndicesFinalPipeline();
    await this.updateExistingIndicesReplicaSettings();
  }

  /**
   * Deletes the data stream when it was created from an index template at or below
   * `forceReset.version`, so `DataStreamClient.initialize` recreates it from the current one.
   * Elasticsearch copies the template `_meta` into the data stream only at creation, so
   * installing the current template does not change the outcome of this check.
   */
  private async resetOutdatedDataStream(
    dataStreamDefinition: DataStreamDefinition<ResourceDefinition['mappings']>
  ): Promise<void> {
    const { dataStreamName, forceReset, version } = this.resourceDefinition;
    if (!forceReset) {
      return;
    }

    const dataStream = await this.getExistingDataStream();
    if (!dataStream) {
      return;
    }

    const createdFromVersion = dataStream._meta?.version;
    if (typeof createdFromVersion === 'number' && createdFromVersion > forceReset.version) {
      return;
    }

    // Nodes still running an outdated version keep writing, and a write after the delete
    // recreates the data stream from whichever template is installed at that moment.
    await this.installCurrentIndexTemplate(dataStreamDefinition);

    const createdFrom = createdFromVersion ?? '(unknown)';
    this.logger.warn(
      `Deleting data stream ${dataStreamName} created from index template v${createdFrom}: data streams created from v${forceReset.version} or below are recreated from v${version}. Their documents are lost.`
    );

    try {
      await this.esClient.indices.deleteDataStream({ name: dataStreamName });
    } catch (error) {
      if (!isResponseError(error) || error.statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Installs the current index template while the outdated data stream still exists.
   * `DataStreamClient.initializeTemplate` then applies the template mappings to the existing
   * write index, which fails for the changes that require a reset, so the installed template
   * version decides whether the reset can proceed.
   */
  private async installCurrentIndexTemplate(
    dataStreamDefinition: DataStreamDefinition<ResourceDefinition['mappings']>
  ): Promise<void> {
    const { dataStreamName, version } = this.resourceDefinition;

    let installError: Error | undefined;
    try {
      await DataStreamClient.initializeTemplate({
        logger: this.logger,
        dataStream: dataStreamDefinition,
        elasticsearchClient: this.esClient,
      });
    } catch (error) {
      installError = error;
    }

    const installedVersion = await this.getIndexTemplateVersion();
    if (installedVersion === undefined || installedVersion < version) {
      throw (
        installError ??
        new Error(
          `Index template ${dataStreamName} is at v${
            installedVersion ?? '(none)'
          } instead of v${version}, so its data stream is not reset.`
        )
      );
    }

    if (installError) {
      this.logger.debug(
        `Index template ${dataStreamName} v${installedVersion} is installed; ignoring the failure to update the existing data stream: ${installError.message}`
      );
    }
  }

  private async getIndexTemplateVersion(): Promise<number | undefined> {
    try {
      const { index_templates: indexTemplates } = await this.esClient.indices.getIndexTemplate({
        name: this.resourceDefinition.dataStreamName,
      });
      const deployedVersion = indexTemplates[0]?.index_template._meta?.version;
      return typeof deployedVersion === 'number' ? deployedVersion : undefined;
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  private async getExistingDataStream(): Promise<IndicesDataStream | undefined> {
    try {
      const { data_streams: dataStreams } = await this.esClient.indices.getDataStream({
        name: this.resourceDefinition.dataStreamName,
      });
      return dataStreams[0];
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Installs or upgrades the ingest pipeline, gated on the deployed `version` the same way
   * `@kbn/data-streams` gates index template upgrades.
   */
  private async installIngestPipeline(): Promise<void> {
    const { id, version, processors } = this.resourceDefinition.finalPipeline;

    const deployedVersion = await this.getDeployedPipelineVersion(id);
    if (deployedVersion !== undefined && deployedVersion >= version) {
      this.logger.debug(`Ingest pipeline ${id} v${deployedVersion} already applied and updated.`);
      return;
    }

    const { acknowledged } = await this.esClient.ingest.putPipeline({
      id,
      version,
      processors,
      _meta: { managed: true },
    });
    if (!acknowledged) {
      throw new EsUnacknowledgedError(`install ingest pipeline ${id} v${version}`);
    }
  }

  private async getDeployedPipelineVersion(id: string): Promise<number | undefined> {
    try {
      const response = await this.esClient.ingest.getPipeline({ id });
      return response[id]?.version;
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Applies `index.final_pipeline` to existing backing indices. Producers do not set
   * `@timestamp`, so a backing index without the pipeline would reject every write; unlike
   * the replica patch this failure must block initialization.
   */
  private async updateExistingIndicesFinalPipeline(): Promise<void> {
    const { dataStreamName, finalPipeline } = this.resourceDefinition;
    const { acknowledged } = await this.esClient.indices.putSettings({
      index: dataStreamName,
      settings: { 'index.final_pipeline': finalPipeline.id },
    });
    if (!acknowledged) {
      throw new EsUnacknowledgedError(
        `apply index.final_pipeline to existing ${dataStreamName} indices`
      );
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
