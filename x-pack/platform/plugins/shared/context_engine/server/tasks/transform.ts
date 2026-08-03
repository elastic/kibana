/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseDocument, CaseQueryKind } from '../cases/storage';

/**
 * Pure trace → case transform, ported from the prototype validated against
 * `traces-agent_builder.otel-default`. No Elasticsearch access here so it can be
 * unit-tested against fixtures.
 */

/** The management agent's own trace-analysis queries are excluded from the loop. */
export const MANAGEMENT_AGENT_NAME = 'Context Engine management agent';

/** Tool spans whose ES|QL we treat as a retrieval/generation event. */
const ESQL_TOOL = 'platform.core.execute_esql';

export type ToolSpanRow = Record<string, unknown>;

const str = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

export const parseFromClause = (query?: string): string | undefined => {
  if (!query) {
    return undefined;
  }
  const match = /\bFROM\s+([^\s|,]+)/i.exec(query);
  return match ? match[1] : undefined;
};

export const queryKindFor = (targetIndex?: string): CaseQueryKind => {
  if (!targetIndex) {
    return 'other';
  }
  if (
    targetIndex.startsWith('.ai-index') ||
    targetIndex.startsWith('ki-') ||
    targetIndex.includes('ai-index')
  ) {
    return 'ki_retrieval';
  }
  return 'raw_access';
};

export const parseQuery = (argumentsRaw: unknown): string | undefined => {
  if (typeof argumentsRaw !== 'string') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(argumentsRaw) as { query?: unknown };
    return typeof parsed.query === 'string' ? parsed.query : undefined;
  } catch {
    return undefined;
  }
};

export const parseReturned = (resultRaw: unknown): CaseDocument['returned'] | undefined => {
  if (typeof resultRaw !== 'string') {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(resultRaw);
  } catch {
    return undefined;
  }
  const blocks = Array.isArray(parsed)
    ? parsed
    : (parsed as { results?: unknown }).results;
  if (!Array.isArray(blocks)) {
    return undefined;
  }
  const block = blocks.find(
    (b): b is { type: string; data?: { columns?: Array<{ name?: string }>; values?: unknown[] } } =>
      typeof b === 'object' && b !== null && (b as { type?: string }).type === 'esql_results'
  );
  if (!block) {
    return undefined;
  }
  const columns = (block.data?.columns ?? [])
    .map((column) => column?.name)
    .filter((name): name is string => Boolean(name));
  const rowCount = Array.isArray(block.data?.values) ? block.data!.values.length : 0;
  return { columns, row_count: rowCount };
};

/**
 * Turns a batch of `execute_tool` spans into cases (0..n per trace). `convAgent`
 * maps `gen_ai.conversation.id` → agent name (resolved from `invoke_agent`
 * spans, since the tool spans themselves carry a null agent).
 */
export const buildCases = ({
  toolRows,
  convAgent,
  aiIndexId,
}: {
  toolRows: ToolSpanRow[];
  convAgent: Map<string, string>;
  aiIndexId: string;
}): CaseDocument[] => {
  const byTrace = new Map<string, ToolSpanRow[]>();
  for (const row of toolRows) {
    const traceId = str(row.trace_id);
    if (!traceId) {
      continue;
    }
    const group = byTrace.get(traceId);
    if (group) {
      group.push(row);
    } else {
      byTrace.set(traceId, [row]);
    }
  }

  const cases: CaseDocument[] = [];
  for (const [traceId, rows] of byTrace) {
    const parsed = rows.map((row) => {
      const query = parseQuery(row['gen_ai.tool.call.arguments']);
      const targetIndex = parseFromClause(query);
      return { row, query, targetIndex };
    });

    const esqlCount = parsed.filter(
      (p) => p.row['gen_ai.tool.name'] === ESQL_TOOL
    ).length;
    const rawCount = parsed.filter(
      (p) => p.targetIndex && queryKindFor(p.targetIndex) === 'raw_access'
    ).length;
    const kiCount = parsed.filter(
      (p) => p.targetIndex && queryKindFor(p.targetIndex) === 'ki_retrieval'
    ).length;
    const roundSignals: CaseDocument['round_signals'] = {
      esql_count: esqlCount,
      raw_query_count: rawCount,
      ki_retrieval_count: kiCount,
      looped: esqlCount >= 3,
      fell_back_to_raw: kiCount > 0 && rawCount > 0,
    };

    for (const { row, query, targetIndex } of parsed) {
      const conversationId = str(row['gen_ai.conversation.id']);
      const agentName = conversationId ? convAgent.get(conversationId) : undefined;
      const spanId = str(row.span_id) ?? '';
      const duration = row.duration;
      cases.push({
        case_id: `${traceId}:${spanId}`,
        ai_index_id: aiIndexId,
        conversation_id: conversationId,
        round_id: traceId,
        span_id: spanId,
        tool_call_id: str(row['gen_ai.tool.call.id']),
        '@timestamp': str(row['@timestamp']) ?? '',
        agent: {
          name: agentName,
          class: agentName === MANAGEMENT_AGENT_NAME ? 'management' : 'user',
        },
        tool: str(row['gen_ai.tool.name']) ?? '',
        query,
        query_kind: query ? queryKindFor(targetIndex) : undefined,
        target_index: targetIndex,
        returned: parseReturned(row['gen_ai.tool.call.result']),
        status: str(row['status.code']),
        error: str(row['status.message']),
        duration_ms: typeof duration === 'number' ? duration / 1e6 : undefined,
        round_signals: roundSignals,
        classified: false,
      });
    }
  }
  return cases;
};
