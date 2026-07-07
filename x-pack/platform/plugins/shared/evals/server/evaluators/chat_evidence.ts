/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceAccessor } from './types';
import { createTraceAccessor } from './trace_accessor';

const USER_MESSAGE_CONTENT_ATTR = 'content';
const AGENT_RESPONSE_CONTENT_ATTR = 'message.content';

interface EventSource {
  attributes?: Record<string, unknown>;
}

const getAttribute = (doc: EventSource, attr: string): string | null => {
  const value = doc.attributes?.[attr];
  return typeof value === 'string' ? value : null;
};

/**
 * DSL, not ES|QL: `gen_ai.*` event content routinely exceeds the default
 * keyword `ignore_above` (1024 chars), which drops the value from doc values
 * (ES|QL reads doc values, so it would see `null`) while leaving it intact in
 * `_source` (which a DSL search reads).
 */
export const extractChatEvidence = async (
  traceAccessor: TraceAccessor
): Promise<{ user_query: string; agent_response: string }> => {
  const accessor = createTraceAccessor(traceAccessor);

  const userMsgHits = await accessor.search<EventSource>('logs', {
    filter: [{ term: { event_name: 'gen_ai.user.message' } }],
    sort: [{ '@timestamp': { order: 'asc' } }],
    size: 1,
    fields: [`attributes.${USER_MESSAGE_CONTENT_ATTR}`],
  });

  if (userMsgHits.length === 0) {
    throw new Error(`No user message span events found for trace ${accessor.traceId}`);
  }

  const userQuery = getAttribute(userMsgHits[0], USER_MESSAGE_CONTENT_ATTR) ?? '';

  const agentRespHits = await accessor.search<EventSource>('logs', {
    filter: [{ term: { event_name: 'gen_ai.choice' } }],
    sort: [{ '@timestamp': { order: 'desc' } }],
    size: 1,
    fields: [`attributes.${AGENT_RESPONSE_CONTENT_ATTR}`],
  });
  const agentResponse =
    agentRespHits.length > 0
      ? getAttribute(agentRespHits[0], AGENT_RESPONSE_CONTENT_ATTR) ?? ''
      : '';

  return { user_query: userQuery, agent_response: agentResponse };
};
