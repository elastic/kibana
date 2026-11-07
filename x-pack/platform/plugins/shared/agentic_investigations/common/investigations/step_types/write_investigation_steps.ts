/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BaseStepDefinition } from '@kbn/workflows';
import { StepCategory } from '@kbn/workflows';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  agentIdMaxLength,
} from '@kbn/agent-builder-common';
import { hypothesesListSchema } from '../../hypotheses/hypotheses';

/*
 * Same input and output as Agent Builder's `ai.conversation.create` and
 * `ai.conversation.metadata.patch`, so a Worker swaps the step type and nothing else. Writes go
 * through the investigations client, which is where an investigation's case follows it.
 */

export const CreateInvestigationStepId = 'investigations.create' as const;
export const PatchInvestigationStepId = 'investigations.patch' as const;
export const SetHypothesesStepId = 'investigations.setHypotheses' as const;

const metadataValueSchema = lazySchema(() =>
  z.union([
    z.string().max(10_000),
    z.number(),
    z.boolean(),
    z.array(z.string().max(2_000)).max(100),
  ])
);

const accessControlSchema = lazySchema(() =>
  z
    .object({
      access_mode: z.enum([
        ConversationAccessControlMode.Private,
        ConversationAccessControlMode.Public,
      ]),
      entries: z
        .array(
          z.object({
            type: z.literal('user'),
            id: z.string().min(1).max(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH),
            role: z.literal(ConversationAccessControlRole.Member),
          })
        )
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
    )
);

export const createInvestigationStepInputSchema = lazySchema(() =>
  z.object({
    agent_id: z
      .string()
      .min(1)
      .max(agentIdMaxLength)
      .optional()
      .describe('Agent of the investigation. Defaults to the default Elastic AI agent.'),
    conversation_id: z
      .string()
      .uuid()
      .max(CONVERSATION_ID_MAX_LENGTH)
      .optional()
      .describe(
        'Optional client-supplied UUID for the investigation. Server-generated if omitted.'
      ),
    title: z.string().min(1).max(CONVERSATION_TITLE_MAX_LENGTH).optional().describe('Title.'),
    access_control: accessControlSchema.optional().describe('Optional visibility settings.'),
    template_id: z
      .literal('investigation')
      .optional()
      .describe('Always the investigation template; accepted so Worker YAML stays as it was.'),
    metadata: z
      .record(z.string().max(256), metadataValueSchema)
      .refine((val) => Object.keys(val).length <= 100, {
        message: 'metadata may not have more than 100 keys',
      })
      .optional()
      .describe('Initial investigation fields (status, severity, description, ...).'),
  })
);
export type CreateInvestigationStepInput = z.infer<typeof createInvestigationStepInputSchema>;

export const createInvestigationStepOutputSchema = lazySchema(() =>
  z.object({
    conversation_id: z.string().describe('The new investigation (conversation) id.'),
    agent_id: z.string().describe('The agent of the investigation.'),
    template_id: z.string().optional().describe('Always "investigation".'),
    metadata: z
      .record(z.string(), z.unknown())
      .describe('The investigation fields after creation.'),
    case_id: z
      .string()
      .optional()
      .describe(
        'The case opened for the investigation, when the space opens one per investigation.'
      ),
  })
);

export const patchInvestigationStepInputSchema = lazySchema(() =>
  z.object({
    conversation_id: z
      .string()
      .min(1)
      .max(CONVERSATION_ID_MAX_LENGTH)
      .describe('Investigation id.'),
    updates: z
      .record(z.string().max(256), metadataValueSchema)
      .refine((val) => Object.keys(val).length > 0, {
        message: 'updates must include at least one field',
      })
      .refine((val) => Object.keys(val).length <= 100, {
        message: 'updates may not have more than 100 keys',
      })
      .describe('Investigation fields to change. Fields not listed are left as they are.'),
  })
);
export type PatchInvestigationStepInput = z.infer<typeof patchInvestigationStepInputSchema>;

export const patchInvestigationStepOutputSchema = lazySchema(() =>
  z.object({
    conversation_id: z.string().describe('The investigation id.'),
    changed_fields: z.array(z.string()).describe('Fields whose values changed.'),
    metadata: z
      .record(z.string(), z.unknown())
      .describe('The investigation fields after the patch.'),
  })
);

export const setHypothesesStepInputSchema = lazySchema(() =>
  z.object({
    conversationId: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH).describe('Investigation id.'),
    hypotheses: hypothesesListSchema.describe('The full list; replaces what is stored.'),
  })
);

export const setHypothesesStepOutputSchema = lazySchema(() =>
  z.object({
    count: z.number().describe('How many hypotheses the investigation now has.'),
  })
);

export const createInvestigationStepCommonDefinition: BaseStepDefinition<
  typeof createInvestigationStepInputSchema,
  typeof createInvestigationStepOutputSchema
> = {
  id: CreateInvestigationStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.createInvestigation.label', {
    defaultMessage: 'Create investigation',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.createInvestigation.description', {
    defaultMessage:
      'Creates an investigation. When the space opens a case for every investigation, the case opens too.',
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: createInvestigationStepInputSchema,
  outputSchema: createInvestigationStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.createInvestigation.documentation.details',
      {
        defaultMessage:
          'Takes the same input as ai.conversation.create with the investigation template. The output adds case_id when a case was opened.',
      }
    ),
    examples: [
      `- name: create_investigation
  type: ${CreateInvestigationStepId}
  with:
    template_id: investigation
    title: "Alert Triage"
    access_control:
      access_mode: public
    metadata:
      status: open`,
    ],
  },
};

export const patchInvestigationStepCommonDefinition: BaseStepDefinition<
  typeof patchInvestigationStepInputSchema,
  typeof patchInvestigationStepOutputSchema
> = {
  id: PatchInvestigationStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.patchInvestigation.label', {
    defaultMessage: 'Update investigation',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.patchInvestigation.description', {
    defaultMessage:
      "Changes an investigation's fields. When the investigation has its own case, verdict, summary, severity, and status follow onto the case.",
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: patchInvestigationStepInputSchema,
  outputSchema: patchInvestigationStepOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.agenticInvestigations.steps.patchInvestigation.documentation.details',
      {
        defaultMessage: 'Takes the same input as ai.conversation.metadata.patch.',
      }
    ),
    examples: [
      `- name: close_investigation
  type: ${PatchInvestigationStepId}
  with:
    conversation_id: "{{ inputs.conversation_id }}"
    updates:
      status: closed`,
    ],
  },
};

export const setHypothesesStepCommonDefinition: BaseStepDefinition<
  typeof setHypothesesStepInputSchema,
  typeof setHypothesesStepOutputSchema
> = {
  id: SetHypothesesStepId,
  label: i18n.translate('xpack.agenticInvestigations.steps.setHypotheses.label', {
    defaultMessage: 'Set hypotheses',
  }),
  description: i18n.translate('xpack.agenticInvestigations.steps.setHypotheses.description', {
    defaultMessage: "Replaces an investigation's hypotheses.",
  }),
  category: StepCategory.Kibana,
  stability: 'beta',
  inputSchema: setHypothesesStepInputSchema,
  outputSchema: setHypothesesStepOutputSchema,
};
