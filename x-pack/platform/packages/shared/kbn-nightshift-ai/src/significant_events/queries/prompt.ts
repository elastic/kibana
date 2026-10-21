/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import significantEventsSystemPrompt from './system_prompt.text';
import {
  SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES,
  QUERY_GENERATION_EXCLUDED_FEATURE_TYPES,
} from './tools/features_tool';
import { getComputedFeatureInstructions } from '../features/computed';

export const significantEventsAgentPrompt = significantEventsSystemPrompt
  .replaceAll('{{{available_feature_types}}}', SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES.join(', '))
  .replaceAll(
    '{{{computed_feature_instructions}}}',
    getComputedFeatureInstructions(QUERY_GENERATION_EXCLUDED_FEATURE_TYPES)
  );
