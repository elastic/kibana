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

export const UpdateAttachmentStepTypeId = 'ai.attachment.update';

const InputSchema = z.object({
  conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
    description: 'The ID of the conversation the attachment belongs to.',
  }),
  attachment_id: z.string().min(1).max(256).meta({
    description: 'The ID of the attachment to update.',
  }),
  data: z.unknown().optional().meta({
    description: 'The new attachment data/content. Creates a new version when content changes.',
  }),
  description: z.string().max(1024).optional().meta({
    description: 'Optional new description for the attachment.',
  }),
});

const OutputSchema = z.object({
  attachment_id: z.string().meta({ description: 'The ID of the updated attachment.' }),
  current_version: z.number().meta({
    description:
      'The current version number after update. Reflects the new version when `data` changed.',
  }),
});

type UpdateAttachmentInputSchema = typeof InputSchema;
type UpdateAttachmentOutputSchema = typeof OutputSchema;

export type UpdateAttachmentStepInput = z.infer<typeof InputSchema>;

export const updateAttachmentStepCommonDefinition: CommonStepDefinition<
  UpdateAttachmentInputSchema,
  UpdateAttachmentOutputSchema
> = {
  id: UpdateAttachmentStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.updateAttachment.label', {
    defaultMessage: 'Update conversation attachment',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.updateAttachment.description', {
    defaultMessage:
      "Updates an attachment's data or description. Creates a new version when data changes.",
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.updateAttachment.documentation.details',
      {
        defaultMessage:
          'Updates the specified attachment. When `data` is provided and its content differs from the current version, a new version is created and `current_version` in the output reflects the new number. Updating only `description` does not create a new version.',
      }
    ),
    examples: [
      `## Update an attachment description
\`\`\`yaml
- name: rename_attachment
  type: ${UpdateAttachmentStepTypeId}
  with:
    conversation_id: "{{steps.create_conversation.output.conversation_id}}"
    attachment_id: "att-1"
    description: "Runbook (v2, corrected)"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
