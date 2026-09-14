/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCustomHashedId } from '@kbn/agent-builder-server/telemetry';
import type { AiIndexTrace, AiIndexTraceWithQuery } from '../../common/http_api/ai_indices';
import { buildAgentBuilderTracesIndexName, SAFE_INDEX_NAME_RE } from '../../common/constants';

/** Escapes `\` and `"` in value and wraps it in double quotes for safe embedding in an ES|QL string expression. */
export const toEsqlStringLiteral = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Derives an ES|QL query from a single trace entry. Throws if the trace is invalid. */
export const buildTraceQuery = (trace: AiIndexTrace, spaceId: string): string => {
  if (trace.type === 'esql') {
    return trace.value;
  }

  if (trace.type === 'index') {
    if (!SAFE_INDEX_NAME_RE.test(trace.value)) {
      throw new Error(`Cannot derive ES|QL for index trace '${trace.value}'`);
    }
    return `FROM ${trace.value}`;
  }

  const rawLiteral = toEsqlStringLiteral(trace.value);
  const hashedLiteral = toEsqlStringLiteral(toCustomHashedId(trace.value));
  const indexName = buildAgentBuilderTracesIndexName(spaceId);
  return `FROM ${indexName}\n| WHERE attributes.gen_ai.agent.id IN (${rawLiteral}, ${hashedLiteral})`;
};

export const buildTraceQueries = (
  traces: AiIndexTrace[],
  spaceId: string
): AiIndexTraceWithQuery[] =>
  traces.map((trace) => ({ ...trace, query: buildTraceQuery(trace, spaceId) }));
