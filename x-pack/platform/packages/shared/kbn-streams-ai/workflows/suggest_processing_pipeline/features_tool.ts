/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPUTED_FEATURE_TYPES } from '@kbn/streams-schema/src/feature';
import {
  createGetFeatureQueryFromToolArgs,
  createGetStreamFeaturesTool,
  resolveFeatureTypeFilters,
  toFeatureForLlmContext,
  type GetStreamFeaturesQuery,
  type LlmFeature,
} from '../../src/features/tool';

export const SUGGEST_PIPELINE_FEATURE_TOOL_TYPES = [
  'infrastructure',
  'technology',
  'dependency',
  'entity',
  'schema',
  'log_format',
  'programming_language',
  'service',
  ...COMPUTED_FEATURE_TYPES,
] as const;

export type SuggestPipelineFeatureToolType = (typeof SUGGEST_PIPELINE_FEATURE_TOOL_TYPES)[number];

export const getFeatureQueryFromToolArgs = createGetFeatureQueryFromToolArgs(
  SUGGEST_PIPELINE_FEATURE_TOOL_TYPES
);

export const suggestPipelineFeaturesTool = createGetStreamFeaturesTool(
  SUGGEST_PIPELINE_FEATURE_TOOL_TYPES
);

export { resolveFeatureTypeFilters, toFeatureForLlmContext };
export type { GetStreamFeaturesQuery, LlmFeature };
