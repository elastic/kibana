/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { FeatureClient } from './feature_client';
import type { StoredFeature } from './stored_feature';
import { getFeatureStorageSettings } from './storage_settings';
import { FEATURE_ID, FEATURE_PROPERTIES, FEATURE_SUBTYPE, FEATURE_UUID } from './fields';
import { storedFeatureSchema } from './stored_feature';
import type { InferenceResolver } from '../assets/query/helpers/inference_availability';

export class FeatureService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly resolveInference: InferenceResolver,
    private readonly logger: Logger
  ) {}

  async getClient(): Promise<FeatureClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const { inferenceId, available: inferenceAvailable } = await this.resolveInference(esClient);

    const settings = getFeatureStorageSettings(inferenceId);

    const adapter = new StorageIndexAdapter<IndexStorageSettings, StoredFeature>(
      esClient,
      this.logger.get('features'),
      settings,
      {
        migrateSource: (source) => {
          if (!(FEATURE_ID in source)) {
            const migrated: Record<string, unknown> = {
              ...source,
              [FEATURE_ID]: source[FEATURE_UUID],
              [FEATURE_SUBTYPE]: source['feature.name'],
              [FEATURE_PROPERTIES]: source['feature.value'],
            };
            delete migrated['feature.name'];
            delete migrated['feature.value'];

            storedFeatureSchema.parse(migrated);
            return migrated as unknown as StoredFeature;
          }

          return source as unknown as StoredFeature;
        },
      }
    );

    return new FeatureClient(
      {
        storageClient: adapter.getClient(),
        logger: this.logger,
      },
      inferenceAvailable
    );
  }
}
