/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../types';
import { InsightClient } from './insight_client';
import type { StoredInsight } from './stored_insight';
import type { InsightStorageSettings } from './storage_settings';
import { insightStorageSettings } from './storage_settings';

export class InsightService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<InsightClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<InsightStorageSettings, StoredInsight>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('insights'),
      insightStorageSettings
    );

    return new InsightClient({
      storageClient: adapter.getClient(),
    });
  }
}
