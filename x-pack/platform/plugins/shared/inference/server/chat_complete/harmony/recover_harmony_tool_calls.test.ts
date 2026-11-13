/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom, Subject, toArray } from 'rxjs';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ChatCompletionEventType, isChatCompletionChunkEvent } from '@kbn/inference-common';
import type { ChatCompletionChunkEvent, ChatCompletionChunkToolCall } from '@kbn/inference-common';
import { recoverHarmonyToolCalls } from './recover_harmony_tool_calls';
import { HARMONY_TOOL_CALL_HOLD } from './parse_harmony_tool_call';
import { mergeChunks } from '../utils/merge_chunks';

const logger = loggingSystemMock.createLogger();

const chunk = (content: string, reasoning?: string): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content,
  tool_calls: [],
  ...(reasoning ? { reasoning } : {}),
});

/** A chunk the gateway parsed itself: the call arrives as a native tool call. */
const nativeChunk = (
  toolCalls: ChatCompletionChunkToolCall[],
  content = ''
): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content,
  tool_calls: toolCalls,
});

const nativeCall = (
  args: string,
  overrides: Partial<ChatCompletionChunkToolCall> = {}
): ChatCompletionChunkToolCall => ({
  index: 0,
  toolCallId: 'call_1',
  function: { name: 'load_skill', arguments: args },
  ...overrides,
});

// Verbatim tail of the gpt-oss-120b content observed in the weekly build eval run.
const leakedContent =
  'analysisLet me plan the tool calls. First: load the attack discovery skill.' +
  'assistantcommentary to=functions.load_skill json{\n  "skill": "attack-discovery-generator"\n}';

// Verbatim assistant content of the openai-gpt-oss-120b cells in weekly build
// 01a12766 (suite attack-discovery-agent-builder, example 0): the model reasoned,
// then asked for the tool in text with the harmony markers stripped by the
// serving layer, so nothing executed and the whole turn was rendered as prose.
const leakedGetStatusContent =
  'analysisThe skill loaded; now we need to get status of execution_uuid ' +
  'a1b2c3d4-e5f6-7890-abcd-ef0123456789 using security.attack-discovery.get_status. ' +
  "This advances user's request." +
  'assistantcommentary to=functions.security.attack-discovery.get_status json{\n' +
  '  "execution_uuid": "a1b2c3d4-e5f6-7890-abcd-ef0123456789"\n' +
  '}';

const run = async (events: ChatCompletionChunkEvent[], declaredToolNames?: readonly string[]) =>
  lastValueFrom(
    from(events).pipe(recoverHarmonyToolCalls({ logger, declaredToolNames }), toArray())
  );

const asChunks = (events: Awaited<ReturnType<typeof run>>) =>
  events.filter(isChatCompletionChunkEvent);

const toolCallsOf = (events: Awaited<ReturnType<typeof run>>) =>
  asChunks(events).flatMap((event) => event.tool_calls);

const contentOf = (events: Awaited<ReturnType<typeof run>>) =>
  asChunks(events)
    .map((event) => event.content)
    .join('');

describe('recoverHarmonyToolCalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
            toolCallId: 'load_skill-0',
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
    const toolCalls = toolCallsOf(events);

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function).toEqual({
      name: 'load_skill',
      arguments: '{\n  "skill": "attack-discovery-generator"\n}',
    });
    expect(contentOf(events)).not.toContain('to=functions.');
  });

  it('passes plain content through, including text that mentions the marker in prose', async () => {
    const text = `The model wrote to=functions.load_skill json{"skill":"x"} verbatim.${'x'.repeat(
      HARMONY_TOOL_CALL_HOLD
    )}`;

    const events = await run([chunk(text), chunk(' tail')]);

    expect(toolCallsOf(events)).toHaveLength(0);
    expect(contentOf(events)).toBe(`${text} tail`);
    // Prose is not a leak: nothing to warn about.
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('holds buffered content back until an incomplete call completes', async () => {
    const pending = 'assistantcommentary to=functions.load_skill json{"skill": "attack-';
    const emitted: Awaited<ReturnType<typeof run>> = [];
    const subject = new Subject<ChatCompletionChunkEvent>();
    subject.pipe(recoverHarmonyToolCalls({ logger })).subscribe((event) => emitted.push(event));

    subject.next(chunk('prefix text '.repeat(8) + pending));
    // A pending call holds the whole buffer: emitting the text early would split
    // the marker and lose the call.
    expect(emitted).toEqual([]);

    subject.next(chunk('discovery"}'));
    expect(toolCallsOf(emitted)).toHaveLength(1);
    expect(contentOf(emitted)).toBe('prefix text '.repeat(8));

    subject.complete();
  });

  it('never parses reasoning: harmony analysis is the model text, not a call', async () => {
    const events = await run([chunk('', leakedContent)]);
    const chunks = asChunks(events);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].reasoning).toBe(leakedContent);
    expect(chunks[0].tool_calls).toHaveLength(0);
  });

  it('forwards a native tool call instead of swallowing it', async () => {
    const events = await run([nativeChunk([nativeCall('{"skill":"a"}')], 'thinking out loud')]);

    expect(toolCallsOf(events)).toEqual([
      {
        index: 0,
        toolCallId: 'call_1',
        function: { name: 'load_skill', arguments: '{"skill":"a"}' },
      },
    ]);
    expect(contentOf(events)).toBe('thinking out loud');
  });

  it('forwards a native tool call split across chunks and keeps it mergeable', async () => {
    const events = await run([
      nativeChunk([nativeCall('{"skill"')]),
      nativeChunk([{ index: 0, toolCallId: '', function: { name: '', arguments: ':"a"}' } }]),
    ]);

    expect(mergeChunks(asChunks(events)).tool_calls).toEqual([
      {
        toolCallId: 'call_1',
        function: { name: 'load_skill', arguments: '{"skill":"a"}' },
      },
    ]);
  });

  it('forwards a refusal instead of dropping it', async () => {
    const events = await run([
      { ...chunk(''), refusal: 'I cannot help with that.' },
      nativeChunk([nativeCall('{}')]),
    ]);
    const chunks = asChunks(events);

    expect(chunks[0]).toEqual({
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: '',
      tool_calls: [],
      refusal: 'I cannot help with that.',
    });
    // A refusal does not stop the next chunk from being processed.
    expect(toolCallsOf(events)).toHaveLength(1);
  });

  it('forwards reasoning and a native tool call carried by the same event', async () => {
    const events = await run([
      {
        ...nativeChunk([nativeCall('{}')]),
        reasoning: 'I should load the skill first',
      },
    ]);

    expect(asChunks(events)).toEqual([
      {
        type: ChatCompletionEventType.ChatCompletionChunk,
        content: '',
        tool_calls: [
          {
            index: 0,
            toolCallId: 'call_1',
            function: { name: 'load_skill', arguments: '{}' },
          },
        ],
        reasoning: 'I should load the skill first',
      },
    ]);
  });

  it('recovers two same-name harmony calls as two distinct tool calls', async () => {
    const text =
      'assistantcommentary to=functions.load_skill json{"skill":"a"}' +
      'assistantcommentary to=functions.load_skill json{"skill":"b"}';

    const events = await run([chunk(text)]);

    expect(toolCallsOf(events)).toEqual([
      {
        index: 0,
        toolCallId: 'load_skill-0',
        function: { name: 'load_skill', arguments: '{"skill":"a"}' },
      },
      {
        index: 1,
        toolCallId: 'load_skill-1',
        function: { name: 'load_skill', arguments: '{"skill":"b"}' },
      },
    ]);
    // The two calls must survive chunk merging as two calls: a shared
    // toolCallId (or index) concatenates their arguments into invalid JSON.
    expect(mergeChunks(asChunks(events)).tool_calls).toEqual([
      { toolCallId: 'load_skill-0', function: { name: 'load_skill', arguments: '{"skill":"a"}' } },
      { toolCallId: 'load_skill-1', function: { name: 'load_skill', arguments: '{"skill":"b"}' } },
    ]);
  });

  it('leaves a call to an undeclared tool in the content', async () => {
    const text = 'assistantcommentary to=functions.delete_index json{"index":"x"}';

    const events = await run([chunk(text)], ['load_skill']);

    expect(toolCallsOf(events)).toHaveLength(0);
    expect(contentOf(events)).toBe(text);
  });

  it('recovers a call to a declared tool when the declared names are passed in', async () => {
    const events = await run([chunk(leakedContent)], ['load_skill']);

    expect(toolCallsOf(events)).toEqual([
      {
        index: 0,
        toolCallId: 'load_skill-0',
        function: {
          name: 'load_skill',
          arguments: '{\n  "skill": "attack-discovery-generator"\n}',
        },
      },
    ]);
  });

  it('recovers the verbatim call the weekly gpt-oss-120b run left in the content', async () => {
    const events = await run(
      [chunk(leakedGetStatusContent)],
      ['security.attack-discovery.get_status']
    );

    expect(toolCallsOf(events)).toEqual([
      {
        index: 0,
        toolCallId: 'security.attack-discovery.get_status-0',
        function: {
          name: 'security.attack-discovery.get_status',
          arguments: '{\n  "execution_uuid": "a1b2c3d4-e5f6-7890-abcd-ef0123456789"\n}',
        },
      },
    ]);
    expect(contentOf(events)).toBe(
      'analysisThe skill loaded; now we need to get status of execution_uuid ' +
        'a1b2c3d4-e5f6-7890-abcd-ef0123456789 using security.attack-discovery.get_status. ' +
        "This advances user's request."
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns instead of dropping a harmony call to an undeclared tool in silence', async () => {
    const text = 'assistantcommentary to=functions.delete_index json{"index":"x"}';

    const events = await run([chunk(text)], ['load_skill']);

    expect(toolCallsOf(events)).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'Harmony tool call(s) for delete_index left in the assistant content and will not execute'
    );
  });
});
