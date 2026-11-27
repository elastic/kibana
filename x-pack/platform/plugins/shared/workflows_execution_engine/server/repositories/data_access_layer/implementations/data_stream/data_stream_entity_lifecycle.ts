/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { DataStreamDataClient } from './data_stream_data_client';
import { DataStreamMetadataManager } from './data_stream_metadata_manager';
import { DocumentVersionManager } from './document_version_manager';
import { createRetryingEsClient } from '../../../../lib/create_retrying_es_client';
import type { DataClient, EntityLifecycle } from '../../types';

export interface DataStreamEntityDefinition {
  name: string;
  version: number;
  hidden: boolean;
  settings: {
    auto_expand_replicas: string;
    'index.lifecycle.prefer_ilm': boolean;
  };
  mappings: MappingsDefinition;
}

export interface DataStreamEntityLifecycleDeps<TDoc extends { id: string }> {
  logger: Logger;
  dataRetention: string;
  definition: DataStreamEntityDefinition;
  dateField: keyof TDoc & string;
  additionalIndexesToQuery: string[];
}

/** Lifecycle for one data-stream execution entity. Setup registers the stream; start initializes it. */
export class DataStreamEntityLifecycle<TDoc extends { id: string }>
  implements EntityLifecycle<DataClient<TDoc>>
{
  private esClient: ElasticsearchClient | undefined;
  private metadataManager: DataStreamMetadataManager | undefined;

  constructor(private readonly deps: DataStreamEntityLifecycleDeps<TDoc>) {}

  async initSetup(coreSetup: CoreSetup): Promise<void> {
    const { definition, dataRetention } = this.deps;
    coreSetup.dataStreams.registerDataStream({
      name: definition.name,
      version: definition.version,
      hidden: definition.hidden,
      template: {
        mappings: definition.mappings,
        settings: definition.settings,
        lifecycle: { data_retention: dataRetention },
      },
    });
  }

  async initStart(coreStart: CoreStart): Promise<void> {
    await coreStart.dataStreams.initializeClient(this.deps.definition.name);

    this.esClient = createRetryingEsClient(
      coreStart.elasticsearch.client.asInternalUser,
      this.deps.logger
    );
    this.metadataManager = new DataStreamMetadataManager({
      esClient: this.esClient,
      dataStreamName: this.deps.definition.name,
      logger: this.deps.logger,
    });
    await this.metadataManager.init();
  }

  async stop(): Promise<void> {
    this.metadataManager?.dispose();
  }

  createClient(): DataClient<TDoc> {
    const { esClient, metadataManager } = this;
    if (!esClient || !metadataManager) {
      throw new Error(
        'DataStreamEntityLifecycle.initStart() must complete before creating clients'
      );
    }

    return new DataStreamDataClient<TDoc>({
      esClient,
      dataStreamName: this.deps.definition.name,
      versionManager: new DocumentVersionManager({
        esClient,
        dataStreamName: this.deps.definition.name,
        metadataManager,
        additionalIndexesToQuery: this.deps.additionalIndexesToQuery,
      }),
      metadataManager,
      additionalIndexesToQuery: this.deps.additionalIndexesToQuery,
      logger: this.deps.logger,
      dateField: this.deps.dateField,
    });
  }
}
