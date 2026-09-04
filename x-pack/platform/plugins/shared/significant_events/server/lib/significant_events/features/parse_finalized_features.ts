/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { Logger } from '@kbn/logging';
import {
  identifiedFeatureSchema,
  ignoredFeatureSchema,
  type BaseFeature,
  type IgnoredFeature,
} from '@kbn/significant-events-schema';
import { conditionSchema, isConditionComplete, type Condition } from '@kbn/streamlang';

const MAX_EVIDENCE_ITEMS = 5;
const MAX_IDENTIFIED_FEATURES_PER_ITERATION = 100;

export interface RawFinalizeFeaturesParams {
  features?: unknown;
  ignored_features?: unknown;
}

function tryParseFilter(maybeFilter: unknown): Condition | undefined {
  if (!maybeFilter) {
    return undefined;
  }
  const result = conditionSchema.safeParse(maybeFilter);
  if (!result.success) {
    return undefined;
  }
  return isConditionComplete(result.data) ? result.data : undefined;
}

/**
 * Normalizes, validates, deduplicates, and caps the raw `finalize_features` tool params into KI
 * features. Shared by the production agent runner and the evals suite so both interpret the agent's
 * output identically.
 */
export function parseFinalizedFeatures(
  rawParams: RawFinalizeFeaturesParams,
  streamName: string,
  logger?: Logger
): { features: BaseFeature[]; ignoredFeatures: IgnoredFeature[] } {
  const finalizedFeatures: BaseFeature[] = [];
  const ignoredFeatures: IgnoredFeature[] = [];

  for (const item of Array.isArray(rawParams.features) ? rawParams.features : []) {
    const raw = item as Record<string, unknown>;
    const candidate = {
      ...raw,
      stream_name: streamName,
      filter: tryParseFilter(raw.filter),
      ...(Array.isArray(raw.evidence)
        ? { evidence: (raw.evidence as unknown[]).slice(0, MAX_EVIDENCE_ITEMS) }
        : {}),
    };
    const result = identifiedFeatureSchema.safeParse(candidate);
    if (!result.success || Object.keys(result.data.properties).length === 0) {
      logger?.debug(
        `Skipping invalid feature: ${result.success ? 'empty properties' : result.error.message}`
      );
      continue;
    }
    finalizedFeatures.push(result.data);
  }

  for (const item of Array.isArray(rawParams.ignored_features) ? rawParams.ignored_features : []) {
    const result = ignoredFeatureSchema.safeParse(item);
    if (result.success) {
      ignoredFeatures.push(result.data);
    }
  }

  return {
    features: uniqBy(finalizedFeatures, (feature) => feature.id).slice(
      0,
      MAX_IDENTIFIED_FEATURES_PER_ITERATION
    ),
    ignoredFeatures,
  };
}
