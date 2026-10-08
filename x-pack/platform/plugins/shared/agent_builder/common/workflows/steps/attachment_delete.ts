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

export const DeleteAttachmentStepTypeId = 'ai.attachment.delete';

const InputSchema = z.object({
  conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
    description: 'The ID of the conversation the attachment belongs to.',
  }),
  attachment_id: z.string().min(1).max(256).meta({
    description: 'The ID of the attachment to delete.',
  }),
  permanent: z.boolean().optional().meta({
    description: 'When true, permanently removes the attachment. Defaults to soft delete.',
  }),
});

const OutputSchema = z.object({
  success: z.boolean().meta({ description: 'Always true on success.' }),
  permanent: z.boolean().meta({
    description: 'Whether the delete was permanent.',
  }),
});

type DeleteAttachmentInputSchema = typeof InputSchema;
type DeleteAttachmentOutputSchema = typeof OutputSchema;

export type DeleteAttachmentStepInput = z.infer<typeof InputSchema>;

export const deleteAttachmentStepCommonDefinition: CommonStepDefinition<
  DeleteAttachmentInputSchema,
  DeleteAttachmentOutputSchema
> = {
  id: DeleteAttachmentStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.deleteAttachment.label', {
    defaultMessage: 'Delete conversation attachment',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.deleteAttachment.description', {
    defaultMessage:
      'Soft-deletes (default) or permanently removes an attachment from a conversation.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.deleteAttachment.documentation.details',
      {
        defaultMessage:
          'By default, performs a soft delete — the attachment is marked inactive and can be restored later. Passing `permanent: true` removes the record entirely.',
      }
    ),
    examples: [
      `## Soft-delete an attachment
\`\`\`yaml
- name: delete_attachment
  type: ${DeleteAttachmentStepTypeId}
  with:
    conversation_id: "{{steps.create_conversation.output.conversation_id}}"
    attachment_id: "att-1"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
