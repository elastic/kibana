/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { INFERENCE_SETTINGS_SO_TYPE, INFERENCE_SETTINGS_ID } from '../common/constants';
import type { InferenceSettingsAttributes } from '../common/types';
import type { InferenceFeatureRegistry } from './inference_feature_registry';

export class InferenceEndpoints {
  constructor(
    private readonly registry: InferenceFeatureRegistry,
    private readonly soRepo: ISavedObjectsRepository,
    private readonly esClient: ElasticsearchClient
  ) {}

  /**
   * Returns the resolved inference endpoints for a feature.
   * Walks the fallback chain (admin SO override → recommendedEndpoints → parent feature)
   * and fetches full endpoint objects from Elasticsearch.
   *
   * @param featureId - The feature to resolve endpoints for.
   * @throws If `featureId` is not registered.
   */
  async getForFeature(featureId: string): Promise<InferenceInferenceEndpointInfo[]> {
    const endpointIds = await this.resolveEndpointIds(featureId);
    if (endpointIds.length === 0) {
      return [];
    }
    return this.fetchEndpoints(endpointIds);
  }

  private async resolveEndpointIds(featureId: string): Promise<string[]> {
    if (!this.registry.get(featureId)) {
      throw new Error(
        i18n.translate('xpack.searchInferenceEndpoints.endpoints.featureNotFound', {
          defaultMessage: 'Feature with id "{featureId}" is not registered.',
          values: { featureId },
        })
      );
    }

    const soFeatures = await this.readSettingsFeatures();
    const soFeaturesMap = new Map(soFeatures.map((f) => [f.feature_id, f]));

    const visited = new Set<string>();
    let currentId = featureId;

    while (!visited.has(currentId)) {
      visited.add(currentId);
      const current = this.registry.get(currentId);
      if (!current) {
        break;
      }

      const soEntry = soFeaturesMap.get(currentId);
      if (soEntry && soEntry.endpoints.length > 0) {
        return soEntry.endpoints.map((e) => e.id);
      }

      if (current.recommendedEndpoints.length > 0) {
        return current.recommendedEndpoints;
      }

      if (current.parentFeatureId) {
        currentId = current.parentFeatureId;
      } else {
        break;
      }
    }

    return [];
  }

  private async fetchEndpoints(ids: string[]): Promise<InferenceInferenceEndpointInfo[]> {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const { endpoints } = await this.esClient.inference.get({ inference_id: id });
          return endpoints[0] ?? null;
        } catch (e) {
          if (e?.statusCode === 404) {
            return null;
          }
          throw e;
        }
      })
    );
    return results.filter((ep): ep is InferenceInferenceEndpointInfo => ep !== null);
  }

  private async readSettingsFeatures(): Promise<InferenceSettingsAttributes['features']> {
    try {
      const so = await this.soRepo.get<InferenceSettingsAttributes>(
        INFERENCE_SETTINGS_SO_TYPE,
        INFERENCE_SETTINGS_ID
      );
      return so.attributes.features ?? [];
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return [];
      }
      throw e;
    }
  }
}
