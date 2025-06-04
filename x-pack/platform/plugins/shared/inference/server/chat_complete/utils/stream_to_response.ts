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
  RedactionConfiguration,
  ToolOptions,
  withoutChunkEvents,
} from '@kbn/inference-common';

export function streamToResponse<
  TToolOptions extends ToolOptions,
  TRedactionConfiguration extends RedactionConfiguration | undefined
>(
  streamResponse$: ChatCompleteStreamResponse<ToolOptions, RedactionConfiguration | undefined>
): Promise<ChatCompleteResponse<ToolOptions, RedactionConfiguration | undefined>>;

export function streamToResponse(
  streamResponse$: ChatCompleteStreamResponse<ToolOptions, RedactionConfiguration | undefined>
): Promise<ChatCompleteResponse<ToolOptions, RedactionConfiguration | undefined>> {
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
}
