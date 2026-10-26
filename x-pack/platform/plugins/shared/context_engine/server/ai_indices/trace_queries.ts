/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeAgentIdForTelemetry } from '@kbn/agent-builder-server/telemetry';
import type { AiIndexTrace, AiIndexTraceWithQuery } from '../../common/http_api/ai_indices';
import { buildAgentBuilderTracesIndexName } from '../../common/constants';

/** Escapes `\` and `"` in value and wraps it in double quotes for safe embedding in an ES|QL string expression. */
export const toEsqlStringLiteral = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Derives an ES|QL query from a single trace entry. Values are validated when the AI index is written. */
export const buildTraceQuery = (trace: AiIndexTrace, spaceId: string): string => {
  if (trace.type === 'esql') {
    return trace.value;
  }

  if (trace.type === 'index') {
    return `FROM ${trace.value}`;
  }

  const exportedAgentId = normalizeAgentIdForTelemetry(trace.value) ?? trace.value;
  // Use a Set because builtin agents are exported as their id, so the same id may appear twice.
  const literals = [...new Set([trace.value, exportedAgentId])].map(toEsqlStringLiteral).join(', ');
  const indexName = buildAgentBuilderTracesIndexName(spaceId);
  return `FROM ${indexName}\n| WHERE attributes.gen_ai.agent.id IN (${literals})`;
};

export const buildTraceQueries = (
  traces: AiIndexTrace[],
  spaceId: string
): AiIndexTraceWithQuery[] =>
  traces.map((trace) => ({ ...trace, query: buildTraceQuery(trace, spaceId) }));
