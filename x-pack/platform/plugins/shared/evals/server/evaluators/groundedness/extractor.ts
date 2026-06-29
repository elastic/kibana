/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Logger } from '@kbn/logging';
import { LOGS_INDEX_PATTERN, TRACES_INDEX_PATTERN } from '@kbn/evals-common';
import pRetry from 'p-retry';
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
import { createTraceAccessor } from './trace_accessor';

export class IncompleteGroundednessEvidenceError extends Error {
  constructor(public readonly evidence: GroundednessEvidence, options?: { cause?: unknown }) {
    super('Groundedness evidence may be incomplete', options);
    this.name = 'IncompleteGroundednessEvidenceError';
  }
}

const USER_MESSAGE_CONTENT_COLUMN = 'attributes.content';
const AGENT_RESPONSE_CONTENT_COLUMN = 'attributes.message.content';
const TOOL_CALL_ID_COLUMN = 'attributes.gen_ai.tool.call.id';
const TOOL_NAME_COLUMN = 'attributes.gen_ai.tool.name';
const TOOL_ARGUMENTS_COLUMN = 'attributes.gen_ai.tool.call.arguments';
const TOOL_RESULT_COLUMN = 'attributes.gen_ai.tool.call.result';

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

const asString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }

  return String(value);
};

const asOptionalString = (value: unknown): string | undefined => {
  const stringValue = asString(value).trim();
  return stringValue ? stringValue : undefined;
};

const rowsFromEsqlResponse = (response: ESQLSearchResponse): Array<Record<string, unknown>> => {
  const columns = response.columns ?? [];
  const values = response.values ?? [];

  return values.map((row) => {
    return columns.reduce<Record<string, unknown>>((acc, column, columnIndex) => {
      acc[column.name] = row[columnIndex];
      return acc;
    }, {});
  });
};

const buildUserMessageQuery = (traceId: string) => {
  return `FROM ${LOGS_INDEX_PATTERN}
| WHERE trace_id == "${traceId}" AND event_name == "gen_ai.user.message"
| KEEP @timestamp, ${USER_MESSAGE_CONTENT_COLUMN}, span_id
| SORT @timestamp ASC
| LIMIT 1`;
};

const buildAgentResponseQuery = (traceId: string) => {
  return `FROM ${LOGS_INDEX_PATTERN}
| WHERE trace_id == "${traceId}" AND event_name == "gen_ai.choice"
| KEEP @timestamp, ${AGENT_RESPONSE_CONTENT_COLUMN}, span_id
| SORT @timestamp DESC
| LIMIT 1`;
};

const buildToolSpansQuery = (traceId: string) => {
  return `FROM ${TRACES_INDEX_PATTERN}
| WHERE trace.id == "${traceId}" AND attributes.elastic.inference.span.kind == "TOOL"
| KEEP attributes.gen_ai.tool.call.id, attributes.gen_ai.tool.name, attributes.gen_ai.tool.call.arguments, attributes.gen_ai.tool.call.result, @timestamp
| SORT @timestamp ASC`;
};

export const extractGroundednessEvidence = async (
  traceAccessor: TraceAccessor,
  log: Logger
): Promise<GroundednessEvidence> => {
  const accessor = createTraceAccessor(traceAccessor);
  let lastPartialEvidence: GroundednessEvidence | undefined;

  const fetchGroundednessEvidence = async (): Promise<GroundednessEvidence> => {
    const userMsgResponse = await accessor.runEsql(buildUserMessageQuery(accessor.traceId));
    const userMsgRows = rowsFromEsqlResponse(userMsgResponse);

    if (userMsgRows.length === 0) {
      throw new Error(`No user message span events found for trace ${accessor.traceId}`);
    }

    const userQuery = asString(userMsgRows[0][USER_MESSAGE_CONTENT_COLUMN]);

    const agentRespResponse = await accessor.runEsql(buildAgentResponseQuery(accessor.traceId));
    const agentRespRows = rowsFromEsqlResponse(agentRespResponse);
    const agentResponse =
      agentRespRows.length > 0 ? asString(agentRespRows[0][AGENT_RESPONSE_CONTENT_COLUMN]) : '';

    const baseEvidence: GroundednessEvidence = {
      user_query: userQuery,
      agent_response: agentResponse,
      tool_call_history: [],
    };

    if (!agentResponse.trim()) {
      lastPartialEvidence = {
        ...baseEvidence,
        agent_response: '',
      };
      throw new Error(`Missing agent response for trace ${accessor.traceId}`);
    }

    const toolResponse = await accessor.runEsql(buildToolSpansQuery(accessor.traceId));
    const toolRows = rowsFromEsqlResponse(toolResponse);

    const toolCallHistory = toolRows.map((toolRow) => {
      return {
        tool_call_id: asOptionalString(toolRow[TOOL_CALL_ID_COLUMN]),
        tool_id: asOptionalString(toolRow[TOOL_NAME_COLUMN]),
        arguments: parseJsonIfPossible(toolRow[TOOL_ARGUMENTS_COLUMN]),
        result: parseJsonIfPossible(toolRow[TOOL_RESULT_COLUMN]),
      };
    });

    const evidence: GroundednessEvidence = {
      ...baseEvidence,
      tool_call_history: toolCallHistory,
    };

    lastPartialEvidence = evidence;
    return evidence;
  };

  try {
    return await pRetry(fetchGroundednessEvidence, {
      retries: 5,
      factor: 2,
      minTimeout: 2000,
      maxTimeout: 60000,
      onFailedAttempt: (error) => {
        const isLastAttempt = error.retriesLeft === 0;
        if (isLastAttempt) {
          log.error(
            new Error(
              `Failed to extract groundedness evidence for trace ${traceAccessor.traceId} after ${error.attemptNumber} attempts`,
              { cause: error }
            )
          );
          return;
        }

        log.warn(
          `Groundedness evidence query failed for trace ${traceAccessor.traceId} on attempt ${error.attemptNumber}; retrying`
        );
      },
    });
  } catch (error) {
    if (lastPartialEvidence) {
      const incompleteEvidence = {
        ...lastPartialEvidence,
        agent_response: '',
        tool_call_history: [],
      };
      log.warn(
        `Returning incomplete groundedness evidence for trace ${traceAccessor.traceId}; evaluator should treat as potentially incomplete`
      );
      throw new IncompleteGroundednessEvidenceError(incompleteEvidence, { cause: error });
    }

    throw error;
  }
};
