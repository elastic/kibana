/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceFeatureConfig, RegisterResult } from './types';
import { validateFeature } from './utils/validate_feature';

/**
 * Registry for inference features. Features can be registered and queried at any time.
 */
export class InferenceFeatureRegistry {
  private features: Map<string, InferenceFeatureConfig> = new Map();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Registers a new inference feature in the registry.
   *
   * @param feature - The feature configuration to register.
   * @returns `{ ok: true }` on success, or `{ ok: false, error }` if validation fails or the feature is a duplicate.
   */
  register(feature: InferenceFeatureConfig): RegisterResult {
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

    this.features.set(feature.featureId, feature);
    return { ok: true };
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
}
