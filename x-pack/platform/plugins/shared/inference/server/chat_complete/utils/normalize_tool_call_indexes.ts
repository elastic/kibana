/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompletionChunkEvent,
  ChatCompletionChunkToolCall,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { isChatCompletionChunkEvent } from '@kbn/inference-common';
import type { OperatorFunction } from 'rxjs';
import { defer, map } from 'rxjs';

/**
 * Creates a stateful resolver that assigns each tool call of a single stream a unique index.
 *
 * Some providers emit the same `index` for every tool call of a response (e.g. the ES
 * `amazonbedrock` service always sends `0`), which breaks consumers that join streamed
 * deltas by index. The resolver keys tool calls by `toolCallId` instead:
 * - a chunk with a new `toolCallId` gets the next available index
 * - a chunk without `toolCallId` is a continuation of the most recent tool call at that source index
 *
 * Returns `undefined` for a continuation chunk whose tool call was never started.
 */
export const createToolCallIndexResolver = () => {
  const indexByToolCallId = new Map<string, number>();
  const currentIndexBySourceIndex = new Map<number, number>();

  return (toolCall: ChatCompletionChunkToolCall): number | undefined => {
    if (!toolCall.toolCallId) {
      return currentIndexBySourceIndex.get(toolCall.index);
    }

    let index = indexByToolCallId.get(toolCall.toolCallId);
    if (index === undefined) {
      index = indexByToolCallId.size;
      indexByToolCallId.set(toolCall.toolCallId, index);
    }
    currentIndexBySourceIndex.set(toolCall.index, index);
    return index;
  };
};

/**
 * Rewrites the `index` of streamed tool call chunks so that each tool call has a unique index,
 * see {@link createToolCallIndexResolver}.
 */
export function normalizeToolCallIndexes<
  T extends ChatCompletionChunkEvent | ChatCompletionTokenCountEvent
>(): OperatorFunction<T, T> {
  return (source$) =>
    // defer so each subscription (e.g. a retry) starts with fresh state
    defer(() => {
      const resolveIndex = createToolCallIndexResolver();

      return source$.pipe(
        map((event) => {
          if (!isChatCompletionChunkEvent(event) || !event.tool_calls?.length) {
            return event;
          }

          return {
            ...event,
            tool_calls: event.tool_calls.map((toolCall) => {
              const index = resolveIndex(toolCall);
              return index === undefined || index === toolCall.index
                ? toolCall
                : { ...toolCall, index };
            }),
          };
        })
      );
    });
}
