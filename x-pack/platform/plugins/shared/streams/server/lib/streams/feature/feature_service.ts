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
import { FeatureTypeRegistry } from './feature_type_registry';
import { FEATURE_TYPE } from './fields';

export class FeatureService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger,
    private readonly featureRegistry: FeatureTypeRegistry
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<FeatureClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<FeatureStorageSettings, StoredFeature>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('features'),
      featureStorageSettings,
      {
        migrateSource: (feature: Record<string, unknown>) => {
          if (!(FEATURE_TYPE in feature)) {
            return {
              ...feature,
              [FEATURE_TYPE]: 'system',
            } as StoredFeature;
          }

          return feature as unknown as StoredFeature;
        },
      }
    );

    return new FeatureClient(
      {
        storageClient: adapter.getClient(),
      },
      this.featureRegistry
    );
  }
}
