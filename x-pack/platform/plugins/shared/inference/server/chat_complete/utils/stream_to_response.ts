/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toArray, map, firstValueFrom } from 'rxjs';
import {
  ChatCompleteResponse,
  ChatCompleteStreamResponse,
  createInferenceInternalError,
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
  ToolOptions,
  withoutChunkEvents,
} from '@kbn/inference-common';

export const streamToResponse = <TToolOptions extends ToolOptions = ToolOptions>(
  streamResponse$: ChatCompleteStreamResponse<TToolOptions>
): Promise<ChatCompleteResponse<TToolOptions>> => {
  return firstValueFrom(
    streamResponse$.pipe(
      withoutChunkEvents(),
      toArray(),
      map((events) => {
        const messageEvent = events.find(isChatCompletionMessageEvent);
        const tokenEvent = events.find(isChatCompletionTokenCountEvent);

        if (!messageEvent) {
          throw createInferenceInternalError('No message event found');
        }

        return {
          content: messageEvent.content,
          toolCalls: messageEvent.toolCalls,
          tokens: tokenEvent?.tokens,
        };
      })
    )
  );
};
