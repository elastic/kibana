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

const windowLine = (sinceHours: number | undefined): string[] =>
  sinceHours !== undefined ? [`| WHERE @timestamp >= NOW() - ${sinceHours} hours`] : [];

/**
 * Derives an ES|QL query from a single trace entry. Values are validated when the AI index is
 * written. `sinceHours` keeps only spans of the last N hours, filtered before anything else runs.
 */
export const buildTraceQuery = (
  trace: AiIndexTrace,
  spaceId: string,
  sinceHours?: number
): string => {
  if (trace.type === 'esql') {
    // A custom query's shape is unknown, so its window can only go last.
    return [trace.value, ...windowLine(sinceHours)].join('\n');
  }

  if (trace.type === 'index') {
    return [`FROM ${trace.value}`, ...windowLine(sinceHours)].join('\n');
  }

  const exportedAgentId = normalizeAgentIdForTelemetry(trace.value) ?? trace.value;
  // Use a Set because builtin agents are exported as their id, so the same id may appear twice.
  const literals = [...new Set([trace.value, exportedAgentId])].map(toEsqlStringLiteral).join(', ');
  const indexName = buildAgentBuilderTracesIndexName(spaceId);
  // Only the agent's own span carries its id; the chat and tool spans that hold the content are
  // its descendants in the same trace, so a trace is kept whole when the agent ran in it.
  return [
    `FROM ${indexName}`,
    ...windowLine(sinceHours),
    `| INLINE STATS agent_runs = COUNT(*) WHERE attributes.gen_ai.agent.id IN (${literals}) BY trace_id`,
    '| WHERE agent_runs > 0',
    '| DROP agent_runs',
  ].join('\n');
};

export const buildTraceQueries = (
  traces: AiIndexTrace[],
  spaceId: string,
  sinceHours?: number
): AiIndexTraceWithQuery[] =>
  traces.map((trace) => ({ ...trace, query: buildTraceQuery(trace, spaceId, sinceHours) }));
