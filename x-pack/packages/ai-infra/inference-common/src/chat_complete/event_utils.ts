/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, OperatorFunction } from 'rxjs';
import { InferenceTaskEvent } from '../inference_task';
import {
  ChatCompletionEventType,
  ChatCompletionEvent,
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  ChatCompletionTokenCountEvent,
} from './events';
import type { ToolOptions } from './tools';

export function isChatCompletionChunkEvent(
  event: ChatCompletionEvent
): event is ChatCompletionChunkEvent {
  return event.type === ChatCompletionEventType.ChatCompletionChunk;
}

export function isChatCompletionMessageEvent<T extends ToolOptions<string>>(
  event: ChatCompletionEvent<T>
): event is ChatCompletionMessageEvent<T> {
  return event.type === ChatCompletionEventType.ChatCompletionMessage;
}

export function isChatCompletionEvent(event: InferenceTaskEvent): event is ChatCompletionEvent {
  return (
    event.type === ChatCompletionEventType.ChatCompletionChunk ||
    event.type === ChatCompletionEventType.ChatCompletionMessage ||
    event.type === ChatCompletionEventType.ChatCompletionTokenCount
  );
}

export function withoutChunkEvents<T extends ChatCompletionEvent>(): OperatorFunction<
  T,
  Exclude<T, ChatCompletionChunkEvent>
> {
  return filter(
    (event): event is Exclude<T, ChatCompletionChunkEvent> =>
      event.type !== ChatCompletionEventType.ChatCompletionChunk
  );
}

export function withoutTokenCountEvents<T extends ChatCompletionEvent>(): OperatorFunction<
  T,
  Exclude<T, ChatCompletionTokenCountEvent>
> {
  return filter(
    (event): event is Exclude<T, ChatCompletionTokenCountEvent> =>
      event.type !== ChatCompletionEventType.ChatCompletionTokenCount
  );
}
