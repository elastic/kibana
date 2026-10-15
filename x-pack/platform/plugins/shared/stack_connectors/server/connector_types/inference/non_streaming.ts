/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { UnifiedChatCompleteResponse } from '@kbn/connector-schemas/inference';

/**
 * Converts a full chat completion into the SSE stream the streaming code paths expect:
 * one `chat.completion.chunk` carrying the message as a delta, one carrying the usage, then `[DONE]`.
 * Usage goes in its own chunk because `chunksIntoMessage` ignores content on chunks that carry usage.
 */
export const completionToEventStream = (completion: UnifiedChatCompleteResponse): Readable => {
  const { usage, choices, ...rest } = completion;
  const base = { ...rest, object: 'chat.completion.chunk' };
  const events: Array<Record<string, unknown>> = [
    {
      ...base,
      choices: choices.map(({ message, finish_reason: finishReason, index }) => ({
        index,
        finish_reason: finishReason,
        delta: {
          role: message.role,
          content: message.content,
          refusal: message.refusal,
          tool_calls: message.tool_calls?.map((toolCall, toolCallIndex) => ({
            ...toolCall,
            index: toolCall.index ?? toolCallIndex,
          })),
        },
      })),
    },
  ];
  if (usage) {
    events.push({ ...base, choices: [], usage });
  }
  return Readable.from([
    ...events.map((event) => `data: ${JSON.stringify(event)}\n\n`),
    'data: [DONE]\n\n',
  ]);
};
