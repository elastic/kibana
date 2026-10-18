/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom, toArray } from 'rxjs';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ChatCompletionEventType, isChatCompletionChunkEvent } from '@kbn/inference-common';
import type { ChatCompletionChunkEvent } from '@kbn/inference-common';
import { recoverHarmonyToolCalls } from './recover_harmony_tool_calls';
import { HARMONY_TOOL_CALL_HOLD } from './parse_harmony_tool_call';

const logger = loggingSystemMock.createLogger();

const chunk = (content: string, reasoning?: string): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content,
  tool_calls: [],
  ...(reasoning ? { reasoning } : {}),
});

// Verbatim tail of the gpt-oss-120b content observed in the weekly build eval run.
const leakedContent =
  'analysisLet me plan the tool calls. First: load the attack discovery skill.' +
  'assistantcommentary to=functions.load_skill json{\n  "skill": "attack-discovery-generator"\n}';

const run = async (events: ChatCompletionChunkEvent[]) =>
  lastValueFrom(from(events).pipe(recoverHarmonyToolCalls({ logger }), toArray()));

const asChunks = (events: Awaited<ReturnType<typeof run>>) =>
  events.filter(isChatCompletionChunkEvent);

describe('recoverHarmonyToolCalls', () => {
  it('emits a tool call instead of content when the call arrives in one chunk', async () => {
    const events = await run([chunk(leakedContent)]);

    expect(events).toEqual([
      {
        type: ChatCompletionEventType.ChatCompletionChunk,
        content: 'analysisLet me plan the tool calls. First: load the attack discovery skill.',
        tool_calls: [],
      },
      {
        type: ChatCompletionEventType.ChatCompletionChunk,
        content: '',
        tool_calls: [
          {
            index: 0,
            toolCallId: 'load_skill',
            function: {
              name: 'load_skill',
              arguments: '{\n  "skill": "attack-discovery-generator"\n}',
            },
          },
        ],
      },
    ]);
  });

  it('recovers the call when the marker is split across chunks', async () => {
    const mid = 'assistantcom';
    const first = leakedContent.slice(0, leakedContent.indexOf(mid) + mid.length);
    const rest = leakedContent.slice(first.length);

    const events = await run([chunk(first), chunk(rest.slice(0, 5)), chunk(rest.slice(5))]);
    const chunks = asChunks(events);
    const toolCalls = chunks.flatMap((event) => event.tool_calls ?? []);

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function).toEqual({
      name: 'load_skill',
      arguments: '{\n  "skill": "attack-discovery-generator"\n}',
    });
    expect(chunks.map((event) => event.content).join('')).not.toContain('to=functions.');
  });

  it('passes plain content through, including text that mentions the marker in prose', async () => {
    const text = `The model wrote to=functions.load_skill json{"skill":"x"} verbatim.${'x'.repeat(
      HARMONY_TOOL_CALL_HOLD
    )}`;

    const events = await run([chunk(text), chunk(' tail')]);
    const chunks = asChunks(events);

    expect(chunks.every((event) => event.tool_calls.length === 0)).toBe(true);
    expect(chunks.map((event) => event.content).join('')).toBe(`${text} tail`);
  });

  it('streams content through while a call is still incomplete', async () => {
    const pending = 'assistantcommentary to=functions.load_skill json{"skill": "attack-';

    const events = await run([chunk('prefix text '.repeat(8) + pending), chunk('discovery"}')]);
    const chunks = asChunks(events);

    expect(chunks.flatMap((event) => event.tool_calls)).toHaveLength(1);
    expect(chunks.map((event) => event.content).join('')).toBe('prefix text '.repeat(8));
  });

  it('never parses reasoning: harmony analysis is the model text, not a call', async () => {
    const events = await run([chunk('', leakedContent)]);
    const chunks = asChunks(events);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].reasoning).toBe(leakedContent);
    expect(chunks[0].tool_calls).toHaveLength(0);
  });
});
