/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trace, isSpanContextValid } from '@opentelemetry/api';
import { toArray, map, firstValueFrom } from 'rxjs';
import type {
  ChatCompleteResponse,
  ChatCompleteStreamResponse,
  ToolOptions,
} from '@kbn/inference-common';
import {
  createInferenceInternalError,
  isChatCompletionMessageEvent,
  isChatCompletionTokenCountEvent,
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

        const messageEventWithTrace = messageEvent as typeof messageEvent & { traceId?: string };
        // Only surface a trace id when there is a *valid* active span. Without
        // real tracing configured, getActiveSpan() returns a no-op span whose
        // trace id is the all-zeros INVALID_TRACEID; emitting that would
        // pollute every inference response with a junk id.
        const activeSpanContext = trace.getActiveSpan()?.spanContext();
        const traceId =
          messageEventWithTrace.traceId ??
          (activeSpanContext && isSpanContextValid(activeSpanContext)
            ? activeSpanContext.traceId
            : undefined);

        return {
          content: messageEvent.content,
          refusal: messageEvent.refusal,
          toolCalls: messageEvent.toolCalls,
          tokens: tokenEvent?.tokens,
          deanonymized_input: messageEvent.deanonymized_input,
          deanonymized_output: messageEvent.deanonymized_output,
          model: tokenEvent?.model,
          metadata: messageEvent.metadata,
          ...(traceId ? { traceId } : {}),
        };
      })
    )
  );
};
