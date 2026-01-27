/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { FeatureClient } from './feature_client';
import type { StoredFeature } from './stored_feature';
import type { FeatureStorageSettings } from './storage_settings';
import { featureStorageSettings } from './storage_settings';

export class FeatureService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<FeatureClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<FeatureStorageSettings, StoredFeature>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('features'),
      featureStorageSettings
    );

    return new FeatureClient({
      storageClient: adapter.getClient(),
    });
  }
}
