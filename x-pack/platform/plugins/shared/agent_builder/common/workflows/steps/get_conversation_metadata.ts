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

export const GetConversationMetadataStepTypeId = 'ai.conversation.metadata.read';

const InputSchema = z.object({
  conversation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).meta({
    description: 'The unique identifier of the conversation to read metadata from.',
  }),
});

const OutputSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).meta({
    description: 'The current metadata key/value pairs for this conversation.',
  }),
});

type GetConversationMetadataInputSchema = typeof InputSchema;
type GetConversationMetadataOutputSchema = typeof OutputSchema;

export type GetConversationMetadataStepInput = z.infer<typeof InputSchema>;

export const getConversationMetadataStepCommonDefinition: CommonStepDefinition<
  GetConversationMetadataInputSchema,
  GetConversationMetadataOutputSchema
> = {
  id: GetConversationMetadataStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.getConversationMetadata.label', {
    defaultMessage: 'Read conversation metadata',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowSteps.getConversationMetadata.description',
    {
      defaultMessage: 'Reads the structured metadata fields from an agent conversation.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.getConversationMetadata.documentation.details',
      {
        defaultMessage:
          'Reads all metadata key/value pairs attached to a conversation. Use this step to inspect field values such as `status`, `decision`, or `severity` before branching your workflow.',
      }
    ),
    examples: [
      `## Read metadata from a conversation
\`\`\`yaml
- name: read_metadata
  type: ${GetConversationMetadataStepTypeId}
  with:
    conversation_id: "abc-123-def-456"
\`\`\``,
      `## Use metadata in a condition
\`\`\`yaml
- name: read_metadata
  type: ${GetConversationMetadataStepTypeId}
  with:
    conversation_id: "{{ event.conversationId }}"

- name: branch_on_decision
  type: if
  condition: "steps.read_metadata.output.metadata.decision : \\"approved\\""
  steps:
    - name: handle_approved
      type: console
      with:
        message: "Decision approved"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
