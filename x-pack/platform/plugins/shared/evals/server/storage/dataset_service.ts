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
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly isServerless: boolean
  ) {}

  getClient(): DatasetClient {
    const datasetsStorageAdapter = this.createDatasetsStorageAdapter();
    const examplesStorageAdapter = this.createExamplesStorageAdapter();

    return new DatasetClient({
      datasetsStorageAdapter,
      examplesStorageAdapter,
    });
  }

  private createDatasetsStorageAdapter(): DatasetsStorageAdapter {
    return new StorageIndexAdapter<typeof datasetsStorageSettings, DatasetStorageProperties>(
      this.esClient,
      this.logger,
      datasetsStorageSettings,
      { isServerless: this.isServerless }
    );
  }

  private createExamplesStorageAdapter(): DatasetExamplesStorageAdapter {
    return new StorageIndexAdapter<
      typeof datasetExamplesStorageSettings,
      DatasetExampleStorageProperties
    >(this.esClient, this.logger, datasetExamplesStorageSettings, {
      isServerless: this.isServerless,
    });
  }
}
