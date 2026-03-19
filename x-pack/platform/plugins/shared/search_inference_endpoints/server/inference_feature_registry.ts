/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InferenceFeatureConfig, RegisterResult } from './types';
import { validateFeature } from './utils/validate_feature';

/**
 * Registry for inference features. Features can be registered and queried at any time.
 */
export class InferenceFeatureRegistry {
  private features: Map<string, InferenceFeatureConfig> = new Map();
  private readonly logger: Logger;
  private esClient?: ElasticsearchClient;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setElasticsearchClient(client: ElasticsearchClient): void {
    this.esClient = client;
  }

  /**
   * Registers a new inference feature in the registry.
   * Validates the feature config, checks recommended endpoints exist in Elasticsearch,
   * and verifies task type consistency between the feature and its endpoints.
   *
   * @param feature - The feature configuration to register.
   * @returns `{ ok: true, warnings }` on success, or `{ ok: false, error }` if validation fails or the feature is a duplicate.
   */
  async register(feature: InferenceFeatureConfig): Promise<RegisterResult> {
    try {
      validateFeature(feature);
    } catch (e) {
      this.logger.error(`Failed to register inference feature: ${e.message}`);
      return { ok: false, error: e.message };
    }

    if (this.features.has(feature.featureId)) {
      const error = `Feature with id "${feature.featureId}" is already registered.`;
      this.logger.error(`Failed to register inference feature: ${error}`);
      return { ok: false, error };
    }

    if (feature.parentFeatureId !== undefined && !this.features.has(feature.parentFeatureId)) {
      const error = `parentFeatureId "${feature.parentFeatureId}" referenced by feature "${feature.featureId}" does not exist.`;
      this.logger.error(`Failed to register inference feature: ${error}`);
      return {
        ok: false,
        error,
      };
    }

    const warnings = await this.checkRecommendedEndpoints(feature);

    this.features.set(feature.featureId, feature);
    return { ok: true, warnings };
  }

  /**
   * Returns all registered features.
   *
   * @returns An array of all registered {@link InferenceFeatureConfig} entries.
   */
  getAll(): InferenceFeatureConfig[] {
    return [...this.features.values()];
  }

  /**
   * Returns a single feature by its ID, or `undefined` if not found.
   *
   * @param featureId - The ID of the feature to retrieve.
   * @returns The matching {@link InferenceFeatureConfig}, or `undefined`.
   */
  get(featureId: string): InferenceFeatureConfig | undefined {
    return this.features.get(featureId);
  }

  /**
   * Checks that recommended endpoints exist in Elasticsearch and that their
   * task types are consistent with the feature's declared task type.
   */
  private async checkRecommendedEndpoints(feature: InferenceFeatureConfig): Promise<string[]> {
    const esClient = this.esClient;
    if (!esClient || feature.recommendedEndpoints.length === 0) {
      return [];
    }

    const warnings: string[] = [];

    const results = await Promise.all(
      feature.recommendedEndpoints.map(async (endpointId) => {
        try {
          const response = await esClient.inference.get({ inference_id: endpointId });
          return { endpointId, endpoint: response.endpoints[0] ?? null, error: undefined };
        } catch (e) {
          if (e?.statusCode === 404) {
            return { endpointId, endpoint: null, error: undefined };
          }
          this.logger.warn(
            `Failed to check inference endpoint "${endpointId}" for feature "${feature.featureId}": ${e.message}`
          );
          return { endpointId, endpoint: null, error: e.message as string };
        }
      })
    );

    for (const { endpointId, endpoint, error } of results) {
      if (error) {
        const warning = `Recommended endpoint "${endpointId}" for feature "${feature.featureId}" could not be verified: ${error}`;
        this.logger.warn(warning);
        warnings.push(warning);
      } else if (!endpoint) {
        const warning = `Recommended endpoint "${endpointId}" for feature "${feature.featureId}" was not found in Elasticsearch.`;
        this.logger.warn(warning);
        warnings.push(warning);
      } else if (endpoint.task_type !== feature.taskType) {
        const warning = `Recommended endpoint "${endpointId}" has task type "${endpoint.task_type}" but feature "${feature.featureId}" expects "${feature.taskType}".`;
        this.logger.warn(warning);
        warnings.push(warning);
      }
    }

    return warnings;
  }
}
