/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import {
  DatasetClient,
  type DatasetExamplesStorageAdapter,
  type DatasetsStorageAdapter,
} from './dataset_client';
import { datasetsStorageSettings, type DatasetStorageProperties } from './datasets_storage';
import {
  datasetExamplesStorageSettings,
  type DatasetExampleStorageProperties,
} from './examples_storage';

export class DatasetService {
  constructor(private readonly logger: Logger) {}

  getClient(esClient: ElasticsearchClient): DatasetClient {
    const datasetsStorageAdapter = this.createDatasetsStorageAdapter(esClient);
    const examplesStorageAdapter = this.createExamplesStorageAdapter(esClient);

    return new DatasetClient({
      datasetsStorageAdapter,
      examplesStorageAdapter,
    });
  }

  private createDatasetsStorageAdapter(esClient: ElasticsearchClient): DatasetsStorageAdapter {
    return new StorageIndexAdapter<typeof datasetsStorageSettings, DatasetStorageProperties>(
      esClient,
      this.logger,
      datasetsStorageSettings
    );
  }

  private createExamplesStorageAdapter(
    esClient: ElasticsearchClient
  ): DatasetExamplesStorageAdapter {
    return new StorageIndexAdapter<
      typeof datasetExamplesStorageSettings,
      DatasetExampleStorageProperties
    >(esClient, this.logger, datasetExamplesStorageSettings);
  }
}
