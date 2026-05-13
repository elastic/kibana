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
 * Workflow step type id for the SML index-attachment step.
 *
 * We deliberately avoid the `kibana.*` prefix: the workflow execution engine
 * (`nodes_factory.create`) routes any `kibana.*` step type straight to the
 * HTTP-based `KibanaActionStepImpl`, which then asks the
 * `kibana_request_builder` to derive an HTTP method/path from a registered
 * Kibana API connector. There is no such connector for this step (it runs
 * an in-process handler against the SML start contract), so prefixing it
 * with `kibana.` made the engine throw
 * "No connector definition found for kibana.agentContextLayer.smlIndexAttachment".
 *
 * Use a plugin-scoped namespace instead, following the convention of other
 * extension steps (e.g. cases plugin: `cases.getCase`, agent builder:
 * `ai.agent`). The engine's `kibana.*` shortcut is bypassed and the step is
 * resolved via `workflowsExtensions.getStepDefinition`.
 */
export const SmlIndexAttachmentStepTypeId = 'agentContextLayer.smlIndexAttachment';

/**
 * Per-chunk input for the step.
 *
 * `permissions` is intentionally **not** exposed here. The SML indexer
 * derives the effective `permissions` (and `spaces`) for every chunk from
 * the registered type's `resolveOriginAccess(originId, ctx, spaceId)` hook,
 * which is the sole source of truth for chunk authorization. Letting
 * workflow authors set permissions directly would let a workflow forge
 * privileges or bypass the cross-space write guard.
 */
const ChunkSchema = z.object({
  type: z.string().min(1).describe('Chunk type (e.g., "visualization", "dashboard").'),
  title: z.string().min(1).describe('Display title for the chunk.'),
  content: z.string().min(1).describe('Searchable content (indexed as semantic_text).'),
  description: z.string().optional().describe('Optional longer summary indexed as semantic_text.'),
  user_id: z.string().optional().describe('Optional owner/last-modifier user id.'),
  references: z.array(z.string()).optional().describe('Optional list of referenced SML chunk ids.'),
});

/**
 * Workflow step input.
 *
 * The HTTP/workflow surface always indexes via direct content (no
 * `getSmlData`). Chunks are required for `create`/`update`, forbidden for
 * `delete`.
 */
export const SmlIndexAttachmentInputSchema = z.discriminatedUnion('action', [
  z.object({
    originId: z
      .string()
      .min(1)
      .describe('Stable identifier for the source object (e.g., saved object id).'),
    attachmentType: z.string().min(1).describe('SML attachment type id (chunk namespace).'),
    action: z.literal('create'),
    chunks: z.array(ChunkSchema).min(1).max(100),
  }),
  z.object({
    originId: z.string().min(1),
    attachmentType: z.string().min(1),
    action: z.literal('update'),
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
  action: z.enum(['create', 'update', 'delete']),
  spaceId: z.string(),
  chunkCount: z.number().int().nonnegative(),
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
          'Indexes chunks directly (no `getSmlData` hook is invoked). For `create`/`update` the workflow author supplies the `chunks` array. For `delete` only `originId` and `attachmentType` are needed.',
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
    action: "create"
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
