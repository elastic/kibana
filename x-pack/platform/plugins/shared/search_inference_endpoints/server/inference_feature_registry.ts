/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import type { InferenceFeatureConfig } from './types';
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
   * @throws If a feature with the same `featureId` is already registered.
   * @throws If the feature fails validation (see {@link validateFeature}).
   * @throws If `parentFeatureId` is set but the referenced parent is not yet registered.
   */
  register(feature: InferenceFeatureConfig): void {
    validateFeature(feature);

    if (this.features.has(feature.featureId)) {
      throw new Error(
        i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.duplicateFeature', {
          defaultMessage: 'Feature with id {featureId} is already registered.',
          values: { featureId: feature.featureId },
        })
      );
    }

    if (feature.parentFeatureId !== undefined && !this.features.has(feature.parentFeatureId)) {
      throw new Error(
        i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.parentFeatureNotFound', {
          defaultMessage:
            'parentFeatureId "{parentFeatureId}" referenced by feature "{featureId}" does not exist.',
          values: {
            parentFeatureId: feature.parentFeatureId,
            featureId: feature.featureId,
          },
        })
      );
    }

    this.features.set(feature.featureId, cloneDeep(feature));
  }

  /**
   * Returns a deep copy of all registered features.
   *
   * @returns An array of all registered {@link InferenceFeatureConfig} entries.
   */
  getAll(): InferenceFeatureConfig[] {
    return cloneDeep([...this.features.values()]);
  }

  /**
   * Returns a deep copy of a single feature by its ID, or `undefined` if not found.
   *
   * @param featureId - The ID of the feature to retrieve.
   * @returns The matching {@link InferenceFeatureConfig}, or `undefined`.
   */
  get(featureId: string): InferenceFeatureConfig | undefined {
    const feature = this.features.get(featureId);
    return feature ? cloneDeep(feature) : undefined;
  }
}
