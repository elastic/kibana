/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { FeatureClient } from './feature_client';
import type { StoredFeature } from './stored_feature';
import {
  featureStorageSettings,
  getFeatureStorageSettings,
  type FeatureStorageSettings,
} from './storage_settings';
import {
  FEATURE_ID,
  FEATURE_PROPERTIES,
  FEATURE_SEARCH_EMBEDDING,
  FEATURE_SUBTYPE,
  FEATURE_UUID,
} from './fields';
import { storedFeatureSchema } from './stored_feature';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../common/sig_events_tuning_config';
import { getInferenceIdFromIndex } from '../helpers/get_inference_id_from_index';

export class FeatureService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClient(
    config: Pick<
      SigEventsTuningConfig,
      'feature_ttl_days' | 'semantic_min_score' | 'rrf_rank_constant'
    > = DEFAULT_SIG_EVENTS_TUNING_CONFIG
  ): Promise<FeatureClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const esClient = coreStart.elasticsearch.client.asInternalUser;

    const existingInferenceId = await getInferenceIdFromIndex(
      esClient,
      featureStorageSettings.name,
      FEATURE_SEARCH_EMBEDDING,
      this.logger
    );

    const storageSettings = getFeatureStorageSettings(existingInferenceId);

    const adapter = new StorageIndexAdapter<FeatureStorageSettings, StoredFeature>(
      esClient,
      this.logger.get('features'),
      storageSettings as FeatureStorageSettings,
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
      config
    );
  }
}
