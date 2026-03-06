/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import type { InferenceFeatureConfig } from './types';
import { validateFeature, validateFeatures } from './utils/validate_feature';

/**
 * Registry for inference features. Features can be registered during plugin setup
 * and queried after the registry is locked during plugin start.
 */
export class InferenceFeatureRegistry {
  private locked = false;
  private features: Map<string, InferenceFeatureConfig> = new Map();

  /**
   * Registers a new inference feature in the registry.
   *
   * @param feature - The feature configuration to register.
   * @throws If the registry is already locked.
   * @throws If a feature with the same `featureId` is already registered.
   * @throws If the feature fails validation (see {@link validateFeature}).
   */
  register(feature: InferenceFeatureConfig): void {
    if (this.locked) {
      throw new Error(
        i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.registryLocked', {
          defaultMessage:
            "Inference features are locked, can't register new features. Attempt to register {featureId} failed.",
          values: { featureId: feature.featureId },
        })
      );
    }

    validateFeature(feature);

    if (this.features.has(feature.featureId)) {
      throw new Error(
        i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.duplicateFeature', {
          defaultMessage: 'Feature with id {featureId} is already registered.',
          values: { featureId: feature.featureId },
        })
      );
    }

    this.features.set(feature.featureId, cloneDeep(feature));
  }

  /**
   * Locks the registry, preventing any further feature registrations.
   * Must be called before features can be queried or validated.
   */
  lockRegistration(): void {
    this.locked = true;
  }

  /**
   * Validates cross-feature constraints after the registry is locked.
   *
   * @throws If the registry is not locked.
   * @throws If a feature references a `parentFeatureId` that does not exist.
   * @throws If a feature's `recommendedEndpoints` count exceeds its `maxNumberOfEndpoints`.
   */
  validateFeatures(): void {
    if (!this.locked) {
      throw new Error(
        i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.validateNotLocked', {
          defaultMessage:
            'Cannot validate features while the registry is not locked and still allows further feature registrations.',
        })
      );
    }

    validateFeatures(this.features);
  }

  /**
   * Returns a deep copy of all registered features.
   *
   * @throws If the registry is not locked.
   * @returns An array of all registered {@link InferenceFeatureConfig} entries.
   */
  getAll(): InferenceFeatureConfig[] {
    this.ensureLocked('getAll');
    return cloneDeep([...this.features.values()]);
  }

  /**
   * Returns a deep copy of a single feature by its ID, or `undefined` if not found.
   *
   * @param featureId - The ID of the feature to retrieve.
   * @throws If the registry is not locked.
   * @returns The matching {@link InferenceFeatureConfig}, or `undefined`.
   */
  get(featureId: string): InferenceFeatureConfig | undefined {
    this.ensureLocked('get');
    const feature = this.features.get(featureId);
    return feature ? cloneDeep(feature) : undefined;
  }

  /**
   * Guards read operations by ensuring the registry is locked.
   *
   * @param method - Name of the calling method, included in the error message.
   * @throws If the registry is not locked.
   */
  private ensureLocked(method: string): void {
    if (!this.locked) {
      throw new Error(
        i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.notLocked', {
          defaultMessage: 'Cannot call {method} while the registry is not locked.',
          values: { method },
        })
      );
    }
  }
}
