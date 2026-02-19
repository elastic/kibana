/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Feature } from '@kbn/streams-schema';
import { COMPUTED_FEATURE_TYPES } from '@kbn/streams-schema/src/feature';
import { pick } from 'lodash';

export const SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES = [
  'infrastructure',
  'technology',
  'dependency',
  'entity',
  'schema',
  ...COMPUTED_FEATURE_TYPES,
] as const;

export type SignificantEventsFeatureToolType =
  (typeof SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES)[number];

export interface GetStreamFeaturesInput {
  feature_types?: unknown;
  min_confidence?: unknown;
  limit?: unknown;
}

export interface GetStreamFeaturesQuery {
  featureTypes?: SignificantEventsFeatureToolType[];
  minConfidence?: number;
  limit?: number;
}

export type LlmFeature = Pick<
  Feature,
  | 'type'
  | 'subtype'
  | 'title'
  | 'description'
  | 'confidence'
  | 'properties'
  | 'evidence'
  | 'tags'
  | 'meta'
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

function getMinConfidenceFromToolArgs(toolArguments: unknown): number | undefined {
  const args = (toolArguments ?? {}) as GetStreamFeaturesInput;
  if (typeof args.min_confidence !== 'number' || Number.isNaN(args.min_confidence)) {
    return undefined;
  }

  if (args.min_confidence < 0 || args.min_confidence > 100) {
    return undefined;
  }

  return args.min_confidence;
}

function getLimitFromToolArgs(toolArguments: unknown): number | undefined {
  const args = (toolArguments ?? {}) as GetStreamFeaturesInput;
  if (typeof args.limit !== 'number' || Number.isNaN(args.limit)) {
    return undefined;
  }

  const normalizedLimit = Math.floor(args.limit);
  if (normalizedLimit <= 0) {
    return undefined;
  }

  return normalizedLimit;
}

export function getFeatureQueryFromToolArgs(toolArguments: unknown): GetStreamFeaturesQuery {
  return {
    featureTypes: getFeatureTypesFromToolArgs(toolArguments),
    minConfidence: getMinConfidenceFromToolArgs(toolArguments),
    limit: getLimitFromToolArgs(toolArguments),
  };
}

export function toFeatureForLlmContext(feature: Feature): LlmFeature {
  return pick(feature, [
    'type',
    'subtype',
    'title',
    'description',
    'confidence',
    'properties',
    'evidence',
    'tags',
    'meta',
  ]);
}
