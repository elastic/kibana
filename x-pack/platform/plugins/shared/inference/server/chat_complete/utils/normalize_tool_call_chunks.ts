/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { isChatCompletionChunkEvent } from '@kbn/inference-common';
import type { MonoTypeOperatorFunction } from 'rxjs';
import { defer, map } from 'rxjs';
import { generateFakeToolCallId } from '../../../common';

type ChunkOrTokenCountEvent = ChatCompletionChunkEvent | ChatCompletionTokenCountEvent;

/**
 * Normalizes the tool call deltas of a chunk stream, so that streaming consumers and the
 * message built from the same chunks see identical tool calls:
 * - a fully empty delta (no id, name nor arguments) for an index with no known id is dropped,
 *   otherwise it surfaces downstream as a tool call with an empty name
 * - the first delta of a call that has no id gets a generated one, since consumers require it
 * - when the first real id of an index that started without one arrives, it is dropped from the
 *   chunk so the call keeps a single id. A later, different id for that index is a new call.
 */
export const normalizeToolCallChunks = (): MonoTypeOperatorFunction<ChunkOrTokenCountEvent> => {
  return (source$) =>
    defer(() => {
      // Latest id seen (or generated) for each tool call index
      const indexToToolCallId = new Map<number, string>();
      // Generated ids that have not been replaced by a real id yet
      const pendingGeneratedIds = new Set<string>();
      const usedToolCallIds = new Set<string>();

      const generateToolCallId = (): string => {
        let toolCallId = generateFakeToolCallId();
        while (usedToolCallIds.has(toolCallId)) {
          toolCallId = generateFakeToolCallId();
        }
        usedToolCallIds.add(toolCallId);
        return toolCallId;
      };

      return source$.pipe(
        map((event): ChunkOrTokenCountEvent => {
          if (!isChatCompletionChunkEvent(event)) {
            return event;
          }

          const toolCalls = event.tool_calls.flatMap((toolCall) => {
            const { index, toolCallId, function: toolFunction } = toolCall;
            const knownToolCallId = indexToToolCallId.get(index);

            if (toolCallId) {
              if (knownToolCallId && pendingGeneratedIds.has(knownToolCallId)) {
                pendingGeneratedIds.delete(knownToolCallId);
                return [{ ...toolCall, toolCallId: '' }];
              }
              indexToToolCallId.set(index, toolCallId);
              usedToolCallIds.add(toolCallId);
              return [toolCall];
            }

            if (knownToolCallId) {
              return [toolCall];
            }

            if (!toolFunction.name && !toolFunction.arguments) {
              return [];
            }

            const generatedToolCallId = generateToolCallId();
            indexToToolCallId.set(index, generatedToolCallId);
            pendingGeneratedIds.add(generatedToolCallId);
            return [{ ...toolCall, toolCallId: generatedToolCallId }];
          });

          return { ...event, tool_calls: toolCalls };
        })
      );
    });
};
