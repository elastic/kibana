/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceFeatureConfig, RegisterResult } from './types';
import { validateFeature } from './utils/validate_feature';

/**
 * Registry for inference features. Features can be registered and queried at any time.
 */
export class InferenceFeatureRegistry {
  private features: Map<string, InferenceFeatureConfig> = new Map();

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
      return { ok: false, error: e.message };
    }

    if (this.features.has(feature.featureId)) {
      return { ok: false, error: `Feature with id "${feature.featureId}" is already registered.` };
    }

    if (feature.parentFeatureId !== undefined && !this.features.has(feature.parentFeatureId)) {
      return {
        ok: false,
        error: `parentFeatureId "${feature.parentFeatureId}" referenced by feature "${feature.featureId}" does not exist.`,
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
