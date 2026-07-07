/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { isValidTraceId } from '@opentelemetry/api';
import { TRACES_INDEX_PATTERN } from '@kbn/evals-common';
import type { TraceAccessor, TraceEvidence } from './types';

/**
 * A tool execution is recorded as an `execute_tool` span in `traces-*` following
 * the OTel Gen AI tool semconv. Its input/output live on the span attributes
 * `gen_ai.tool.call.arguments` / `gen_ai.tool.call.result`. Those are
 * `keyword`-mapped with `ignore_above`, so large payloads are present in
 * `_source` but NOT in doc values — we read `_source` via `_search` (not ES|QL)
 * for the same reason as the conversation evidence. We map the tool's input to
 * `user_query` and its output to `agent_response` (the question/answer analogues
 * for a tool) so the same LLM judges can grade a bare tool run.
 *
 * Crucially, an LLM-backed tool runs its own inference INSIDE the tool span, and
 * that nested call emits `gen_ai.user.message` / `gen_ai.choice` on the SAME
 * trace (inference detaches only the outermost span; nested inference keeps the
 * tracking beacon and stays put). Those events are the tool's *internal* prompt,
 * not the caller's question. So the mere presence of a tool span does NOT mean
 * "this is a bare tool run". We reconstruct tool evidence only when the trace's
 * ROOT span (the one with no parent) is itself an `execute_tool` span — i.e. the
 * outermost layer is the tool. That distinguishes a bare `tools/_execute` run
 * (tool at the root) from a conversation that merely calls a tool (agent/chain
 * at the root, tool nested), which must be graded as a conversation instead.
 */
const TRACE_ID_FIELD = 'trace_id';
const PARENT_SPAN_ID_FIELD = 'parent_span_id';

// Keys *within* the flattened `attributes` object of a span's `_source`.
const SPAN_KIND_KEY = 'elastic.inference.span.kind';
const TOOL_SPAN_KIND = 'TOOL';
const TOOL_ARGUMENTS_KEY = 'gen_ai.tool.call.arguments';
const TOOL_RESULT_KEY = 'gen_ai.tool.call.result';

interface ToolSpanSource {
  attributes?: Record<string, unknown>;
}

const readAttribute = (hit: SearchHit<ToolSpanSource> | undefined, key: string): string => {
  const value = hit?._source?.attributes?.[key];
  return typeof value === 'string' ? value : '';
};

/**
 * Reconstructs judge evidence from a *tool-execution* trace. Returns `null` when
 * the trace's root span is not an `execute_tool` span — i.e. the trace is not a
 * bare tool execution — so the caller can fall back to conversation evidence.
 * Real query failures propagate.
 */
export const extractToolEvidence = async (
  traceAccessor: TraceAccessor
): Promise<TraceEvidence | null> => {
  const { esClient, traceId } = traceAccessor;

  if (!isValidTraceId(traceId)) {
    throw new Error('Invalid trace_id: must be a 32-character hex string');
  }

  // The root span is the one with no parent; inference detaches the outermost
  // span, so a bare tool run's `execute_tool` span becomes a parentless root.
  const rootResponse = await esClient.search<ToolSpanSource>({
    index: TRACES_INDEX_PATTERN,
    size: 1,
    _source: ['attributes'],
    sort: [{ '@timestamp': { order: 'asc' } }],
    query: {
      bool: {
        filter: [{ term: { [TRACE_ID_FIELD]: traceId } }],
        must_not: [{ exists: { field: PARENT_SPAN_ID_FIELD } }],
      },
    },
  });

  const rootHit = rootResponse.hits.hits[0];
  if (!rootHit) {
    return null;
  }

  if (rootHit._source?.attributes?.[SPAN_KIND_KEY] !== TOOL_SPAN_KIND) {
    return null;
  }

  return {
    user_query: readAttribute(rootHit, TOOL_ARGUMENTS_KEY),
    agent_response: readAttribute(rootHit, TOOL_RESULT_KEY),
  };
};
