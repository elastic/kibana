/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  ChatCompletionChunkToolCall,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { ConverseResponse } from '@aws-sdk/client-bedrock-runtime';

export function processConverseResponse(model?: string) {
  return (source: Observable<ConverseResponse>) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      function handleNext(converseRes: ConverseResponse) {
        let completionText = '';
        const toolCalls: ChatCompletionChunkToolCall[] = [];

        const message = converseRes?.output?.message;
        if (message) {
          message.content?.forEach((contentBlock) => {
            if (contentBlock.text) {
              completionText += contentBlock.text;
            }
            if (contentBlock.toolUse) {
              toolCalls.push({
                index: toolCalls.length,
                toolCallId: contentBlock!.toolUse.toolUseId!,
                function: {
                  name: contentBlock.toolUse.name!,
                  arguments: JSON.stringify(contentBlock.toolUse.input) || '{}',
                },
              });
            }
          });
        }

        subscriber.next({
          type: ChatCompletionEventType.ChatCompletionChunk,
          content: completionText,
          tool_calls: toolCalls,
        });

        if (converseRes.usage) {
          subscriber.next({
            type: ChatCompletionEventType.ChatCompletionTokenCount,
            tokens: {
              completion: converseRes.usage.outputTokens ?? 0,
              prompt: converseRes.usage.inputTokens ?? 0,
              total: converseRes.usage.totalTokens ?? 0,
            },
            ...(model ? { model } : {}),
          });
        }
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
