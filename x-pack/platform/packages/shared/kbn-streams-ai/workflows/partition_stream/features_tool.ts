/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createGetFeatureQueryFromToolArgs,
  createGetStreamFeaturesTool,
  resolveFeatureTypeFilters,
  toFeatureForLlmContext,
} from '@kbn/nightshift-ai';

export const PARTITION_FEATURE_TOOL_TYPES = ['entity'] as const;

export const getFeatureQueryFromToolArgs = createGetFeatureQueryFromToolArgs(
  PARTITION_FEATURE_TOOL_TYPES
);

export const partitionStreamFeaturesTool = createGetStreamFeaturesTool(
  PARTITION_FEATURE_TOOL_TYPES
);

export { resolveFeatureTypeFilters, toFeatureForLlmContext };
