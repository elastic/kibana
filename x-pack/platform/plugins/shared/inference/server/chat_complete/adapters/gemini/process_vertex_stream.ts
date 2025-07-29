/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  ChatCompletionEventType,
} from '@kbn/inference-common';
import { generateFakeToolCallId } from '../../../../common';
import type { GenerateContentResponseChunk } from './types';
import { createToolValidationError } from '../../../../common/chat_complete/errors';

export function processVertexStream() {
  return (source: Observable<GenerateContentResponseChunk>) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      function handleNext(value: GenerateContentResponseChunk) {
        const finishReason = value.candidates?.[0].finishReason as string | undefined;

        function emitTokenCountIfApplicable() {
          // 'usageMetadata' can be present as an empty object on chunks
          // only the last chunk will have its fields populated
          if (value.usageMetadata?.totalTokenCount) {
            subscriber.next({
              type: ChatCompletionEventType.ChatCompletionTokenCount,
              tokens: {
                prompt: value.usageMetadata.promptTokenCount,
                completion: value.usageMetadata.candidatesTokenCount,
                cached: value.usageMetadata.cachedContentTokenCount,
                total: value.usageMetadata.totalTokenCount,
              },
            });
          }
        }

        if (finishReason === 'UNEXPECTED_TOOL_CALL' || finishReason === 'MALFORMED_FUNCTION_CALL') {
          const finishMessage = value.candidates?.[0].finishMessage;
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

        const contentPart = value.candidates?.[0].content.parts[0];
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

      source.subscribe({
        next: (value) => {
          try {
            handleNext(value);
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
