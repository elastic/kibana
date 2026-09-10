/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { CONVERSATION_ID_MAX_LENGTH } from '@kbn/agent-builder-common';

export const ListAttachmentsStepTypeId = 'ai.attachment.list';

const InputSchema = z.object({
  conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
    description: 'The ID of the conversation whose attachments should be listed.',
  }),
  include_deleted: z.boolean().optional().meta({
    description: 'When true, includes soft-deleted attachments. Defaults to false.',
  }),
});

const AttachmentSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  current_version: z.number(),
  description: z.string().optional(),
  active: z.boolean(),
});

const OutputSchema = z.object({
  attachments: z.array(AttachmentSummarySchema).meta({
    description: 'Summary of each attachment: id, type, current_version, description, active.',
  }),
  total_token_estimate: z.number().meta({
    description: 'Aggregate estimated token count across the returned attachments.',
  }),
});

type ListAttachmentsInputSchema = typeof InputSchema;
type ListAttachmentsOutputSchema = typeof OutputSchema;

export type ListAttachmentsStepInput = z.infer<typeof InputSchema>;

export const listAttachmentsStepCommonDefinition: CommonStepDefinition<
  ListAttachmentsInputSchema,
  ListAttachmentsOutputSchema
> = {
  id: ListAttachmentsStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.listAttachments.label', {
    defaultMessage: 'List conversation attachments',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.listAttachments.description', {
    defaultMessage: 'Lists attachments on a conversation. Returns summaries only,',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.listAttachments.documentation.details',
      {
        defaultMessage:
          'Returns a lightweight summary of each attachment (`id`, `type`, `current_version`, `description`, `active`) plus a total token estimate.',
      }
    ),
    examples: [
      `## List active attachments on a conversation
\`\`\`yaml
- name: list_attachments
  type: ${ListAttachmentsStepTypeId}
  with:
    conversation_id: "{{steps.create_conversation.output.conversation_id}}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
