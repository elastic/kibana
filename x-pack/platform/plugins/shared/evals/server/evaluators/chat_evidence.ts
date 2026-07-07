/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { isValidTraceId } from '@opentelemetry/api';
import { LOGS_INDEX_PATTERN } from '@kbn/evals-common';
import type { TraceAccessor, TraceEvidence } from './types';

/**
 * Chat content lives in `gen_ai.*` span-event log records. The content fields
 * (`attributes.content`, `attributes.message.content`) are `keyword`-mapped with
 * `ignore_above`, so long assistant answers are present in `_source` but are NOT
 * indexed into doc values. We therefore read `_source` via a regular `_search`
 * rather than ES|QL — ES|QL reads doc values and returns `null` for values above
 * `ignore_above`, which silently drops long final answers.
 */
const USER_MESSAGE_EVENT = 'gen_ai.user.message';
const AGENT_RESPONSE_EVENT = 'gen_ai.choice';

// Keys *within* the flattened `attributes` object of a log record's `_source`.
const USER_MESSAGE_CONTENT_KEY = 'content';
const AGENT_RESPONSE_CONTENT_KEY = 'message.content';

// Mapped field path used for querying (distinct from the `_source` key above).
const FINISH_REASON_FIELD = 'attributes.finish_reason';
const TOOL_CALL_FINISH_REASON = 'tool_calls';

interface ChatEventSource {
  attributes?: Record<string, unknown>;
}

const readAttribute = (hit: SearchHit<ChatEventSource> | undefined, key: string): string => {
  const value = hit?._source?.attributes?.[key];
  return typeof value === 'string' ? value : '';
};

/**
 * Reconstructs judge evidence from a *conversation* trace (an agent/chat run)
 * using the OTel Gen AI conversation semconv. Returns `null` when the trace
 * carries no `gen_ai.user.message` span event — i.e. it is not a conversation
 * (e.g. a bare `tools/_execute` run) — so the caller can fall back to another
 * evidence shape. Real query failures propagate.
 */
export const extractConversationEvidence = async (
  traceAccessor: TraceAccessor
): Promise<TraceEvidence | null> => {
  const { esClient, traceId } = traceAccessor;

  if (!isValidTraceId(traceId)) {
    throw new Error('Invalid trace_id: must be a 32-character hex string');
  }

  const userMsgResponse = await esClient.search<ChatEventSource>({
    index: LOGS_INDEX_PATTERN,
    size: 1,
    _source: ['attributes'],
    sort: [{ '@timestamp': { order: 'asc' } }],
    query: {
      bool: {
        filter: [{ term: { trace_id: traceId } }, { term: { event_name: USER_MESSAGE_EVENT } }],
      },
    },
  });

  const userHits = userMsgResponse.hits.hits;
  if (userHits.length === 0) {
    return null;
  }

  const userQuery = readAttribute(userHits[0], USER_MESSAGE_CONTENT_KEY);

  /**
   * The agent's answer is the latest `gen_ai.choice` whose turn is *not* a tool
   * request. In tool-using conversations the model emits one `gen_ai.choice` per
   * turn: intermediate tool-requesting turns carry `finish_reason: "tool_calls"`
   * and often include filler content (e.g. "I'll list the indices now.") that is
   * an intent statement rather than the answer. Those turns are also exported to
   * logs *before* the final turn, so grading the latest choice unconditionally
   * can score the intent instead of the answer — a false negative. We exclude
   * `tool_calls` turns and keep the terminal turn (`finish_reason: "stop"`,
   * "length", or unset for targets that don't emit one).
   */
  const agentRespResponse = await esClient.search<ChatEventSource>({
    index: LOGS_INDEX_PATTERN,
    size: 1,
    _source: ['attributes'],
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: {
      bool: {
        filter: [{ term: { trace_id: traceId } }, { term: { event_name: AGENT_RESPONSE_EVENT } }],
        must_not: [{ term: { [FINISH_REASON_FIELD]: TOOL_CALL_FINISH_REASON } }],
      },
    },
  });

  const agentResponse = readAttribute(agentRespResponse.hits.hits[0], AGENT_RESPONSE_CONTENT_KEY);

  return { user_query: userQuery, agent_response: agentResponse };
};
