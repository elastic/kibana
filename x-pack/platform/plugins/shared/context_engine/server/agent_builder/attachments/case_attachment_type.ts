/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type {
  AttachmentBoundedTool,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { CASE_ATTACHMENT_TYPE, contextEngineToolIds } from '../../../common/agent_builder/constants';
import type { CaseAttachmentData } from '../../../common/agent_builder/case_attachment';
import { isCaseAttachmentData } from '../../../common/agent_builder/case_attachment';

interface EsqlResult {
  columns: Array<{ name: string }>;
  values: unknown[][];
}

/** Slugify a value into the `[a-z0-9_]` charset so it is safe inside a tool id. */
const idSafe = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '_');

/** Human-readable summary of the failing case, inlined for the agent. */
const renderCase = ({ case: c, ai_index_id: aiIndexId, traces_index: tracesIndex, pattern }: CaseAttachmentData): string => {
  const lines = [
    `Failing Context Engine retrieval case for AI index "${aiIndexId}".`,
    pattern ? `Detected pattern: ${pattern.type}${pattern.sub_type ? ` · ${pattern.sub_type}` : ''} (${pattern.pattern_key}).` : undefined,
    '',
    `- status: ${c.status ?? 'unknown'}`,
    `- tool: ${c.tool}`,
    c.query_kind ? `- query kind: ${c.query_kind}` : undefined,
    c.target_index ? `- target index: ${c.target_index}` : undefined,
    typeof c.returned?.row_count === 'number' ? `- returned rows: ${c.returned.row_count}` : undefined,
    c.labels?.length ? `- labels: ${c.labels.map((l) => (l.sub_type ? `${l.type}/${l.sub_type}` : l.type)).join(', ')}` : undefined,
    c.query ? `\nQuery:\n${c.query}` : undefined,
    c.error ? `\nError:\n${c.error}` : undefined,
    '',
    `Originating trace: ${c.round_id}${tracesIndex ? ` (index ${tracesIndex})` : ''}.`,
    'Call get_case_trace to inspect the full agent trace (ordered tool calls, queries, and results) around this failure, then use get_ai_index / the ES|QL tools to verify and propose a bounded fix.',
  ];
  return lines.filter((l) => l !== undefined).join('\n');
};

/**
 * Attachment carrying a single failing case into a conversation. Exposes an
 * instance-scoped `get_case_trace` tool that pulls the originating trace's spans
 * from the AI index's trace index, plus the CE + ES|QL tools needed to fix the issue.
 */
export const createCaseAttachmentType = (): AttachmentTypeDefinition<
  typeof CASE_ATTACHMENT_TYPE,
  CaseAttachmentData
> => ({
  id: CASE_ATTACHMENT_TYPE,
  validate: (input) =>
    isCaseAttachmentData(input)
      ? { valid: true, data: input }
      : { valid: false, error: 'Invalid case attachment payload.' },
  format: (attachment) => {
    const data = attachment.data;
    const traceId = data.case.round_id;
    const tracesIndex = data.traces_index;

    const getCaseTrace: AttachmentBoundedTool = {
      id: `${CASE_ATTACHMENT_TYPE}.get_case_trace.${idSafe(data.case.case_id)}`,
      type: ToolType.builtin,
      description:
        `Fetch the agent trace for the failing case ${data.case.case_id} — the ordered spans ` +
        `(tool calls, ES|QL queries, and their results) of trace ${traceId}. Use it to understand ` +
        `what the agent did around the failure before proposing a fix.`,
      schema: z.object({}),
      handler: async (_args, { esClient }) => {
        if (!tracesIndex || !traceId) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: 'This case has no recorded trace index or trace id.' },
              },
            ],
          };
        }
        const query =
          `FROM ${tracesIndex} | WHERE trace_id == "${traceId}" ` +
          `| KEEP @timestamp, span_id, gen_ai.operation.name, gen_ai.tool.name, ` +
          `gen_ai.tool.call.arguments, gen_ai.tool.call.result, duration, status.code, status.message ` +
          `| SORT @timestamp ASC | LIMIT 200`;
        try {
          const result = (await esClient.asCurrentUser.esql.query({ query })) as unknown as EsqlResult;
          const names = result.columns.map((column) => column.name);
          const spans = result.values.map((row) =>
            Object.fromEntries(row.map((value, index) => [names[index], value]))
          );
          return {
            results: [
              {
                type: ToolResultType.other,
                data: { trace_id: traceId, index: tracesIndex, span_count: spans.length, spans },
              },
            ],
          };
        } catch (error) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: `Failed to fetch trace ${traceId}: ${error.message}` },
              },
            ],
          };
        }
      },
    };

    return {
      getRepresentation: () => ({ type: 'text', value: renderCase(data) }),
      getBoundedTools: () => [getCaseTrace],
    };
  },
  getTools: () => [
    contextEngineToolIds.getAiIndex,
    contextEngineToolIds.saveAutomation,
    platformCoreTools.executeEsql,
    platformCoreTools.generateEsql,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
  ],
  getAgentDescription: () =>
    'A failing Context Engine retrieval case. Call get_case_trace to inspect its originating agent trace, then diagnose and propose a bounded fix.',
  maxContentLength: 20_000,
});
