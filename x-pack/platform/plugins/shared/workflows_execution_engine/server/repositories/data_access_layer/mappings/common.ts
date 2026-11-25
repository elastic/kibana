/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';

// Normalized LLM token usage. Shared between the step-execution mapping (per-step
// usage extracted from `output.metadata.usage`) and the execution mapping (the
// aggregated per-execution total). Present only for token-consuming (`ai.*`) steps.
export const TOKEN_USAGE_MAPPING = mappings.object({
  properties: {
    inputTokens: mappings.long(),
    outputTokens: mappings.long(),
    cachedTokens: mappings.long(),
    totalTokens: mappings.long(),
  },
}) satisfies MappingsDefinition;

export const STEP_USAGE_MAPPING = {
  type: 'nested' as const,
  properties: {
    stepId: mappings.keyword(),
    connectorId: mappings.keyword(),
    inputTokens: mappings.long(),
    outputTokens: mappings.long(),
    cachedTokens: mappings.long(),
    totalTokens: mappings.long(),
  },
};
