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
 * - a chunk without `toolCallId` at a source index that has no tool call yet (some gateways drop
 *   the id, e.g. GPT-OSS via EIS) starts a new tool call, which later id-less chunks at that
 *   source index continue
 */
export const createToolCallIndexResolver = () => {
  const indexByToolCallId = new Map<string, number>();
  const currentIndexBySourceIndex = new Map<number, number>();
  let nextIndex = 0;

  return (toolCall: ChatCompletionChunkToolCall): number => {
    if (!toolCall.toolCallId) {
      const currentIndex = currentIndexBySourceIndex.get(toolCall.index);
      if (currentIndex !== undefined) {
        return currentIndex;
      }
      const startedIndex = nextIndex++;
      currentIndexBySourceIndex.set(toolCall.index, startedIndex);
      return startedIndex;
    }

    let index = indexByToolCallId.get(toolCall.toolCallId);
    if (index === undefined) {
      index = nextIndex++;
      indexByToolCallId.set(toolCall.toolCallId, index);
    }
    currentIndexBySourceIndex.set(toolCall.index, index);
    return index;
  };
};

/**
 * Id given to a tool call whose provider never sent one. It is derived from the normalized
 * index, not generated randomly, so a stream normalized twice (e.g. the two subscriptions of a
 * synchronous source in `chunksIntoMessage`) gets the same id on its chunks and on the message.
 */
const getGeneratedToolCallId = (index: number): string => `generated_tool_call_${index}`;

/**
 * Rewrites the `index` of streamed tool call chunks so that each tool call has a unique index,
 * see {@link createToolCallIndexResolver}. A tool call that starts without a `toolCallId` gets a
 * generated one on its first chunk, because consumers such as Agent Builder require every tool call
 * to have an id.
 */
export function normalizeToolCallIndexes<
  T extends ChatCompletionChunkEvent | ChatCompletionTokenCountEvent
>(): OperatorFunction<T, T> {
  return (source$) =>
    // defer so each subscription (e.g. a retry) starts with fresh state
    defer(() => {
      const resolveIndex = createToolCallIndexResolver();
      const startedIndexes = new Set<number>();

      return source$.pipe(
        map((event) => {
          if (!isChatCompletionChunkEvent(event) || !event.tool_calls?.length) {
            return event;
          }

          return {
            ...event,
            tool_calls: event.tool_calls.map((toolCall) => {
              const index = resolveIndex(toolCall);
              const isFirstChunk = !startedIndexes.has(index);
              startedIndexes.add(index);

              const toolCallId =
                isFirstChunk && !toolCall.toolCallId
                  ? getGeneratedToolCallId(index)
                  : toolCall.toolCallId;

              return index === toolCall.index && toolCallId === toolCall.toolCallId
                ? toolCall
                : { ...toolCall, index, toolCallId };
            }),
          };
        })
      );
    });
}
