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

export const AddAttachmentStepTypeId = 'ai.attachment.add';

const InputSchema = z.object({
  conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
    description: 'The ID of the conversation to add the attachment to.',
  }),
  id: z.string().min(1).max(256).optional().meta({
    description: 'Optional client-supplied ID for the attachment. Server-generated if omitted.',
  }),
  type: z.string().min(1).max(256).meta({
    description: 'The attachment type.',
  }),
  data: z.unknown().optional().meta({
    description: 'The attachment data/content. Required unless `origin` is provided.',
  }),
  origin: z.string().min(1).max(2048).optional().meta({
    description:
      'Origin string for by-reference attachments. When provided without `data`, content is resolved once at creation time.',
  }),
  description: z.string().max(1024).optional().meta({
    description: 'Human-readable description of the attachment.',
  }),
  hidden: z.boolean().optional().meta({
    description: 'Whether the attachment should be hidden from the user.',
  }),
});

const OutputSchema = z.object({
  attachment_id: z.string().meta({ description: 'The ID of the created attachment.' }),
  type: z.string().meta({ description: 'The attachment type.' }),
  current_version: z.number().meta({
    description: 'The version number of the newly created attachment (always 1 on create).',
  }),
});

type AddAttachmentInputSchema = typeof InputSchema;
type AddAttachmentOutputSchema = typeof OutputSchema;

export type AddAttachmentStepInput = z.infer<typeof InputSchema>;

export const addAttachmentStepCommonDefinition: CommonStepDefinition<
  AddAttachmentInputSchema,
  AddAttachmentOutputSchema
> = {
  id: AddAttachmentStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.addAttachment.label', {
    defaultMessage: 'Add conversation attachment',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.addAttachment.description', {
    defaultMessage: 'Adds an attachment to an existing conversation.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.addAttachment.documentation.details',
      {
        defaultMessage:
          'Adds a new attachment to the specified conversation. Either `data` (by-value) or `origin` (by-reference) must be provided. Returns the created attachment id, type, and version.',
      }
    ),
    examples: [
      `## Add a text attachment to a conversation
\`\`\`yaml
- name: add_attachment
  type: ${AddAttachmentStepTypeId}
  with:
    conversation_id: "{{steps.create_conversation.output.conversation_id}}"
    type: text
    data:
      text: "Runbook: reset the checkout cache before retrying."
    description: "Runbook snippet"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
