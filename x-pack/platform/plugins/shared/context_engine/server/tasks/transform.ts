/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolCallSignal } from '../../common/http_api/signals';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const LOOP_THRESHOLD = 3;
const MAX_SIGNAL_TEXT_LENGTH = 1024;

const KI_RETRIEVAL_PREFIXES = ['.ai-index', 'ki-', 'ai-index'];

/** Identifies the builder that produced a signal, recorded on `data.producer`. */
export const SIGNAL_PRODUCER = 'trace_tool';

type QueryKind = EsqlToolCallSignal['data']['query_kind'];
type AgentClass = EsqlToolCallSignal['data']['agent']['class'];

/** The `invoke_agent` span's identity, attached to every signal in its round. */
export interface AgentInfo {
  name: string;
  id: string;
  class: AgentClass;
  conversationId: string;
}

const UNKNOWN_AGENT: AgentInfo = { name: '', id: '', class: 'user', conversationId: '' };

/** One `execute_tool` span projected to the columns the builder needs. */
export interface ExecuteToolSpan {
  '@timestamp': string;
  trace_id: string;
  span_id: string;
  'attributes.gen_ai.tool.name'?: string | null;
  'attributes.gen_ai.tool.call.id'?: string | null;
  'attributes.gen_ai.tool.call.arguments'?: string | null;
  'attributes.gen_ai.tool.call.result'?: string | null;
  duration?: number | null;
  'status.code'?: string | null;
  'status.message'?: string | null;
}

export interface BuildInput {
  toolRows: ExecuteToolSpan[];
  convAgent: Map<string, AgentInfo>;
}

/** Extracts the index expression from an ES|QL `FROM` clause, if present. */
export const parseFromClause = (query: unknown): string | undefined => {
  if (typeof query !== 'string') {
    return undefined;
  }
  const match = query.match(/FROM\s+([^|]+)/i);
  if (!match) {
    return undefined;
  }
  const [indexExpression] = match[1].trim().split(/\s+METADATA\s+/i);
  const cleaned = indexExpression.trim().replace(/^["'`]+|["'`]+$/g, '');
  return cleaned || undefined;
};

export const queryKindFor = (targetIndex: string | undefined): QueryKind => {
  if (!targetIndex) {
    return 'other';
  }
  const isKiRetrieval = targetIndex
    .split(',')
    .every((expression) =>
      KI_RETRIEVAL_PREFIXES.some((prefix) => expression.trim().toLowerCase().startsWith(prefix))
    );
  return isKiRetrieval ? 'ki_retrieval' : 'raw_access';
};

interface ParsedReturned {
  columns: string[];
  row_count: number;
}

const EMPTY_RETURNED: ParsedReturned = { columns: [], row_count: 0 };

interface EsqlResultsData {
  columns?: Array<{ name?: string } | string>;
  values?: unknown[][];
}

const extractEsqlResultsData = (parsed: unknown): EsqlResultsData | undefined => {
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }
  const envelope = parsed as { results?: Array<{ data?: EsqlResultsData }> } & EsqlResultsData;
  if (Array.isArray(envelope.results)) {
    const esqlResult = envelope.results.find(
      (entry) => entry.data && ('columns' in entry.data || 'values' in entry.data)
    );
    return esqlResult?.data;
  }
  if ('columns' in envelope || 'values' in envelope) {
    return envelope;
  }
  return undefined;
};

export const parseReturned = (result: string | undefined | null): ParsedReturned => {
  if (!result) {
    return EMPTY_RETURNED;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result);
  } catch {
    return EMPTY_RETURNED;
  }

  const esqlData = extractEsqlResultsData(parsed);
  if (!esqlData) {
    return EMPTY_RETURNED;
  }

  const columns = (esqlData.columns ?? []).map((column) =>
    typeof column === 'string' ? column : column.name ?? ''
  );
  return { columns, row_count: esqlData.values?.length ?? 0 };
};

interface ToolCallArguments {
  query?: unknown;
}

const parseArguments = (args: string | undefined | null): ToolCallArguments => {
  if (!args) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(args);
    return parsed && typeof parsed === 'object' ? (parsed as ToolCallArguments) : {};
  } catch {
    return {};
  }
};

interface RoundSignals {
  esql_count: number;
  raw_query_count: number;
  ki_retrieval_count: number;
  looped: boolean;
  fell_back_to_raw: boolean;
}

const computeRoundSignals = (kinds: QueryKind[]): RoundSignals => {
  const esqlCount = kinds.filter((kind) => kind !== 'other').length;
  const rawQueryCount = kinds.filter((kind) => kind === 'raw_access').length;
  const kiRetrievalCount = kinds.filter((kind) => kind === 'ki_retrieval').length;
  return {
    esql_count: esqlCount,
    raw_query_count: rawQueryCount,
    ki_retrieval_count: kiRetrievalCount,
    looped: esqlCount >= LOOP_THRESHOLD,
    // A genuine fallback: the round tried a KI retrieval and *also* hit raw
    // access. A raw-only round is direct access, not a fallback (it is still
    // surfaced per-signal as a `coverage_gap` tag in `classify`).
    fell_back_to_raw: kiRetrievalCount > 0 && rawQueryCount > 0,
  };
};

const groupByRound = (toolRows: ExecuteToolSpan[]): Map<string, ExecuteToolSpan[]> => {
  const byRound = new Map<string, ExecuteToolSpan[]>();
  for (const row of toolRows) {
    const rows = byRound.get(row.trace_id);
    if (rows) {
      rows.push(row);
    } else {
      byRound.set(row.trace_id, [row]);
    }
  }
  return byRound;
};

/**
 * Builds one `EsqlToolCallSignal` per esql/query `execute_tool` span. Tool calls
 * that don't resolve to an esql query (`query_kind === 'other'`) are skipped —
 * they carry no `target_index`/`query` and aren't actionable as signals. Round
 * context is still computed over the whole round.
 */
export const build = ({ toolRows, convAgent }: BuildInput): EsqlToolCallSignal[] => {
  const signals: EsqlToolCallSignal[] = [];

  for (const [traceId, rows] of groupByRound(toolRows)) {
    const agent = convAgent.get(traceId) ?? UNKNOWN_AGENT;

    const queries = rows.map(
      (row) => parseArguments(row['attributes.gen_ai.tool.call.arguments']).query
    );
    const targetIndices = queries.map(parseFromClause);
    const kinds = targetIndices.map(queryKindFor);
    const round = computeRoundSignals(kinds);

    rows.forEach((row, i) => {
      if (kinds[i] === 'other') {
        return;
      }
      const rawQuery = queries[i];
      const query =
        typeof rawQuery === 'string' ? rawQuery.slice(0, MAX_SIGNAL_TEXT_LENGTH) : undefined;
      const targetIndex = targetIndices[i];
      const returned = parseReturned(row['attributes.gen_ai.tool.call.result']);
      const errorMessage = row['status.message']?.slice(0, MAX_SIGNAL_TEXT_LENGTH);

      signals.push({
        signal_id: `${traceId}:${row.span_id}`,
        '@timestamp': row['@timestamp'],
        trace_ids: [traceId],
        signal_type: 'tool_call',
        tags: [],
        data: {
          tool: row['attributes.gen_ai.tool.name'] ?? '',
          query_kind: kinds[i],
          target_index: targetIndex ?? '',
          status: row['status.code'] === 'Error' ? 'Error' : 'Ok',
          looped: round.looped,
          fell_back_to_raw: round.fell_back_to_raw,
          producer: SIGNAL_PRODUCER,
          span_id: row.span_id,
          ...(agent.conversationId ? { conversation_id: agent.conversationId } : {}),
          agent: { id: agent.id, name: agent.name, class: agent.class },
          ...(query ? { query } : {}),
          returned,
          ...(errorMessage ? { error: errorMessage } : {}),
          duration_ms: (row.duration ?? 0) / NANOSECONDS_PER_MILLISECOND,
          round_signals: {
            esql_count: round.esql_count,
            raw_query_count: round.raw_query_count,
            ki_retrieval_count: round.ki_retrieval_count,
          },
        },
      });
    });
  }

  return signals;
};
