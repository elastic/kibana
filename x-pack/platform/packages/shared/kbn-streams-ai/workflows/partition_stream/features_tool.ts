/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Feature } from '@kbn/streams-schema';
import { pick } from 'lodash';

export const PARTITION_FEATURE_TOOL_TYPES = [
  'infrastructure',
  'technology',
  'dependency',
  'entity',
  'schema',
] as const;

export type PartitionFeatureToolType = (typeof PARTITION_FEATURE_TOOL_TYPES)[number];

export interface GetStreamFeaturesInput {
  feature_types?: unknown;
  min_confidence?: unknown;
  limit?: unknown;
}

export interface GetStreamFeaturesQuery {
  featureTypes?: PartitionFeatureToolType[];
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
  featureTypes?: PartitionFeatureToolType[]
): string[] | undefined {
  if (!featureTypes || featureTypes.length === 0) {
    return undefined;
  }

  return [...new Set(featureTypes)];
}

export function getFeatureTypesFromToolArgs(
  toolArguments: unknown
): PartitionFeatureToolType[] | undefined {
  const args = (toolArguments ?? {}) as GetStreamFeaturesInput;
  if (!Array.isArray(args.feature_types)) {
    return undefined;
  }

  const validTypes = args.feature_types.filter((value): value is PartitionFeatureToolType =>
    PARTITION_FEATURE_TOOL_TYPES.includes(value as PartitionFeatureToolType)
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
