/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import type { ChatCompletionChunkEvent } from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { TOOL_USE_END, TOOL_USE_START } from './constants';
import { parseInlineFunctionCalls } from './parse_inline_function_calls';

const chunk = (content: string, finishReason?: string): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content,
  tool_calls: [],
  ...(finishReason ? { finish_reason: finishReason } : {}),
});

const run = (chunks: ChatCompletionChunkEvent[]) =>
  lastValueFrom(
    of(...chunks).pipe(parseInlineFunctionCalls({ logger: loggerMock.create() }), toArray())
  );

const finishReasons = (events: Awaited<ReturnType<typeof run>>) =>
  events.flatMap((event) =>
    event.type === ChatCompletionEventType.ChatCompletionChunk && event.finish_reason
      ? [event.finish_reason]
      : []
  );

describe('parseInlineFunctionCalls', () => {
  it('keeps the finish_reason on plain content chunks', async () => {
    const events = await run([chunk('hello'), chunk(' world', 'content_filter')]);

    expect(finishReasons(events)).toEqual(['content_filter']);
  });

  it('keeps the finish_reason when it arrives while a function call is being buffered', async () => {
    const events = await run([
      chunk(`${TOOL_USE_START}\n\`\`\`json\n{"name":"myTool","input":{}}\n\`\`\``),
      chunk('', 'stop'),
      chunk(TOOL_USE_END),
    ]);

    expect(events.some((event) => 'tool_calls' in event && event.tool_calls.length)).toBe(true);
    expect(finishReasons(events)).toEqual(['stop']);
  });
});
