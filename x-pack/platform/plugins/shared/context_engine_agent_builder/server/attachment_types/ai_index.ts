/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../common/agent_builder_attachments';
import {
  aiIndexAttachmentDataSchema,
  type AiIndexAttachmentData,
} from '../../common/agent_builder_attachment_schemas';
import {
  KI_AUTOMATION_GENERATION_SKILL_ID,
  KI_RETRIEVAL_SKILL_ID,
} from '../../common/agent_builder_skills';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../common/agent_builder_tools';

/**
 * Server-side definition for the `ai_index` attachment type — a read-only snapshot
 * of a Context Engine AI index.
 */
export const createAiIndexAttachmentType = (): AttachmentTypeDefinition<
  typeof AI_INDEX_ATTACHMENT_TYPE,
  AiIndexAttachmentData
> => ({
  id: AI_INDEX_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parsed = aiIndexAttachmentDataSchema.safeParse(input);
    if (parsed.success) {
      return { valid: true, data: parsed.data };
    }
    return {
      valid: false,
      error: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  },
  format: (attachment) => {
    return {
      getRepresentation: () => ({ type: 'text', value: formatAiIndex(attachment.data) }),
    };
  },
  getAgentDescription: () =>
    [
      'An `ai_index` attachment is a read-only snapshot of a Context Engine AI index (destination,',
      'sources, and workflow automations). Use it to scope the conversation to this index — do not',
      're-run discovery for destination or sources already listed here.',
      `For querying KIs in this index, load the \`${KI_RETRIEVAL_SKILL_ID}\` skill.`,
      `To draft or edit workflow automations, load \`${KI_AUTOMATION_GENERATION_SKILL_ID}\` (or follow`,
      "the user's initial message if it already references that skill).",
      'When automations are listed and the user wants to edit one, use `ask_user_question` before',
      '`generate_workflow`. When editing, ask what should change before calling `generate_workflow`.',
      `After \`generate_workflow\`, render the diff in chat first, then call \`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\``,
      'with the workflow attachment id — in the same assistant turn but a separate model step after',
      'the diff is visible. Do not batch save with generate_workflow. If save runs in a later turn,',
      're-render the diff first. Platform confirms before persisting.',
      'If the user saved manually from the diff card, pass `workflowId` instead.',
    ].join(' '),
  getTools: () => [CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID],
});

const formatAiIndex = (data: AiIndexAttachmentData): string => {
  const parts: string[] = [`AI index: ${data.id}`];

  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  parts.push(`Destination: ${data.dest.type} "${data.dest.value}"`);

  parts.push(
    data.sources.length > 0
      ? `Sources: ${data.sources.map((source) => `${source.type}:${source.value}`).join(', ')}`
      : 'Sources: none configured'
  );

  parts.push(
    data.automations.length > 0
      ? `Existing automations (workflow ids): ${data.automations
          .map((automation) => automation.value)
          .join(', ')}`
      : 'Existing automations: none'
  );

  return parts.join('\n');
};
