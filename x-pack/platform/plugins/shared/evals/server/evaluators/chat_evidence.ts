/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { LOGS_INDEX_PATTERN } from '@kbn/evals-common';
import pRetry from 'p-retry';
import type { TraceAccessor } from './types';
import { createTraceAccessor } from './trace_accessor';
import { asString, rowsFromEsqlResponse } from './esql_utils';

const USER_MESSAGE_CONTENT_COLUMN = 'attributes.content';
const AGENT_RESPONSE_CONTENT_COLUMN = 'attributes.message.content';

const buildUserMessageQuery = () => {
  return `FROM ${LOGS_INDEX_PATTERN}
| WHERE event_name == "gen_ai.user.message"
| KEEP @timestamp, ${USER_MESSAGE_CONTENT_COLUMN}, span_id
| SORT @timestamp ASC
| LIMIT 1`;
};

const buildAgentResponseQuery = () => {
  return `FROM ${LOGS_INDEX_PATTERN}
| WHERE event_name == "gen_ai.choice"
| KEEP @timestamp, ${AGENT_RESPONSE_CONTENT_COLUMN}, span_id
| SORT @timestamp DESC
| LIMIT 1`;
};

export const extractChatEvidence = async (
  traceAccessor: TraceAccessor,
  log: Logger
): Promise<{ user_query: string; agent_response: string }> => {
  const accessor = createTraceAccessor(traceAccessor);

  return pRetry(
    async () => {
      const userMsgResponse = await accessor.runEsql(buildUserMessageQuery());
      const userMsgRows = rowsFromEsqlResponse(userMsgResponse);

      if (userMsgRows.length === 0) {
        throw new Error(`No user message span events found for trace ${accessor.traceId}`);
      }

      const userQuery = asString(userMsgRows[0][USER_MESSAGE_CONTENT_COLUMN]);

      const agentRespResponse = await accessor.runEsql(buildAgentResponseQuery());
      const agentRespRows = rowsFromEsqlResponse(agentRespResponse);
      const agentResponse =
        agentRespRows.length > 0 ? asString(agentRespRows[0][AGENT_RESPONSE_CONTENT_COLUMN]) : '';

      return { user_query: userQuery, agent_response: agentResponse };
    },
    {
      retries: 2,
      factor: 2,
      minTimeout: 2000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        const isLastAttempt = error.retriesLeft === 0;
        if (isLastAttempt) {
          log.error(
            new Error(
              `Failed to extract chat evidence for trace ${traceAccessor.traceId} after ${error.attemptNumber} attempts`,
              { cause: error }
            )
          );
          return;
        }

        log.warn(
          `Chat evidence query failed for trace ${traceAccessor.traceId} on attempt ${error.attemptNumber}; retrying`
        );
      },
    }
  );
};
