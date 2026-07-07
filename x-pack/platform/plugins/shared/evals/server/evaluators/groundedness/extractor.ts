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

const TOOL_CALL_ID_ATTR = 'gen_ai.tool.call.id';
const TOOL_NAME_ATTR = 'gen_ai.tool.name';
const TOOL_ARGUMENTS_ATTR = 'gen_ai.tool.call.arguments';
const TOOL_RESULT_ATTR = 'gen_ai.tool.call.result';

interface ToolSpanSource {
  attributes?: Record<string, unknown>;
}

const getAttribute = (doc: ToolSpanSource, attr: string): unknown => doc.attributes?.[attr];

const getStringAttribute = (doc: ToolSpanSource, attr: string): string | undefined => {
  const value = getAttribute(doc, attr);
  return typeof value === 'string' ? value : undefined;
};

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

  const toolHits = await accessor.search<ToolSpanSource>('traces', {
    filter: [{ term: { 'attributes.elastic.inference.span.kind': 'TOOL' } }],
    sort: [{ '@timestamp': { order: 'asc' } }],
    fields: [
      `attributes.${TOOL_CALL_ID_ATTR}`,
      `attributes.${TOOL_NAME_ATTR}`,
      `attributes.${TOOL_ARGUMENTS_ATTR}`,
      `attributes.${TOOL_RESULT_ATTR}`,
    ],
  });

  const toolCallHistory = toolHits.map((toolHit) => ({
    tool_call_id: getStringAttribute(toolHit, TOOL_CALL_ID_ATTR),
    tool_id: getStringAttribute(toolHit, TOOL_NAME_ATTR),
    arguments: parseJsonIfPossible(getAttribute(toolHit, TOOL_ARGUMENTS_ATTR)),
    result: parseJsonIfPossible(getAttribute(toolHit, TOOL_RESULT_ATTR)),
  }));

  return {
    ...baseEvidence,
    tool_call_history: toolCallHistory,
  };
};
