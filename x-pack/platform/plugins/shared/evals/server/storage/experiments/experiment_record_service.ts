/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { ExperimentRecordClient, type ExperimentsStorageAdapter } from './experiment_record_client';
import {
  experimentsStorageSettings,
  type ExperimentRecordStorageProperties,
} from './experiments_storage';

export class ExperimentRecordService {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly isServerless: boolean
  ) {}

  /**
   * A client scoped to `spaceId`. Required rather than defaulted so a new call
   * site has to state which space it is acting in.
   */
  getClient({ spaceId }: { spaceId: string }): ExperimentRecordClient {
    return new ExperimentRecordClient({
      storageAdapter: this.createStorageAdapter(),
      logger: this.logger,
      spaceId,
    });
  }

  private createStorageAdapter(): ExperimentsStorageAdapter {
    return new StorageIndexAdapter<
      typeof experimentsStorageSettings,
      ExperimentRecordStorageProperties
    >(this.esClient, this.logger, experimentsStorageSettings, {
      isServerless: this.isServerless,
    });
  }
}
