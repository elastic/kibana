/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom, of, toArray } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { normalizeToolCallChunks } from './normalize_tool_call_chunks';

const chunk = (
  ...toolCalls: Array<{ index: number; toolCallId: string; name: string; args: string }>
): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content: '',
  tool_calls: toolCalls.map(({ index, toolCallId, name, args }) => ({
    index,
    toolCallId,
    function: { name, arguments: args },
  })),
});

const normalize = async (events: Array<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>) =>
  lastValueFrom(of(...events).pipe(normalizeToolCallChunks(), toArray()));

describe('normalizeToolCallChunks', () => {
  it('leaves tool calls that carry real ids untouched', async () => {
    const events = [
      chunk({ index: 0, toolCallId: '001', name: 'myFunction', args: '{ ' }),
      chunk({ index: 0, toolCallId: '', name: '', args: '"a": 1 }' }),
    ];

    expect(await normalize(events)).toEqual(events);
  });

  it('drops a fully empty delta at an index with no known id (e.g. GPT-OSS-120B via EIS)', async () => {
    const result = await normalize([
      chunk({ index: 0, toolCallId: '001', name: 'myFunction', args: '{}' }),
      chunk({ index: 3, toolCallId: '', name: '', args: '' }),
    ]);

    expect(result.map((event) => (event as ChatCompletionChunkEvent).tool_calls)).toEqual([
      [{ index: 0, toolCallId: '001', function: { name: 'myFunction', arguments: '{}' } }],
      [],
    ]);
  });

  it('keeps the other fields of a chunk when its only tool call delta is dropped', async () => {
    const result = await normalize([
      {
        ...chunk({ index: 1, toolCallId: '', name: '', args: '' }),
        content: 'hello',
      },
    ]);

    expect(result).toEqual([
      {
        type: ChatCompletionEventType.ChatCompletionChunk,
        content: 'hello',
        tool_calls: [],
      },
    ]);
  });

  it('gives the first delta of a call without an id a generated id and leaves continuations alone', async () => {
    const result = (await normalize([
      chunk({ index: 0, toolCallId: '', name: 'myFunction', args: '{ ' }),
      chunk({ index: 0, toolCallId: '', name: '', args: '"a": 1 }' }),
    ])) as ChatCompletionChunkEvent[];

    const [first, continuation] = result.map((event) => event.tool_calls[0]);
    expect(first.toolCallId).not.toBe('');
    expect(continuation.toolCallId).toBe('');
    expect(first.function).toEqual({ name: 'myFunction', arguments: '{ ' });
  });

  it('gives distinct ids to calls without ids at different indexes', async () => {
    const result = (await normalize([
      chunk(
        { index: 0, toolCallId: '', name: 'firstFunction', args: '{}' },
        { index: 1, toolCallId: '', name: 'secondFunction', args: '{}' }
      ),
    ])) as ChatCompletionChunkEvent[];

    const ids = result[0].tool_calls.map((toolCall) => toolCall.toolCallId);
    expect(ids.every((id) => id !== '')).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

  it('keeps one call when the first real id arrives after an id-less delta with data', async () => {
    const result = (await normalize([
      chunk({ index: 0, toolCallId: '', name: 'myFunction', args: '{ "a": ' }),
      chunk({ index: 0, toolCallId: 'real-id', name: '', args: '1 }' }),
    ])) as ChatCompletionChunkEvent[];

    const [first, second] = result.map((event) => event.tool_calls[0]);
    expect(first.toolCallId).not.toBe('');
    expect(second.toolCallId).toBe('');
  });

  it('treats a different real id at the same index as a new call after the generated id was replaced', async () => {
    const result = (await normalize([
      chunk({ index: 0, toolCallId: '', name: 'firstFunction', args: '{}' }),
      chunk({ index: 0, toolCallId: 'real-id', name: '', args: '' }),
      chunk({ index: 0, toolCallId: 'other-id', name: 'secondFunction', args: '{}' }),
    ])) as ChatCompletionChunkEvent[];

    expect(result[2].tool_calls[0].toolCallId).toBe('other-id');
  });

  it('keeps separate calls for the same index with different real ids', async () => {
    const events = [
      chunk({ index: 0, toolCallId: '001', name: 'firstFunction', args: '{}' }),
      chunk({ index: 0, toolCallId: '002', name: 'secondFunction', args: '{}' }),
    ];

    expect(await normalize(events)).toEqual(events);
  });

  it('passes token count events through', async () => {
    const tokenCount: ChatCompletionTokenCountEvent = {
      type: ChatCompletionEventType.ChatCompletionTokenCount,
      tokens: { prompt: 1, completion: 2, total: 3 },
    };

    expect(await normalize([tokenCount])).toEqual([tokenCount]);
  });

  it('does not share state between subscriptions', async () => {
    const events: Array<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent> = [
      chunk({ index: 0, toolCallId: '', name: 'myFunction', args: '{}' }),
    ];
    const source$ = from(events).pipe(normalizeToolCallChunks());

    const firstRun = await lastValueFrom(source$.pipe(toArray()));
    const secondRun = await lastValueFrom(source$.pipe(toArray()));

    expect((firstRun[0] as ChatCompletionChunkEvent).tool_calls[0].toolCallId).not.toBe('');
    expect((secondRun[0] as ChatCompletionChunkEvent).tool_calls[0].toolCallId).not.toBe('');
  });
});
