/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import { TRACES_INDEX_PATTERN } from '@kbn/evals-common';
import { extractTraceEvidence } from '../trace_evidence';
import type { TraceAccessor } from '../types';

interface GroundednessEvidence {
  user_query: string;
  agent_response: string;
  tool_call_history: Array<{
    tool_call_id?: string;
    tool_id?: string;
    arguments?: unknown;
    result?: unknown;
  }>;
}

export class IncompleteGroundednessEvidenceError extends Error {
  constructor(public readonly evidence: GroundednessEvidence, options?: { cause?: unknown }) {
    super('Groundedness evidence may be incomplete', options);
    this.name = 'IncompleteGroundednessEvidenceError';
  }
}

/**
 * Tool spans live in `traces-*`. Their argument/result attributes
 * (`gen_ai.tool.call.arguments`, `gen_ai.tool.call.result`) are `keyword`-mapped
 * with `ignore_above`, so large tool payloads (e.g. a full `list_indices`
 * result) are present in `_source` but NOT indexed into doc values. We read
 * `_source` via a regular `_search`: ES|QL reads doc values and returns `null`
 * for values above `ignore_above`, which makes the judge believe the tool
 * returned nothing and score genuine, grounded answers as hallucinations.
 */
const SPAN_KIND_FIELD = 'attributes.elastic.inference.span.kind';
const TOOL_SPAN_KIND = 'TOOL';
// Trace id is stored as `trace.id` in `traces-*` (vs `trace_id` in `logs-*`).
const TRACE_ID_FIELD = 'trace.id';

// Keys *within* the flattened `attributes` object of a span's `_source`.
const TOOL_CALL_ID_KEY = 'gen_ai.tool.call.id';
const TOOL_NAME_KEY = 'gen_ai.tool.name';
const TOOL_ARGUMENTS_KEY = 'gen_ai.tool.call.arguments';
const TOOL_RESULT_KEY = 'gen_ai.tool.call.result';

// A single trace rarely has more than a handful of tool calls; cap generously.
const MAX_TOOL_SPANS = 200;

interface ToolSpanSource {
  attributes?: Record<string, unknown>;
}

const parseJsonIfPossible = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return value;
  }
};

const readStringAttribute = (hit: SearchHit<ToolSpanSource>, key: string): string | undefined => {
  const value = hit._source?.attributes?.[key];
  return typeof value === 'string' ? value : undefined;
};

export const extractGroundednessEvidence = async (
  traceAccessor: TraceAccessor,
  log: Logger
): Promise<GroundednessEvidence> => {
  const { esClient, traceId } = traceAccessor;

  const chatEvidence = await extractTraceEvidence(traceAccessor);

  const baseEvidence: GroundednessEvidence = {
    user_query: chatEvidence.user_query,
    agent_response: chatEvidence.agent_response,
    tool_call_history: [],
  };

  if (!chatEvidence.agent_response.trim()) {
    log.warn(`Returning incomplete groundedness evidence for trace ${traceId}.`);
    throw new IncompleteGroundednessEvidenceError({ ...baseEvidence, agent_response: '' });
  }

  const toolResponse = await esClient.search<ToolSpanSource>({
    index: TRACES_INDEX_PATTERN,
    size: MAX_TOOL_SPANS,
    _source: ['attributes'],
    sort: [{ '@timestamp': { order: 'asc' } }],
    query: {
      bool: {
        filter: [
          { term: { [TRACE_ID_FIELD]: traceId } },
          { term: { [SPAN_KIND_FIELD]: TOOL_SPAN_KIND } },
        ],
      },
    },
  });

  const toolCallHistory = toolResponse.hits.hits.map((hit) => ({
    tool_call_id: readStringAttribute(hit, TOOL_CALL_ID_KEY),
    tool_id: readStringAttribute(hit, TOOL_NAME_KEY),
    arguments: parseJsonIfPossible(hit._source?.attributes?.[TOOL_ARGUMENTS_KEY]),
    result: parseJsonIfPossible(hit._source?.attributes?.[TOOL_RESULT_KEY]),
  }));

  return {
    ...baseEvidence,
    tool_call_history: toolCallHistory,
  };
};
