/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceAccessor } from './types';
import { createTraceAccessor } from './trace_accessor';
import { rowsFromEsqlResponse } from './esql_utils';

const USER_MESSAGE_CONTENT_COLUMN = 'attributes.content';
const AGENT_RESPONSE_CONTENT_COLUMN = 'attributes.message.content';

interface UserMessageRow extends Record<string, unknown> {
  [USER_MESSAGE_CONTENT_COLUMN]: string | null;
}

interface AgentResponseRow extends Record<string, unknown> {
  [AGENT_RESPONSE_CONTENT_COLUMN]: string | null;
}

const USER_MESSAGE_PIPELINE = `| WHERE event_name == "gen_ai.user.message"
| KEEP @timestamp, ${USER_MESSAGE_CONTENT_COLUMN}, span_id
| SORT @timestamp ASC
| LIMIT 1`;

const AGENT_RESPONSE_PIPELINE = `| WHERE event_name == "gen_ai.choice"
| KEEP @timestamp, ${AGENT_RESPONSE_CONTENT_COLUMN}, span_id
| SORT @timestamp DESC
| LIMIT 1`;

export const extractChatEvidence = async (
  traceAccessor: TraceAccessor
): Promise<{ user_query: string; agent_response: string }> => {
  const accessor = createTraceAccessor(traceAccessor);

  const userMsgResponse = await accessor.runEsql('logs', USER_MESSAGE_PIPELINE);
  const userMsgRows = rowsFromEsqlResponse<UserMessageRow>(userMsgResponse);

  if (userMsgRows.length === 0) {
    throw new Error(`No user message span events found for trace ${accessor.traceId}`);
  }

  const userQuery = userMsgRows[0][USER_MESSAGE_CONTENT_COLUMN] ?? '';

  const agentRespResponse = await accessor.runEsql('logs', AGENT_RESPONSE_PIPELINE);
  const agentRespRows = rowsFromEsqlResponse<AgentResponseRow>(agentRespResponse);
  const agentResponse =
    agentRespRows.length > 0 ? agentRespRows[0][AGENT_RESPONSE_CONTENT_COLUMN] ?? '' : '';

  return { user_query: userQuery, agent_response: agentResponse };
};
