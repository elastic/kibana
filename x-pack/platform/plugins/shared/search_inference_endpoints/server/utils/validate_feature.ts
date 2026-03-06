/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InferenceFeatureConfig } from '../types';

export const FEATURE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Validates an {@link InferenceFeatureConfig} before registration.
 *
 * @param feature - The feature configuration to validate.
 * @throws If `featureId` is empty or does not match `^[a-z][a-z0-9_]*$`.
 * @throws If `parentFeatureId` is set and does not match `^[a-z][a-z0-9_]*$`.
 * @throws If `featureName` is empty.
 * @throws If `featureDescription` is empty.
 * @throws If `taskType` is empty.
 * @throws If `maxNumberOfEndpoints` is specified and less than 1.
 * @throws If `recommendedEndpoints` contains any empty or whitespace-only string.
 */
export const validateFeature = (feature: InferenceFeatureConfig): void => {
  if (!feature.featureId || !FEATURE_ID_PATTERN.test(feature.featureId)) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.featureIdRequired', {
        defaultMessage:
          'featureId is required and must start with a lowercase letter followed by lowercase alphanumeric characters or underscores.',
      })
    );
  }

  if (feature.parentFeatureId !== undefined && !FEATURE_ID_PATTERN.test(feature.parentFeatureId)) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.parentFeatureIdInvalid', {
        defaultMessage:
          'parentFeatureId must start with a lowercase letter followed by lowercase alphanumeric characters or underscores.',
      })
    );
  }

  if (!feature.featureName) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.featureNameRequired', {
        defaultMessage: 'featureName is required and must not be empty.',
      })
    );
  }

  if (!feature.featureDescription) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.featureDescriptionRequired', {
        defaultMessage: 'featureDescription is required and must not be empty.',
      })
    );
  }

  if (!feature.taskType) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.taskTypeRequired', {
        defaultMessage: 'taskType is required and must not be empty.',
      })
    );
  }

  if (feature.maxNumberOfEndpoints !== undefined && feature.maxNumberOfEndpoints < 1) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.maxEndpointsMinimum', {
        defaultMessage: 'maxNumberOfEndpoints must be >= 1 when specified.',
      })
    );
  }

  if (feature.recommendedEndpoints.some((ep) => !ep.trim())) {
    throw new Error(
      i18n.translate('xpack.searchInferenceEndpoints.featureRegistry.emptyRecommendedEndpoint', {
        defaultMessage: 'recommendedEndpoints must not contain empty strings.',
      })
    );
  }
};

/**
 * Validates cross-feature constraints across all registered features.
 *
 * @param features - The map of registered features keyed by featureId.
 * @throws If a feature references a `parentFeatureId` that does not exist in the map.
 * @throws If a feature's `recommendedEndpoints` count exceeds its `maxNumberOfEndpoints`.
 */
export const validateFeatures = (features: Map<string, InferenceFeatureConfig>): void => {
  for (const feature of features.values()) {
    if (feature.parentFeatureId !== undefined) {
      if (!features.has(feature.parentFeatureId)) {
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
    }

    if (
      feature.maxNumberOfEndpoints !== undefined &&
      feature.recommendedEndpoints.length > feature.maxNumberOfEndpoints
    ) {
      throw new Error(
        i18n.translate(
          'xpack.searchInferenceEndpoints.featureRegistry.tooManyRecommendedEndpoints',
          {
            defaultMessage:
              'Feature "{featureId}" has {count} recommendedEndpoints but maxNumberOfEndpoints is {max}.',
            values: {
              featureId: feature.featureId,
              count: feature.recommendedEndpoints.length,
              max: feature.maxNumberOfEndpoints,
            },
          }
        )
      );
    }
  }
};
