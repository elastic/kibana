/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscriber } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  ChatCompletionChunkToolCall,
  ChatCompletionEventType,
} from '@kbn/inference-common';
import type { CompletionChunk, MessageStopChunk } from './types';

export function processCompletionChunks() {
  return (source: Observable<CompletionChunk>) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      function handleNext(chunkBody: CompletionChunk) {
        if (isTokenCountCompletionChunk(chunkBody)) {
          return emitTokenCountEvent(subscriber, chunkBody);
        }

        let completionChunk = '';
        let toolCallChunk: ChatCompletionChunkToolCall | undefined;

        switch (chunkBody.type) {
          case 'content_block_start':
            if (chunkBody.content_block.type === 'text') {
              completionChunk = chunkBody.content_block.text || '';
            } else if (chunkBody.content_block.type === 'tool_use') {
              toolCallChunk = {
                index: chunkBody.index,
                toolCallId: chunkBody.content_block.id,
                function: {
                  name: chunkBody.content_block.name,
                  // the API returns '{}' here, which can't be merged with the deltas...
                  arguments: '',
                },
              };
            }
            break;

          case 'content_block_delta':
            if (chunkBody.delta.type === 'text_delta') {
              completionChunk = chunkBody.delta.text || '';
            } else if (chunkBody.delta.type === 'input_json_delta') {
              toolCallChunk = {
                index: chunkBody.index,
                toolCallId: '',
                function: {
                  name: '',
                  arguments: chunkBody.delta.partial_json,
                },
              };
            }
            break;

          case 'message_delta':
            completionChunk = chunkBody.delta.stop_sequence || '';
            break;

          default:
            break;
        }

        if (completionChunk || toolCallChunk) {
          subscriber.next({
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: completionChunk,
            tool_calls: toolCallChunk ? [toolCallChunk] : [],
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

function isTokenCountCompletionChunk(value: CompletionChunk): value is MessageStopChunk {
  return value.type === 'message_stop' && 'amazon-bedrock-invocationMetrics' in value;
}

function emitTokenCountEvent(
  subscriber: Subscriber<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>,
  chunk: MessageStopChunk
) {
  const { inputTokenCount, outputTokenCount } = chunk['amazon-bedrock-invocationMetrics'];

  subscriber.next({
    type: ChatCompletionEventType.ChatCompletionTokenCount,
    tokens: {
      completion: outputTokenCount,
      prompt: inputTokenCount,
      total: inputTokenCount + outputTokenCount,
    },
  });
}
