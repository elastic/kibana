/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom, toArray } from 'rxjs';
import type {
  Anonymization,
  AnonymizationOutput,
  ChatCompletionChunkEvent,
  ChatCompletionEvent,
  ChatCompletionMessageEvent,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { deanonymizeMessage } from '@kbn/ai-anonymization-server';
import { chunkEvent, createMask, messageEvent } from '../test_utils';
import { mergeChunks } from './utils/merge_chunks';

function concatenateChunkContent(events: ChatCompletionEvent[]): string {
  return events
    .filter(
      (event): event is ChatCompletionChunkEvent =>
        event.type === ChatCompletionEventType.ChatCompletionChunk
    )
    .map((event) => event.content)
    .join('');
}

describe('deanonymizeMessage output merged by inference', () => {
  const value = 'jorge@gmail.com';
  const mask = createMask('EMAIL', value);
  const anonymizations: Anonymization[] = [
    { entity: { class_name: 'EMAIL', value, mask }, rule: { type: 'RegExp' } },
  ];
  const anonymizationOutput: AnonymizationOutput = {
    messages: [],
    anonymizations,
  } as AnonymizationOutput;

  it('emits each tool call once, deanonymized, so concatenating chunks yields valid tool calls', async () => {
    const maskedArguments = JSON.stringify({ email: mask });
    const events = [
      chunkEvent('', [
        {
          index: 0,
          toolCallId: 'call_1',
          function: { name: 'send_email', arguments: maskedArguments.slice(0, 15) },
        },
      ]),
      chunkEvent('', [
        {
          index: 0,
          toolCallId: '',
          function: { name: '', arguments: maskedArguments.slice(15) },
        },
      ]),
      messageEvent('', [
        {
          toolCallId: 'call_1',
          function: { name: 'send_email', arguments: { email: mask } },
        },
      ]),
    ];

    const result = await lastValueFrom(
      from(events).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    const chunkEvents = result.filter(
      (event): event is ChatCompletionChunkEvent =>
        event.type === ChatCompletionEventType.ChatCompletionChunk
    );

    // No chunk may carry the model's raw (masked) tool call fragments.
    expect(JSON.stringify(chunkEvents.flatMap((chunk) => chunk.tool_calls))).not.toContain(mask);

    const merged = mergeChunks(chunkEvents);
    expect(merged.tool_calls).toEqual([
      {
        toolCallId: 'call_1',
        function: { name: 'send_email', arguments: JSON.stringify({ email: value }) },
      },
    ]);
    expect(JSON.parse(merged.tool_calls[0].function.arguments)).toEqual({ email: value });

    const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;
    expect(messageOut.toolCalls).toEqual([
      { toolCallId: 'call_1', function: { name: 'send_email', arguments: { email: value } } },
    ]);
  });

  it('emits the refusal once, deanonymized, on the catch-up chunk instead of forwarding fragments', async () => {
    const events: ChatCompletionEvent[] = [
      { ...chunkEvent('Hello '), refusal: 'cannot help with ' },
      { ...chunkEvent(mask), refusal: mask },
      { ...messageEvent(`Hello ${mask}`), refusal: `cannot help with ${mask}` },
    ];

    const result = await lastValueFrom(
      from(events).pipe(deanonymizeMessage(anonymizationOutput), toArray())
    );

    const chunkEvents = result.filter(
      (event): event is ChatCompletionChunkEvent =>
        event.type === ChatCompletionEventType.ChatCompletionChunk
    );

    // Streamed fragments are dropped; only the catch-up chunk carries the refusal.
    const chunksWithRefusal = chunkEvents.filter((chunk) => chunk.refusal !== undefined);
    expect(chunksWithRefusal).toHaveLength(1);
    expect(chunksWithRefusal[0]).toBe(chunkEvents[chunkEvents.length - 1]);

    // Assembling the response from chunks alone yields the deanonymized refusal.
    expect(mergeChunks(chunkEvents).refusal).toBe(`cannot help with ${value}`);
    expect(concatenateChunkContent(result)).toBe(`Hello ${value}`);

    const messageOut = result[result.length - 1] as ChatCompletionMessageEvent;
    expect(messageOut.refusal).toBe(`cannot help with ${value}`);
  });

  it('does not add a refusal to the catch-up chunk when the model did not refuse', async () => {
    const result = await lastValueFrom(
      from([chunkEvent(`Hello ${mask}`), messageEvent(`Hello ${mask}`)]).pipe(
        deanonymizeMessage(anonymizationOutput),
        toArray()
      )
    );

    for (const event of result) {
      expect(event).not.toHaveProperty('refusal');
    }
  });
});
