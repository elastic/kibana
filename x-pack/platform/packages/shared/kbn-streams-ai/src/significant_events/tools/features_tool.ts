/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATASET_ANALYSIS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
  LOG_PATTERNS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
  type Feature,
} from '@kbn/streams-schema';

export const SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES = [
  DATASET_ANALYSIS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
  LOG_PATTERNS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
] as const;

export type SignificantEventsFeatureToolType =
  (typeof SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES)[number];

export interface GetStreamFeaturesInput {
  feature_types?: unknown;
}

export type LlmFeature = Pick<
  Feature,
  'id' | 'type' | 'subtype' | 'title' | 'description' | 'confidence' | 'properties' | 'evidence' | 'tags'
>;

export function resolveFeatureTypeFilters(
  featureTypes?: SignificantEventsFeatureToolType[]
): string[] | undefined {
  if (!featureTypes || featureTypes.length === 0) {
    return undefined;
  }

  return [...new Set(featureTypes)];
}

export function getFeatureTypesFromToolArgs(
  toolArguments: unknown
): SignificantEventsFeatureToolType[] | undefined {
  const args = (toolArguments ?? {}) as GetStreamFeaturesInput;
  if (!Array.isArray(args.feature_types)) {
    return undefined;
  }

  const validTypes = args.feature_types.filter((value): value is SignificantEventsFeatureToolType =>
    SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES.includes(value as SignificantEventsFeatureToolType)
  );

  return validTypes.length > 0 ? validTypes : undefined;
}

export function toLlmFeature(feature: Feature): LlmFeature {
  return {
    id: feature.id,
    type: feature.type,
    subtype: feature.subtype,
    title: feature.title,
    description: feature.description,
    confidence: feature.confidence,
    properties: feature.properties,
    evidence: feature.evidence,
    tags: feature.tags,
  };
}
