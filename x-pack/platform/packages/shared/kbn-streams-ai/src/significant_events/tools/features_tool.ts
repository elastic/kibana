/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMPUTED_FEATURE_TYPES,
  INFERRED_FEATURE_TYPES,
  LOG_SAMPLES_FEATURE_TYPE,
} from '@kbn/significant-events-schema';
import {
  createGetFeatureQueryFromToolArgs,
  createGetFeatureTypesFromToolArgs,
  resolveFeatureTypeFilters,
  toFeatureForLlmContext,
  type GetStreamFeaturesInput,
  type GetStreamFeaturesQuery,
  type LlmFeature,
} from '../../features/tool';

/**
 * Feature types withheld from query generation. `log_samples` is redundant here
 * (covered by `dataset_analysis` and `log_patterns`) but large, so query
 * generation drops it while other consumers keep it.
 */
export const QUERY_GENERATION_EXCLUDED_FEATURE_TYPES = [LOG_SAMPLES_FEATURE_TYPE] as const;

const ALL_FEATURE_TOOL_TYPES = [...INFERRED_FEATURE_TYPES, ...COMPUTED_FEATURE_TYPES] as const;

export const SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES = ALL_FEATURE_TOOL_TYPES.filter(
  (
    type
  ): type is Exclude<
    (typeof ALL_FEATURE_TOOL_TYPES)[number],
    (typeof QUERY_GENERATION_EXCLUDED_FEATURE_TYPES)[number]
  > => !(QUERY_GENERATION_EXCLUDED_FEATURE_TYPES as readonly string[]).includes(type)
);

export type SignificantEventsFeatureToolType =
  (typeof SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES)[number];

export const getFeatureTypesFromToolArgs = createGetFeatureTypesFromToolArgs(
  SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES
);

export const getFeatureQueryFromToolArgs = createGetFeatureQueryFromToolArgs(
  SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES
);

export { resolveFeatureTypeFilters, toFeatureForLlmContext };
export type { GetStreamFeaturesInput, GetStreamFeaturesQuery, LlmFeature };
