/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, type Subscriber } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { generateFakeToolCallId } from '../../../../common';
import type { GenerateContentResponseChunk, GenerateContentResponse } from './types';
import { createToolValidationError } from '../../../../common/chat_complete/errors';

type ChunkEvent = ChatCompletionChunkEvent | ChatCompletionTokenCountEvent;

export function processVertexStream(model?: string) {
  return (source: Observable<GenerateContentResponseChunk>) =>
    new Observable<ChunkEvent>((subscriber) => {
      source.subscribe({
        next: (chunk) => {
          try {
            processChunk({ chunk, subscriber, model });
          } catch (error) {
            subscriber.error(error);
          }
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          subscriber.complete();
        },
      });
    });
}

export function processVertexResponse(model?: string) {
  return (source: Observable<GenerateContentResponse>) =>
    new Observable<ChunkEvent>((subscriber) => {
      source.subscribe({
        next: (chunk) => {
          try {
            processChunk({ chunk, subscriber, model });
          } catch (error) {
            subscriber.error(error);
          }
        },
        error: (err) => {
          subscriber.error(err);
        },
        complete: () => {
          subscriber.complete();
        },
      });
    });
}

export function processChunk({
  chunk,
  subscriber,
  model,
}: {
  chunk: GenerateContentResponseChunk | GenerateContentResponse;
  subscriber: Subscriber<ChunkEvent>;
  model?: string;
}): void {
  const finishReason = chunk.candidates?.[0].finishReason as string | undefined;

  function emitTokenCountIfApplicable() {
    // 'usageMetadata' can be present as an empty object on chunks
    // only the last chunk will have its fields populated
    if (chunk.usageMetadata?.totalTokenCount) {
      subscriber.next({
        type: ChatCompletionEventType.ChatCompletionTokenCount,
        tokens: {
          prompt: chunk.usageMetadata.promptTokenCount,
          completion: chunk.usageMetadata.candidatesTokenCount,
          thinking: chunk.usageMetadata.thoughtsTokenCount,
          cached: chunk.usageMetadata.cachedContentTokenCount,
          total: chunk.usageMetadata.totalTokenCount,
        },
        ...(model ? { model } : {}),
      });
    }
  }

  if (finishReason === 'UNEXPECTED_TOOL_CALL' || finishReason === 'MALFORMED_FUNCTION_CALL') {
    const finishMessage = chunk.candidates?.[0].finishMessage;
    const validationErrorMessage = finishMessage
      ? `${finishReason} - ${finishMessage}`
      : finishReason;
    emitTokenCountIfApplicable();
    subscriber.error(
      createToolValidationError(validationErrorMessage, {
        errorsText: finishMessage,
        toolCalls: [],
      })
    );
    return;
  }

  const contentPart = chunk.candidates?.[0].content.parts[0];
  const completion = contentPart?.text;
  const toolCall = contentPart?.functionCall;

  if (completion || toolCall) {
    subscriber.next({
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: completion ?? '',
      tool_calls: toolCall
        ? [
            {
              index: 0,
              toolCallId: generateFakeToolCallId(),
              function: { name: toolCall.name, arguments: JSON.stringify(toolCall.args) },
            },
          ]
        : [],
    });
  }

  emitTokenCountIfApplicable();
}
