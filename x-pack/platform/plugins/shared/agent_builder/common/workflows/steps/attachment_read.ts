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

export const ReadAttachmentStepTypeId = 'ai.attachment.read';

const InputSchema = z.object({
  conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
    description: 'The ID of the conversation the attachment belongs to.',
  }),
  attachment_id: z.string().min(1).max(256).meta({
    description: 'The ID of the attachment to read.',
  }),
  version: z.number().int().positive().optional().meta({
    description: 'Optional version number to read. Defaults to the current version.',
  }),
});

const OutputSchema = z.object({
  data: z.unknown().meta({ description: 'The raw attachment data at the requested version.' }),
  version: z.number().meta({ description: 'The version number that was read.' }),
});

type ReadAttachmentInputSchema = typeof InputSchema;
type ReadAttachmentOutputSchema = typeof OutputSchema;

export type ReadAttachmentStepInput = z.infer<typeof InputSchema>;

export const readAttachmentStepCommonDefinition: CommonStepDefinition<
  ReadAttachmentInputSchema,
  ReadAttachmentOutputSchema
> = {
  id: ReadAttachmentStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.readAttachment.label', {
    defaultMessage: 'Read conversation attachment',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.readAttachment.description', {
    defaultMessage: 'Reads the raw content of an attachment at a specific version.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.readAttachment.documentation.details',
      {
        defaultMessage:
          'Fetches the raw `data` of the specified attachment. When `version` is omitted, returns the current version. If the requested version does not exist on the attachment, the step returns an error.',
      }
    ),
    examples: [
      `## Read the current version of an attachment
\`\`\`yaml
- name: read_attachment
  type: ${ReadAttachmentStepTypeId}
  with:
    conversation_id: "{{steps.create_conversation.output.conversation_id}}"
    attachment_id: "att-1"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
