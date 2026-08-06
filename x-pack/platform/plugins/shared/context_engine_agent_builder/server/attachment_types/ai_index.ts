/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  AI_INDEX_ATTACHMENT_TYPE,
  aiIndexAttachmentDataSchema,
  type AiIndexAttachmentData,
} from '@kbn/context-engine-plugin/common/agent_builder_attachments';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '@kbn/context-engine-plugin/common/agent_builder_tools';

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
      'An `ai_index` attachment is a snapshot of an existing Context Engine AI index (destination,',
      'sources, and workflow automations). Sources and destination are already agreed — do not run',
      'discovery. Load the `ki-automation-generation` skill and follow its **When an ai_index attachment',
      'is present** section. When automations are listed, ask the user (via `ask_user_question`) whether',
      'to edit one listed workflow or create a new automation before drafting.',
      `After the user approves saving, call \`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\` with the`,
      'workflow attachment id from `generate_workflow`.',
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
