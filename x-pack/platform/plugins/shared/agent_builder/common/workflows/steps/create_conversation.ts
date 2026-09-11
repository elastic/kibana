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
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  agentIdMaxLength,
} from '@kbn/agent-builder-common';

export const CreateConversationStepTypeId = 'ai.conversation.create';

const AccessControlEntrySchema = z.object({
  type: z.literal('user'),
  id: z.string().min(1).max(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH),
  role: z.literal(ConversationAccessControlRole.Member),
});

const AccessControlSchema = z
  .object({
    access_mode: z.enum([
      ConversationAccessControlMode.Private,
      ConversationAccessControlMode.Public,
    ]),
    entries: z
      .array(AccessControlEntrySchema)
      .max(CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES)
      .optional(),
  })
  .refine(
    (val) =>
      !(
        val.access_mode === ConversationAccessControlMode.Public &&
        val.entries &&
        val.entries.length > 0
      ),
    { message: 'ACL entries are not supported when access_mode is "public"' }
  );

const MetadataSchema = z
  .record(
    z.string().max(256),
    z.union([
      z.string().max(10_000),
      z.number(),
      z.boolean(),
      z.array(z.string().max(2_000)).max(100),
    ])
  )
  .refine((val) => Object.keys(val).length <= 100, {
    message: 'metadata may not have more than 100 keys',
  });

const InputSchema = z
  .object({
    agent_id: z.string().min(1).max(agentIdMaxLength).optional().meta({
      description:
        'The ID of the agent to associate with the conversation. Defaults to the default Elastic AI agent.',
    }),
    conversation_id: z.string().uuid().max(CONVERSATION_ID_MAX_LENGTH).optional().meta({
      description:
        'Optional client-supplied UUID for the conversation. Server-generated if omitted.',
    }),
    title: z.string().min(1).max(CONVERSATION_TITLE_MAX_LENGTH).optional().meta({
      description: 'Title for the conversation. Defaults to "New conversation".',
    }),
    access_control: AccessControlSchema.optional().meta({
      description: 'Optional access-control settings. Defaults to private with no shared members.',
    }),
    template_id: z.string().min(1).max(256).optional().meta({
      description:
        'Optional ID of a conversation template to apply. When set, seeds default metadata and validates any caller-supplied `metadata` against the template field definitions.',
    }),
    metadata: MetadataSchema.optional().meta({
      description:
        'Initial metadata values. Each key must be declared by the referenced template; each value is validated against the field definition. Requires `template_id`.',
    }),
  })
  .refine((val) => !val.metadata || !!val.template_id, {
    message:
      '`metadata` requires `template_id`: metadata values are validated against the referenced template',
  });

const OutputSchema = z.object({
  conversation_id: z.string().meta({ description: 'The ID of the newly created conversation.' }),
  agent_id: z.string().meta({ description: 'The agent associated with the conversation.' }),
  template_id: z
    .string()
    .optional()
    .meta({ description: 'The template applied to the conversation, if any.' }),
  metadata: z.record(z.string(), z.unknown()).meta({
    description:
      'The conversation metadata after applying template defaults and caller-supplied values.',
  }),
});

type CreateConversationInputSchema = typeof InputSchema;
type CreateConversationOutputSchema = typeof OutputSchema;

export type CreateConversationStepInput = z.infer<typeof InputSchema>;

export const createConversationStepCommonDefinition: CommonStepDefinition<
  CreateConversationInputSchema,
  CreateConversationOutputSchema
> = {
  id: CreateConversationStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.agentBuilder.workflowSteps.createConversation.label', {
    defaultMessage: 'Create conversation',
  }),
  description: i18n.translate('xpack.agentBuilder.workflowSteps.createConversation.description', {
    defaultMessage:
      'Creates an empty agent conversation, optionally applying a template and seeding metadata.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.agentBuilder.workflowSteps.createConversation.documentation.details',
      {
        defaultMessage:
          'Creates a new conversation without sending a message. Use this to obtain a `conversation_id` you can pass to later steps (for example, a chat step that continues the conversation). When `template_id` is supplied, the conversation is initialized with the template defaults; any `metadata` values are validated against the template before being merged.',
      }
    ),
    examples: [
      `## Create an empty conversation for the default agent
\`\`\`yaml
- name: create_conversation
  type: ${CreateConversationStepTypeId}
  with:
    title: "Incoming request"
\`\`\``,
      `## Create a conversation seeded from a template
\`\`\`yaml
- name: create_conversation
  type: ${CreateConversationStepTypeId}
  with:
    agent_id: incident-responder
    template_id: incident-response
    metadata:
      severity: high
      services:
        - checkout
        - payments
      on_call: true
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
