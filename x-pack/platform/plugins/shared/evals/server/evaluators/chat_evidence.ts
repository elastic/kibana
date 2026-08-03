/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenAIInputMessage, GenAIOutputMessage, GenAITextPart } from '@kbn/inference-tracing';
import { parseJsonAttr } from '@kbn/inference-tracing';
import type { TraceAccessor } from './types';
import { createTraceAccessor } from './trace_accessor';
import { rowsFromEsqlResponse } from './esql_utils';

const INPUT_MESSAGES_COLUMN = 'attributes.gen_ai.input.messages';
const OUTPUT_MESSAGES_COLUMN = 'attributes.gen_ai.output.messages';

interface ChatSpanRow extends Record<string, unknown> {
  [INPUT_MESSAGES_COLUMN]?: string | null;
  [OUTPUT_MESSAGES_COLUMN]?: string | null;
}

const CHAT_SPANS_PIPELINE = `| WHERE attributes.gen_ai.operation.name == "chat"
| KEEP @timestamp, ${INPUT_MESSAGES_COLUMN}, ${OUTPUT_MESSAGES_COLUMN}
| SORT @timestamp ASC`;

const extractTextFromParts = (parts: GenAIInputMessage['parts']): string =>
  parts
    .filter((p): p is GenAITextPart => p.type === 'text' && typeof p.content === 'string')
    .map((p) => p.content)
    .join('\n');

export const extractChatEvidence = async (
  traceAccessor: TraceAccessor
): Promise<{ user_query: string; agent_response: string }> => {
  const accessor = createTraceAccessor(traceAccessor);

  const response = await accessor.runEsql('traces', CHAT_SPANS_PIPELINE);
  const chatSpans = rowsFromEsqlResponse<ChatSpanRow>(response);

  if (chatSpans.length === 0) {
    throw new Error(`No chat spans found for trace ${accessor.traceId}`);
  }

  let userQuery = '';
  const inputMessagesRaw = chatSpans[0][INPUT_MESSAGES_COLUMN];
  const inputMessages = parseJsonAttr<GenAIInputMessage[]>(inputMessagesRaw);
  const firstUserMsg = inputMessages?.find((m) => m.role === 'user');
  if (firstUserMsg) {
    userQuery = extractTextFromParts(firstUserMsg.parts);
  }

  let agentResponse = '';
  const outputMessagesRaw = chatSpans[chatSpans.length - 1][OUTPUT_MESSAGES_COLUMN];
  const outputMessages = parseJsonAttr<GenAIOutputMessage[]>(outputMessagesRaw);
  const lastMsg = outputMessages?.[outputMessages.length - 1];
  if (lastMsg) {
    agentResponse = extractTextFromParts(lastMsg.parts);
  }

  return { user_query: userQuery, agent_response: agentResponse };
};
