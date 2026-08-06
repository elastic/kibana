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
} from '../../common/agent_builder_attachments';
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
      'An `ai_index` attachment is a snapshot of an existing Context Engine AI index:',
      'its id, description, destination (data stream or index Knowledge Indicators are written to),',
      'already-configured sources, and current automations.',
      'Sources and destination are already agreed — do not re-run source discovery for them.',
      'Use the `ki-automation-generation` skill: sample the listed sources, then draft and test',
      'a workflow automation (via `generate_workflow` / `execute_workflow`) that populates the',
      'destination with Knowledge Indicators for this AI index.',
      'After the user approves saving the generated workflow, call',
      `\`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\` with the workflow attachment id from`,
      'generate_workflow to persist the workflow and register it on this AI index.',
      'If the user saved manually from the diff card instead, call the same tool with workflowId',
      'set to the saved workflow id.',
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
