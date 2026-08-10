/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** User index holding every Context Engine signal, of every type. */
export const SIGNAL_INDEX = 'context-engine-signals';

/** The set of signal types grows over time; `tool_call` is the first (Stage 1). */
export type SignalType = 'tool_call';

/** A classification label attached by a classifier. Used for grouping, not filtering. */
export interface SignalTag {
  type: string;
  sub_type?: string;
  confidence: number;
}

/**
 * Fixed common envelope shared by every signal, of every type. Signals are
 * top-level / global — there is no `ai_index_id`. `signal_id` is the ES `_id`,
 * so re-processing a source overwrites rather than duplicates.
 */
export interface SignalEnvelope {
  signal_id: string;
  '@timestamp': string;
  trace_ids?: string[];
  signal_type: SignalType;
  /** Empty for a clean / unremarkable signal. */
  tags: SignalTag[];
  /** Per-type observation; opaque at the envelope level (indexed `flattened`). */
  data: Record<string, unknown>;
}

/** First concrete signal type (Stage 1); others follow the same envelope. */
export interface ToolCallSignal extends SignalEnvelope {
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
    returned: { columns: string[]; row_count: number };
    error?: string;
    duration_ms: number;
    round_signals: { esql_count: number; raw_query_count: number; ki_retrieval_count: number };
  };
}

export type Signal = ToolCallSignal;
