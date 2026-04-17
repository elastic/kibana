/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIFeatureExtractionEvaluator, ValidKIFeatureType } from '../types';
import { VALID_KI_FEATURE_TYPES, getFeaturesFromOutput } from '../types';

/**
 * Validates that every KI's `type` is one of the valid KI types.
 * Other schema fields (id, description, confidence, etc.) are already enforced
 * by the inference client's tool output schema in the prompt.ts file.
 */
export const typeValidationEvaluator = {
  name: 'type_validation',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const features = getFeaturesFromOutput(output);
    if (features.length === 0) {
      return { score: null, explanation: 'No KI features to validate' };
    }

    const invalidFeatures = features.filter(
      (feature) => !VALID_KI_FEATURE_TYPES.includes(feature.type as unknown as ValidKIFeatureType)
    );

    const score = (features.length - invalidFeatures.length) / features.length;

    return {
      score,
      explanation:
        invalidFeatures.length > 0
          ? `Invalid types: ${invalidFeatures
              .map((feature) => `"${feature.id}" has type "${feature.type}"`)
              .join('; ')} (expected one of: ${VALID_KI_FEATURE_TYPES.join(', ')})`
          : 'All KI features have a valid type',
      details: {
        total: features.length,
        invalidFeatures: invalidFeatures.map((feature) => ({
          id: feature.id,
          type: feature.type,
        })),
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
