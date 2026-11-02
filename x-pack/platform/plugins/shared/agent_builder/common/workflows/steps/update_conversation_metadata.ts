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
import {
  CONVERSATION_ID_MAX_LENGTH,
  ConversationMetadataUpdatedTriggerId,
} from '@kbn/agent-builder-common';

export const UpdateConversationMetadataStepTypeId = 'ai.conversation.metadata.patch';

const InputSchema = z.object({
  conversation_id: z
    .string()
    .meta({
      description: 'The unique identifier of the conversation to update.',
    })
    .min(1)
    .max(CONVERSATION_ID_MAX_LENGTH),
  updates: z
    .record(
      z.string().max(256),
      z.union([
        z.string().max(10_000),
        z.number(),
        z.boolean(),
        z.array(z.string().max(2_000)).max(100),
      ])
    )
    .refine((val) => Object.keys(val).length > 0, {
      message: 'updates must include at least one field',
    })
    .refine((val) => Object.keys(val).length <= 100, {
      message: 'updates may not have more than 100 keys',
    })
    .meta({
      description:
        'Key/value pairs to merge into the conversation metadata. Only keys defined by the active template are accepted. Existing keys not included here are left unchanged.',
    }),
});

const OutputSchema = z.object({
  conversation_id: z.string().meta({ description: 'The ID of the updated conversation.' }),
  changed_fields: z.array(z.string()).meta({
    description:
      'Names of the metadata fields whose values actually changed. Empty when the patch was a no-op.',
  }),
  metadata: z.record(z.string(), z.unknown()).meta({
    description: 'The full conversation metadata after applying the patch.',
  }),
});

type UpdateConversationMetadataInputSchema = typeof InputSchema;
type UpdateConversationMetadataOutputSchema = typeof OutputSchema;

export type UpdateConversationMetadataStepInput = z.infer<typeof InputSchema>;

export const updateConversationMetadataStepCommonDefinition: CommonStepDefinition<
  UpdateConversationMetadataInputSchema,
  UpdateConversationMetadataOutputSchema
> = {
  id: UpdateConversationMetadataStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.updateConversationMetadata.label', {
    defaultMessage: 'Update conversation metadata',
  }),
  description: i18n.translate(
    'xpack.agentBuilder.workflowSteps.updateConversationMetadata.description',
    {
      defaultMessage:
        'Writes one or more metadata fields on a conversation, validated against its template.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.updateConversationMetadata.documentation.details',
      {
        defaultMessage: `Merges the provided key/value pairs into the conversation metadata. The conversation must have a template applied; only fields defined by the template are accepted. A successful write publishes a "{triggerId}" trigger event when at least one field value changes.`,
        values: {
          triggerId: ConversationMetadataUpdatedTriggerId,
        },
      }
    ),
    examples: [
      `## Set a decision field
\`\`\`yaml
- name: approve_proposal
  type: ${UpdateConversationMetadataStepTypeId}
  with:
    conversation_id: "abc-123-def-456"
    updates:
      decision: "approved"
\`\`\``,
      `## Update multiple fields at once
\`\`\`yaml
- name: resolve_investigation
  type: ${UpdateConversationMetadataStepTypeId}
  with:
    conversation_id: "{{ event.conversationId }}"
    updates:
      status: "resolved"
      severity: "low"
      remediationState: "completed"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
