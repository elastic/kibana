/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscriber } from 'rxjs';
import { Observable } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  ChatCompletionChunkToolCall,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type {
  ContentBlockDeltaEvent,
  ContentBlockStartEvent,
  ContentBlockStopEvent,
  ConverseStreamMetadataEvent,
  MessageStartEvent,
  MessageStopEvent,
} from '@aws-sdk/client-bedrock-runtime';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isMessageStopChunk, type CompletionChunk, type MessageStopChunk } from './types';

export function processCompletionChunks(model?: string) {
  return (source: Observable<CompletionChunk>) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      function handleNext(chunkBody: CompletionChunk) {
        if (isTokenCountCompletionChunk(chunkBody)) {
          return emitTokenCountEvent(subscriber, chunkBody, model);
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

type ConverseResponse =
  | ContentBlockDeltaEvent
  | ContentBlockStartEvent
  | ContentBlockStopEvent
  | MessageStartEvent
  | MessageStopEvent
  | ConverseStreamMetadataEvent;

export interface ConverseCompletionChunk {
  type:
    | 'contentBlockStart'
    | 'contentBlockDelta'
    | 'messageDelta'
    | 'metadata'
    | 'messageStart'
    | 'messageStop';
  body: ConverseResponse;
}

function isOfType<T extends ConverseCompletionChunk['body']>(
  chunkBody: ConverseCompletionChunk['body'],
  type: string,
  expectedType: string
): chunkBody is T {
  return type === expectedType;
}

export function processConverseCompletionChunks(model?: string) {
  return (source: Observable<ConverseCompletionChunk>) =>
    new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>((subscriber) => {
      function handleNext({ type, body: chunkBody }: ConverseCompletionChunk) {
        if (type === 'metadata' && isConverseStreamMetadataEvent(chunkBody)) {
          return emitTokenCountEvent(subscriber, chunkBody, model);
        }

        let completionChunk = '';
        let toolCallChunk: ChatCompletionChunkToolCall | undefined;

        if (isOfType<ContentBlockStartEvent>(chunkBody, type, 'contentBlockStart')) {
          if (
            chunkBody.start?.toolUse &&
            chunkBody.start.toolUse.toolUseId &&
            chunkBody.start.toolUse.name &&
            chunkBody.contentBlockIndex !== undefined
          ) {
            toolCallChunk = {
              index: chunkBody.contentBlockIndex,
              toolCallId: chunkBody.start.toolUse.toolUseId,
              function: {
                name: chunkBody.start.toolUse.name,
                // the API returns '{}' here, which can't be merged with the deltas...
                arguments: '',
              },
            };
          }
        }
        if (isOfType<ContentBlockDeltaEvent>(chunkBody, type, 'contentBlockDelta')) {
          if (chunkBody.delta?.text) {
            completionChunk = chunkBody.delta.text || '';
          } else if (
            chunkBody.delta?.toolUse &&
            chunkBody.delta.toolUse.input &&
            chunkBody.contentBlockIndex !== undefined
          ) {
            toolCallChunk = {
              index: chunkBody.contentBlockIndex,
              toolCallId: '',
              function: {
                name: '',
                arguments: chunkBody.delta.toolUse.input,
              },
            };
          }
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

/**
 *
 * @param value For BedRock Invoke
 * @returns
 */
function isTokenCountCompletionChunk(value: CompletionChunk): value is MessageStopChunk {
  return value.type === 'message_stop' && 'amazon-bedrock-invocationMetrics' in value;
}

/**
 * Check if the object is a ConverseStreamMetadataEvent from BedRock Converse API
 * @param arg response from BedRock Converse API
 * @returns
 */
const isConverseStreamMetadataEvent = (
  arg: unknown
): arg is ConverseStreamMetadataEvent & {
  usage: NonNullable<ConverseStreamMetadataEvent['usage']>;
} => {
  return (
    isPopulatedObject(arg, ['usage', 'metrics']) &&
    isPopulatedObject((arg as ConverseStreamMetadataEvent).usage, ['inputTokens', 'outputTokens'])
  );
};

function emitTokenCountEvent(
  subscriber: Subscriber<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>,
  chunk: MessageStopChunk | ConverseStreamMetadataEvent,
  model?: string
) {
  let inputTokenCount = 0;
  let outputTokenCount = 0;
  // Response from BedRock Invoke API
  if (isMessageStopChunk(chunk)) {
    inputTokenCount = chunk['amazon-bedrock-invocationMetrics'].inputTokenCount;
    outputTokenCount = chunk['amazon-bedrock-invocationMetrics'].outputTokenCount;
  }
  // Response from BedRock Converse API
  if (isConverseStreamMetadataEvent(chunk)) {
    inputTokenCount = chunk.usage.inputTokens ?? 0;
    outputTokenCount = chunk.usage.outputTokens ?? 0;
  }

  subscriber.next({
    type: ChatCompletionEventType.ChatCompletionTokenCount,
    tokens: {
      completion: outputTokenCount,
      prompt: inputTokenCount,
      total: inputTokenCount + outputTokenCount,
    },
    ...(model ? { model } : {}),
  });
}
