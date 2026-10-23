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
      'When a source carries `fields` or `sample_documents`, an automation carries `yaml`, or',
      '`signals_summary`/a trace carries `row_count`, that is already the result of inspecting it —',
      'use it directly rather than calling `get_index_mapping`, `execute_esql` or `get_workflow` for',
      'the same thing again. Their absence (or an `inspection_error`/`fetch_error`/`count_error`)',
      'means the attempt was made and did not produce it, not that it was skipped.',
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
      ? `Sources:\n${data.sources.map((source) => `- ${formatSource(source)}`).join('\n')}`
      : 'Sources: none configured'
  );

  parts.push(
    data.automations.length > 0
      ? `Existing automations:\n${data.automations
          .map((automation) => `- ${formatAutomation(automation)}`)
          .join('\n')}`
      : 'Existing automations: none'
  );

  parts.push(
    data.traces.length > 0
      ? `Traces:\n${data.traces.map((trace) => `- ${formatTrace(trace)}`).join('\n')}`
      : 'Traces: none configured'
  );

  if (data.signals_summary) {
    parts.push(formatSignalsSummary(data.signals_summary));
  }

  return parts.join('\n');
};

const formatSource = (source: AiIndexAttachmentData['sources'][number]): string => {
  const header = `${source.type}:${source.value}`;
  if (source.inspection_error) {
    return `${header} (could not be inspected: ${source.inspection_error})`;
  }
  if (source.row_count === undefined) {
    return header;
  }
  const fields = (source.fields ?? []).map((field) => `${field.path}: ${field.type}`).join(', ');
  const sample =
    source.sample_documents && source.sample_documents.length > 0
      ? `\n  sample: ${JSON.stringify(source.sample_documents)}`
      : '';
  return `${header} — ${source.row_count} row(s)${fields ? `, fields: ${fields}` : ''}${sample}`;
};

const formatAutomation = (automation: AiIndexAttachmentData['automations'][number]): string => {
  if (automation.fetch_error) {
    return `${automation.value} (definition could not be read: ${automation.fetch_error})`;
  }
  if (!automation.yaml) {
    return automation.value;
  }
  return `${automation.value}:\n${automation.yaml
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')}`;
};

// For 'esql' traces, value is already the query, so showing both would just repeat it.
const formatTrace = (trace: AiIndexAttachmentData['traces'][number]): string => {
  const base =
    trace.type === 'esql'
      ? `esql: ${trace.query.replace(/\n/g, ' ')}`
      : `${trace.type}:${trace.value} -> ${trace.query.replace(/\n/g, ' ')}`;
  if (trace.count_error) {
    return `${base} (count failed: ${trace.count_error})`;
  }
  return trace.row_count === undefined ? base : `${base} — ${trace.row_count} row(s)`;
};

const formatSignalsSummary = (summary: NonNullable<AiIndexAttachmentData['signals_summary']>) => {
  if (summary.total === 0) {
    return 'Signals: none yet.';
  }
  const byTag = summary.by_tag.map(({ tag, count }) => `${tag}: ${count}`).join(', ');
  return `Signals: ${summary.total} (${byTag})`;
};
