/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionChunkToolCall,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { normalizeToolCallIndexes } from './normalize_tool_call_indexes';

const toolCallChunk = (
  toolCall: Pick<ChatCompletionChunkToolCall, 'index'> &
    Partial<Pick<ChatCompletionChunkToolCall, 'toolCallId'>> & { name?: string; args?: string }
): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content: '',
  tool_calls: [
    {
      index: toolCall.index,
      toolCallId: toolCall.toolCallId ?? '',
      function: { name: toolCall.name ?? '', arguments: toolCall.args ?? '' },
    },
  ],
});

const normalize = (...events: Array<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>) =>
  lastValueFrom(of(...events).pipe(normalizeToolCallIndexes(), toArray()));

const indexesOf = (events: Array<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>) =>
  events.flatMap((event) =>
    event.type === ChatCompletionEventType.ChatCompletionChunk
      ? event.tool_calls.map((toolCall) => toolCall.index)
      : []
  );

describe('normalizeToolCallIndexes', () => {
  it('assigns unique indexes to parallel tool calls that share the same source index', async () => {
    const events = await normalize(
      toolCallChunk({ index: 0, toolCallId: 'a', name: 'toolA' }),
      toolCallChunk({ index: 0, args: '{"foo":' }),
      toolCallChunk({ index: 0, args: '"bar"}' }),
      toolCallChunk({ index: 0, toolCallId: 'b', name: 'toolB' }),
      toolCallChunk({ index: 0, args: '{"baz":1}' })
    );

    expect(indexesOf(events)).toEqual([0, 0, 0, 1, 1]);
  });

  it('keeps indexes unchanged for providers that already emit distinct indexes', async () => {
    const events = await normalize(
      toolCallChunk({ index: 0, toolCallId: 'a', name: 'toolA' }),
      toolCallChunk({ index: 1, toolCallId: 'b', name: 'toolB' }),
      toolCallChunk({ index: 0, args: '{}' }),
      toolCallChunk({ index: 1, args: '{}' })
    );

    expect(indexesOf(events)).toEqual([0, 1, 0, 1]);
  });

  it('renumbers indexes that do not start at 0', async () => {
    const events = await normalize(
      toolCallChunk({ index: 3, toolCallId: 'a', name: 'toolA' }),
      toolCallChunk({ index: 3, args: '{}' })
    );

    expect(indexesOf(events)).toEqual([0, 0]);
  });

  it('keeps the same index when the toolCallId is repeated on every chunk', async () => {
    const events = await normalize(
      toolCallChunk({ index: 0, toolCallId: 'a', name: 'toolA' }),
      toolCallChunk({ index: 0, toolCallId: 'a', args: '{}' }),
      toolCallChunk({ index: 0, toolCallId: 'b', name: 'toolB' }),
      toolCallChunk({ index: 0, toolCallId: 'b', args: '{}' })
    );

    expect(indexesOf(events)).toEqual([0, 0, 1, 1]);
  });

  it('passes through non-tool-call events unchanged', async () => {
    const tokenCount: ChatCompletionTokenCountEvent = {
      type: ChatCompletionEventType.ChatCompletionTokenCount,
      tokens: { prompt: 1, completion: 2, total: 3 },
    };
    const content: ChatCompletionChunkEvent = {
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: 'hello',
      tool_calls: [],
    };

    const events = await normalize(content, tokenCount);

    expect(events[0]).toBe(content);
    expect(events[1]).toBe(tokenCount);
  });

  it('resets state for each subscription', async () => {
    const source$ = of(
      toolCallChunk({ index: 0, toolCallId: 'a', name: 'toolA' }),
      toolCallChunk({ index: 0, toolCallId: 'b', name: 'toolB' })
    ).pipe(normalizeToolCallIndexes(), toArray());

    expect(indexesOf(await lastValueFrom(source$))).toEqual([0, 1]);
    expect(indexesOf(await lastValueFrom(source$))).toEqual([0, 1]);
  });
});
