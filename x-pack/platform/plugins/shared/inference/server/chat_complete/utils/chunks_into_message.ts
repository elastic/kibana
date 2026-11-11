/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  ChatCompletionTokenCountEvent,
  ToolOptions,
} from '@kbn/inference-common';
import { ChatCompletionEventType, withoutTokenCountEvents } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { OperatorFunction } from 'rxjs';
import { defer, map, merge, ReplaySubject, share, toArray } from 'rxjs';
import { validateToolCalls } from '../../util/validate_tool_calls';
import { mergeChunks } from './merge_chunks';
import { normalizeToolCallChunks } from './normalize_tool_call_chunks';
import { normalizeToolCallIndexes } from './normalize_tool_call_indexes';

export function chunksIntoMessage<TToolOptions extends ToolOptions>({
  logger,
  toolOptions,
}: {
  toolOptions: TToolOptions;
  logger: Pick<Logger, 'debug'>;
}): OperatorFunction<
  ChatCompletionChunkEvent | ChatCompletionTokenCountEvent,
  | ChatCompletionChunkEvent
  | ChatCompletionTokenCountEvent
  | ChatCompletionMessageEvent<TToolOptions>
> {
  return (chunks$) =>
    defer(() => {
      // Normalized before sharing, so the forwarded chunks and the merged message agree on tool calls:
      // first every call gets an id, then every call gets its own index.
      // The replay keeps a synchronous source from being run (and normalized, with new generated
      // ids) a second time: it completes before the second consumer subscribes, and a plain
      // share() resets on completion. The reset on a ref count of zero stays on, so that
      // unsubscribing still cancels the source.
      const shared$ = chunks$.pipe(
        normalizeToolCallChunks(),
        normalizeToolCallIndexes(),
        share({
          connector: () => new ReplaySubject(),
          resetOnError: true,
          resetOnComplete: false,
          resetOnRefCountZero: true,
        })
      );

      return merge(
        shared$,
        shared$.pipe(
          withoutTokenCountEvents(),
          toArray(),
          map((chunks): ChatCompletionMessageEvent<TToolOptions> => {
            const concatenatedChunk = mergeChunks(chunks);

            logger.debug(() => `Received completed message: ${JSON.stringify(concatenatedChunk)}`);

            const { content, refusal, tool_calls: toolCalls } = concatenatedChunk;

            const validatedToolCalls = validateToolCalls<TToolOptions>({
              ...toolOptions,
              toolCalls,
              logger,
            });

            return {
              type: ChatCompletionEventType.ChatCompletionMessage,
              content,
              ...(refusal ? { refusal } : {}),
              toolCalls: validatedToolCalls,
            };
          })
        )
      );
    });
}
