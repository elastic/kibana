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
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  ANALYZE_AND_IMPROVE_SKILL_ID,
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
  // This attachment is what grants the conversation authority to write, so the interaction
  // choreography lives here rather than in the skills. They describe what should change and are
  // loaded by unattended runs too, where none of the steps below have anyone to answer them.
  getAgentDescription: () =>
    [
      'An `ai_index` attachment is a read-only snapshot of a Context Engine AI index (destination,',
      'sources, and workflow automations). Use it to scope the conversation to this index — do not',
      're-run discovery for destination or sources already listed here.',
      `Before acting on this index, load \`${ANALYZE_AND_IMPROVE_SKILL_ID}\` to decide what it should`,
      `hold. That skill is read-only: also load \`${AI_INDEX_AUTOMATIONS_SKILL_ID}\` to draft,`,
      `validate or run an automation, and \`${AI_INDEX_SOURCES_SKILL_ID}\` to choose or change the`,
      `data it draws on. For querying KIs in this index, load \`${KI_RETRIEVAL_SKILL_ID}\`.`,
      'This attachment authorizes you to apply changes, not only to propose them.',
      'Decide rather than ask. Pick the strategy and the corpus filter yourself from the attachment',
      'and the data, and state the choice and the reason for it in one line as you draft. Ask only',
      'when the evidence cannot settle a choice that changes what gets written, and use',
      '`ask_user_question` when you do, rather than paraphrasing the options as chat text.',
      'Draft a pilot limited to 1–3 KIs, and inspect its output with the user before expanding.',
      `After \`generate_workflow\`, render the diff in chat first, then call \`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\``,
      'with the workflow attachment id — in the same assistant turn but a separate model step after',
      'the diff is visible. Do not batch save with generate_workflow. If save runs in a later turn,',
      're-render the diff first.',
      'Render the diff attachment only. Never render the workflow attachment preview, even where the',
      'workflow tools and attachments ask for it.',
      'Whether to save is not a question to put to the user: the save tool opens its own confirmation',
      'dialog, and that dialog is where they accept or reject. Never end a turn asking for permission',
      'to save, and never offer saving and running as a choice — call save and let them answer there.',
      'If user saved the workflow offer running and validating it via ask_user_question.',
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
