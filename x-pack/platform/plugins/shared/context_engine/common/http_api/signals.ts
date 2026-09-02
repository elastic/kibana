/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Prefix for the per-space Context Engine signals indices (one index per Kibana space). */
export const SIGNAL_INDEX_PREFIX = 'context-engine-signals-';

/** The signals index name for a given Kibana space. */
export const buildSignalsIndexName = (spaceId: string): string =>
  `${SIGNAL_INDEX_PREFIX}${spaceId}`;

/** The set of signal types; `tool_call` is the first. */
export type SignalType = 'tool_call';

/** Common envelope shared by every signal. `signal_id` is the ES `_id`, so re-processing overwrites rather than duplicates. */
export interface SignalEnvelope {
  signal_id: string;
  '@timestamp': string;
  trace_ids?: string[];
  signal_type: SignalType;
  /** Classification labels; empty for a clean signal. */
  tags: string[];
  /** Per-type observation; opaque at the envelope level. */
  data: Record<string, unknown>;
}

/** First concrete signal type; others follow the same envelope. */
export interface EsqlToolCallSignal extends SignalEnvelope {
  signal_type: 'tool_call';
  data: {
    tool: string;
    query_kind: 'ki_retrieval' | 'raw_access' | 'other';
    target_index: string;
    status: 'Ok' | 'Error';
    looped: boolean;
    fell_back_to_raw: boolean;
    producer: string;
    span_id: string;
    conversation_id?: string;
    agent: { id: string; name: string; class: 'user' | 'management' };
    query?: string;
    // `columns` is optional because the paginated list read strips it from `_source`
    // (`SIGNAL_SOURCE_EXCLUDES` in server/signals/read.ts) — only `row_count` is needed there.
    // The write path (server/tasks/transform.ts) still populates a concrete array.
    returned: { columns?: string[]; row_count: number };
    error?: string;
    duration_ms: number;
    round_signals: { esql_count: number; raw_query_count: number; ki_retrieval_count: number };
  };
}

export type Signal = EsqlToolCallSignal;

/** A single row of the preaggregated grouped-by-tag Signals list. */
export interface SignalGroup {
  /** The tag/classification label (a plain keyword such as `query_error`). */
  tag: string;
  /** Number of signals carrying this tag across the whole signals store. */
  count: number;
}

/** Response of the grouped Signals list: a terms aggregation over the `tags` keyword field. */
export interface ListSignalGroupsResponse {
  groups: SignalGroup[];
}

/** Response of the per-group Signals fetch (paginated). */
export interface ListSignalsResponse {
  /** The individual signals carrying the requested tag. */
  signals: Signal[];
  /** Total number of signals carrying the tag (for pagination). */
  total: number;
}
