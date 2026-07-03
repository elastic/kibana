/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { extractChatEvidence } from '../chat_evidence';
import type { TraceAccessor } from '../types';
import { createTraceAccessor } from '../trace_accessor';
import { rowsFromEsqlResponse } from '../esql_utils';

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

const TOOL_CALL_ID_COLUMN = 'attributes.gen_ai.tool.call.id';
const TOOL_NAME_COLUMN = 'attributes.gen_ai.tool.name';
const TOOL_ARGUMENTS_COLUMN = 'attributes.gen_ai.tool.call.arguments';
const TOOL_RESULT_COLUMN = 'attributes.gen_ai.tool.call.result';

interface ToolSpanRow extends Record<string, unknown> {
  [TOOL_CALL_ID_COLUMN]: string | null;
  [TOOL_NAME_COLUMN]: string | null;
  [TOOL_ARGUMENTS_COLUMN]: string | null;
  [TOOL_RESULT_COLUMN]: string | null;
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

const TOOL_SPANS_PIPELINE = `| WHERE attributes.elastic.inference.span.kind == "TOOL"
| KEEP attributes.gen_ai.tool.call.id, attributes.gen_ai.tool.name, attributes.gen_ai.tool.call.arguments, attributes.gen_ai.tool.call.result, @timestamp
| SORT @timestamp ASC`;

export const extractGroundednessEvidence = async (
  traceAccessor: TraceAccessor,
  log: Logger
): Promise<GroundednessEvidence> => {
  const accessor = createTraceAccessor(traceAccessor);

  const chatEvidence = await extractChatEvidence(traceAccessor);

  const baseEvidence: GroundednessEvidence = {
    user_query: chatEvidence.user_query,
    agent_response: chatEvidence.agent_response,
    tool_call_history: [],
  };

  if (!chatEvidence.agent_response.trim()) {
    const incompleteEvidence: GroundednessEvidence = {
      ...baseEvidence,
      agent_response: '',
      tool_call_history: [],
    };
    log.warn(`Returning incomplete groundedness evidence for trace ${traceAccessor.traceId}.`);
    throw new IncompleteGroundednessEvidenceError(incompleteEvidence);
  }

  const toolResponse = await accessor.runEsql('traces', TOOL_SPANS_PIPELINE);
  const toolRows = rowsFromEsqlResponse<ToolSpanRow>(toolResponse);

  const toolCallHistory = toolRows.map((toolRow) => ({
    tool_call_id: toolRow[TOOL_CALL_ID_COLUMN] ?? undefined,
    tool_id: toolRow[TOOL_NAME_COLUMN] ?? undefined,
    arguments: parseJsonIfPossible(toolRow[TOOL_ARGUMENTS_COLUMN]),
    result: parseJsonIfPossible(toolRow[TOOL_RESULT_COLUMN]),
  }));

  return {
    ...baseEvidence,
    tool_call_history: toolCallHistory,
  };
};
