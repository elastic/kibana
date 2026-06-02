/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Workflow step type id for the SML "index attachment" step.
 *
 * We deliberately avoid the `kibana.*` prefix: the workflow execution engine
 * routes any `kibana.*` step type through the HTTP-based Kibana action
 * resolver, which expects a registered Kibana API connector. This step
 * dispatches in-process to the Agent Context Layer start contract instead,
 * so it uses a plugin-scoped namespace (`agentContextLayer.*`), matching the
 * convention used by other extension steps (e.g. cases plugin: `cases.getCase`).
 */
export const SmlIndexAttachmentStepTypeId = 'agentContextLayer.smlIndexAttachment';

const ChunkSchema = z.object({
  type: z.string().min(1).describe('Chunk type (e.g., "visualization", "dashboard").'),
  title: z.string().min(1).describe('Display title for the chunk.'),
  content: z.string().min(1).describe('Searchable content (indexed as semantic_text).'),
  description: z.string().optional().describe('Optional longer summary indexed as semantic_text.'),
  user_id: z.string().optional().describe('Optional owner/last-modifier user id.'),
  references: z.array(z.string()).optional().describe('Optional list of referenced SML chunk ids.'),
  permissions: z
    .array(z.string())
    .optional()
    .describe('Optional Kibana privilege strings required to view the chunk later.'),
});

/**
 * Step input.
 *
 * Workflow-driven writes always go through the content-mode path on the SML
 * start contract — caller-supplied chunks are written as
 * `ingestion_method: 'manual'`.
 *
 * - `upsert` requires `chunks` and always performs a full replace: every
 *   prior chunk for the `origin_id` is removed and the supplied chunks are
 *   written. There is no fail-if-exists / fail-if-not-found distinction —
 *   the indexer's content-mode path is idempotent by design, so we expose
 *   a single `upsert` action rather than the misleading `create`/`update`
 *   pair.
 * - `delete` requires only the origin/type identifiers and wipes every
 *   chunk recorded for the `origin_id` regardless of how it was produced
 *   (both crawled and manual entries). This matches the "workflow owns
 *   this origin" semantic and is the opposite of the crawler's default
 *   delete (which preserves curated manual entries).
 */
export const SmlIndexAttachmentInputSchema = z.discriminatedUnion('action', [
  z.object({
    originId: z
      .string()
      .min(1)
      .describe('Stable identifier for the source object (e.g., saved object id).'),
    attachmentType: z.string().min(1).describe('SML attachment type id (chunk namespace).'),
    action: z.literal('upsert'),
    chunks: z.array(ChunkSchema).min(1).max(100),
  }),
  z.object({
    originId: z.string().min(1),
    attachmentType: z.string().min(1),
    action: z.literal('delete'),
  }),
]);

export const SmlIndexAttachmentOutputSchema = z.object({
  originId: z.string(),
  attachmentType: z.string(),
  action: z.enum(['upsert', 'delete']),
  spaceId: z.string(),
  /**
   * Number of chunks the workflow asked the step to index. Reflects the
   * caller-supplied `chunks.length` (0 for `delete`), not the count of
   * documents Elasticsearch confirms it has written. Per-document bulk
   * failures are logged by the indexer but do not throw — if you need a
   * confirmed-write count, validate downstream.
   */
  requestedChunkCount: z.number().int().nonnegative(),
  acknowledged: z.literal(true),
});

export type SmlIndexAttachmentStepInputSchema = typeof SmlIndexAttachmentInputSchema;
export type SmlIndexAttachmentStepOutputSchema = typeof SmlIndexAttachmentOutputSchema;

export const smlIndexAttachmentStepCommonDefinition: CommonStepDefinition<
  SmlIndexAttachmentStepInputSchema,
  SmlIndexAttachmentStepOutputSchema
> = {
  id: SmlIndexAttachmentStepTypeId,
  category: StepCategory.Kibana,
  label: i18n.translate('xpack.agentContextLayer.workflowSteps.smlIndexAttachment.label', {
    defaultMessage: 'Index SML attachment',
  }),
  description: i18n.translate(
    'xpack.agentContextLayer.workflowSteps.smlIndexAttachment.description',
    {
      defaultMessage:
        'Index or remove an attachment in the Agent Context Layer (Semantic Metadata Layer) using caller-supplied chunks.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentContextLayer.workflowSteps.smlIndexAttachment.documentation.details',
      {
        defaultMessage:
          "Writes chunks directly (the registered type\u2019s `getSmlData` hook is not invoked). `upsert` writes the supplied `chunks` tagged `ingestion_method: 'manual'`, replacing any prior chunks for the `origin_id` (idempotent — no fail-if-exists / fail-if-not-found distinction). `delete` wipes every chunk for the `origin_id` regardless of how it was produced.",
      }
    ),
    examples: [
      `## Index a custom summary
\`\`\`yaml
- name: index_summary
  type: ${SmlIndexAttachmentStepTypeId}
  with:
    originId: "doc-42"
    attachmentType: "custom"
    action: "upsert"
    chunks:
      - type: "custom"
        title: "Quarterly summary"
        content: "Revenue grew 12% across all regions ..."
        description: "Auto-generated quarterly summary"
\`\`\``,

      `## Remove a previously indexed attachment
\`\`\`yaml
- name: remove_from_sml
  type: ${SmlIndexAttachmentStepTypeId}
  with:
    originId: "doc-42"
    attachmentType: "custom"
    action: "delete"
\`\`\``,
    ],
  },
  inputSchema: SmlIndexAttachmentInputSchema,
  outputSchema: SmlIndexAttachmentOutputSchema,
};
