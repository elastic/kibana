/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';

export const SIGNIFICANT_EVENTS_FINALIZE_FEATURES_TOOL_ID =
  platformSignificantEventsTools.finalizeFeatures;

const featureItemSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    subtype: z.string(),
    description: z.string(),
    title: z.string(),
    properties: z.record(z.string(), z.unknown()),
    confidence: z.number(),
    evidence: z.array(z.string()),
    evidence_doc_ids: z.array(z.string()).optional(),
    tags: z.array(z.string()),
    filter: z.unknown().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const ignoredFeatureItemSchema = z
  .object({
    feature_id: z.string(),
    feature_title: z.string(),
    excluded_feature_id: z.string(),
    reason: z.string(),
  })
  .passthrough();

export const finalizeFeaturesSchema = z
  .object({
    features: z
      .array(featureItemSchema)
      .describe(
        'Deduplicated list of features identified from the current sample documents. Include every feature supported by evidence at confidence ≥ 30.'
      ),
    ignored_features: z
      .array(ignoredFeatureItemSchema)
      .optional()
      .default([])
      .describe(
        'Features suppressed because they match an excluded feature. Empty array when no exclusions apply.'
      ),
  })
  .describe(
    'Submit the current batch of deduplicated features. Call exactly once after completing all searches.'
  );

export type FinalizeFeaturesParams = z.infer<typeof finalizeFeaturesSchema>;

export function createFinalizeFeaturesTool(): StaticToolRegistration<
  typeof finalizeFeaturesSchema
> {
  const toolDefinition: BuiltinToolDefinition<typeof finalizeFeaturesSchema> = {
    id: SIGNIFICANT_EVENTS_FINALIZE_FEATURES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Submit the identified features. Call exactly once with the full deduplicated list after memory grounding, relevant Significant Events searches, and semantic duplicate checks are complete. Do not call before all candidates have been checked.',
    annotations: {
      title: 'Finalize Features',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: finalizeFeaturesSchema,
    tags: ['streams', 'significant-events', 'feature-identification'],
    handler: async () => ({
      results: [{ type: ToolResultType.other, data: { finalized: true } }],
    }),
  };

  return toolDefinition;
}
