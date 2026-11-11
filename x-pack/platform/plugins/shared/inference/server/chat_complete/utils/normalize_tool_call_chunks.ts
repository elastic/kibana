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

interface ToolCallState {
  /** The id forwarded downstream for the call currently streamed at an index */
  forwardedToolCallId: string;
  /** The id the provider sent for that call, once known */
  providerToolCallId?: string;
  /** True while the call has a generated id and no provider id arrived for it yet */
  awaitingProviderToolCallId: boolean;
  /**
   * The id forwarded for every provider id seen at this index, so that deltas of an earlier
   * call keep reaching it after the index switched to another call
   */
  forwardedByProviderToolCallId: Map<string, string>;
}

/**
 * Normalizes the tool call deltas of a chunk stream, so that streaming consumers and the
 * message built from the same chunks see identical tool calls:
 * - a fully empty delta (no id, name nor arguments) for an index with no known id is dropped,
 *   otherwise it surfaces downstream as a tool call with an empty name
 * - the first delta of a call that has no id gets a generated one, since consumers require it
 * - when the first provider id of an index that started without one arrives, it is dropped from
 *   the chunk so the call keeps a single id, and repeats of that provider id do the same. A
 *   different provider id for that index is a new call.
 * - a provider id that equals an id generated earlier is replaced by a new generated id, so two
 *   calls never share an id
 */
export const normalizeToolCallChunks = (): MonoTypeOperatorFunction<ChunkOrTokenCountEvent> => {
  return (source$) =>
    defer(() => {
      const indexToState = new Map<number, ToolCallState>();
      const generatedToolCallIds = new Set<string>();
      // Every id forwarded so far, generated or not
      const usedToolCallIds = new Set<string>();

      const generateToolCallId = (): string => {
        let toolCallId = generateFakeToolCallId();
        while (usedToolCallIds.has(toolCallId)) {
          toolCallId = generateFakeToolCallId();
        }
        generatedToolCallIds.add(toolCallId);
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
            const state = indexToState.get(index);

            if (toolCallId) {
              if (state?.awaitingProviderToolCallId) {
                state.awaitingProviderToolCallId = false;
                state.providerToolCallId = toolCallId;
                state.forwardedByProviderToolCallId.set(toolCallId, state.forwardedToolCallId);
                return [{ ...toolCall, toolCallId: '' }];
              }

              if (state?.providerToolCallId === toolCallId) {
                // Repeat of the id of the call being streamed: unchanged unless it was replaced
                return [
                  {
                    ...toolCall,
                    toolCallId: state.forwardedToolCallId === toolCallId ? toolCallId : '',
                  },
                ];
              }

              const forwardedByProviderToolCallId =
                state?.forwardedByProviderToolCallId ?? new Map<string, string>();
              // Back to a call seen earlier at this index: its deltas keep the id forwarded for it
              const forwardedToolCallId =
                forwardedByProviderToolCallId.get(toolCallId) ??
                (generatedToolCallIds.has(toolCallId) ? generateToolCallId() : toolCallId);
              usedToolCallIds.add(forwardedToolCallId);
              forwardedByProviderToolCallId.set(toolCallId, forwardedToolCallId);
              indexToState.set(index, {
                forwardedToolCallId,
                providerToolCallId: toolCallId,
                awaitingProviderToolCallId: false,
                forwardedByProviderToolCallId,
              });
              return [{ ...toolCall, toolCallId: forwardedToolCallId }];
            }

            if (state) {
              return [toolCall];
            }

            if (!toolFunction.name && !toolFunction.arguments) {
              return [];
            }

            const generatedToolCallId = generateToolCallId();
            indexToState.set(index, {
              forwardedToolCallId: generatedToolCallId,
              awaitingProviderToolCallId: true,
              forwardedByProviderToolCallId: new Map(),
            });
            return [{ ...toolCall, toolCallId: generatedToolCallId }];
          });

          return { ...event, tool_calls: toolCalls };
        })
      );
    });
};
