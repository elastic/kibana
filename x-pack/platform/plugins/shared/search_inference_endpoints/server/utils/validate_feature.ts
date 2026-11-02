/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chatCompletionReasoningEfforts } from '@kbn/inference-common';
import type {
  InferenceFeatureConfig,
  RecommendedEndpoint,
  RecommendedEndpointInput,
} from '../types';

export const FEATURE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

const MAX_TEMPERATURE = 2;

const validateModelParameters = ({
  reasoning,
  temperature,
}: NonNullable<RecommendedEndpoint['parameters']>): void => {
  if (
    reasoning?.effort !== undefined &&
    !chatCompletionReasoningEfforts.includes(reasoning.effort)
  ) {
    throw new Error(
      `parameters.reasoning.effort must be one of: ${chatCompletionReasoningEfforts.join(', ')}.`
    );
  }

  if (
    temperature !== undefined &&
    (!Number.isFinite(temperature) || temperature < 0 || temperature > MAX_TEMPERATURE)
  ) {
    throw new Error(`parameters.temperature must be a number between 0 and ${MAX_TEMPERATURE}.`);
  }
};

/**
 * Validates recommended endpoint entries, which can be endpoint ids or `{ id, parameters }` objects.
 *
 * @throws If an entry has an empty or whitespace-only id.
 * @throws If an entry declares invalid model parameters.
 */
export const validateRecommendedEndpoints = (endpoints: RecommendedEndpointInput[]): void => {
  for (const endpoint of endpoints) {
    if (typeof endpoint === 'string') {
      if (!endpoint.trim()) {
        throw new Error('recommendedEndpoints must not contain empty strings.');
      }
    } else {
      if (!endpoint.id.trim()) {
        throw new Error('recommendedEndpoints must not contain entries with an empty id.');
      }
      if (endpoint.parameters) {
        validateModelParameters(endpoint.parameters);
      }
    }
  }
};

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
 * @throws If `recommendedEndpoints` contains an empty id or invalid model parameters.
 */
export const validateFeature = (feature: InferenceFeatureConfig): void => {
  if (!feature.featureId || !FEATURE_ID_PATTERN.test(feature.featureId)) {
    throw new Error(
      'featureId is required and must start with a lowercase letter followed by lowercase alphanumeric characters or underscores.'
    );
  }

  if (feature.parentFeatureId !== undefined && !FEATURE_ID_PATTERN.test(feature.parentFeatureId)) {
    throw new Error(
      'parentFeatureId must start with a lowercase letter followed by lowercase alphanumeric characters or underscores.'
    );
  }

  if (!feature.featureName) {
    throw new Error('featureName is required and must not be empty.');
  }

  if (!feature.featureDescription) {
    throw new Error('featureDescription is required and must not be empty.');
  }

  if (!feature.taskType) {
    throw new Error('taskType is required and must not be empty.');
  }

  if (feature.maxNumberOfEndpoints !== undefined && feature.maxNumberOfEndpoints < 1) {
    throw new Error('maxNumberOfEndpoints must be >= 1 when specified.');
  }

  validateRecommendedEndpoints(feature.recommendedEndpoints);
};
