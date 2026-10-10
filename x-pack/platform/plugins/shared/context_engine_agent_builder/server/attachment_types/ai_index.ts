/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { AiIndexTraceWithQuery } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../common/agent_builder_attachments';
import {
  aiIndexAttachmentDataSchema,
  type AiIndexAttachmentData,
} from '../../common/agent_builder_attachment_schemas';
import {
  CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
  CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
} from '../../common/agent_builder_tools';

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
  // The attachment carries the index snapshot and the authority to write to it, nothing more.
  // How a setup conversation goes and how the agent talks live in the Context Engine agent's
  // instructions (server/agent/instructions/context_engine_setup.md.text): there they are part of
  // the system prompt, instead of arriving in a user message for whichever agent has the attachment.
  getAgentDescription: () =>
    [
      'An `ai_index` attachment is a read-only snapshot of a Context Engine AI index (destination,',
      'sources, workflow automations, and traces). Use it to scope the conversation to this index — do not',
      're-run discovery for destination or sources already listed here.',
      'This attachment authorizes you to apply changes to this index, not only to propose them: it',
      `provides \`${CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID}\` and`,
      `\`${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}\` for this index.`,
    ].join(' '),
  getTools: () => [
    CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
    CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
  ],
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

  parts.push(
    data.traces.length > 0
      ? `Traces:\n${data.traces.map((trace) => `- ${formatTrace(trace)}`).join('\n')}`
      : 'Traces: none configured'
  );

  parts.push(`feedbackLoopEnabled: ${data.feedbackLoopEnabled ?? false}`);

  return parts.join('\n');
};

// For 'esql' traces, value is already the query, so showing both would just repeat it.
const formatTrace = (trace: AiIndexTraceWithQuery): string => {
  if (trace.type === 'esql') {
    return `esql: ${trace.query.replace(/\n/g, ' ')}`;
  }
  return `${trace.type}:${trace.value} -> ${trace.query.replace(/\n/g, ' ')}`;
};
