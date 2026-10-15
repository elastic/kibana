/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { text as streamToString } from 'node:stream/consumers';
import { completionToEventStream } from './non_streaming';

describe('completionToEventStream', () => {
  const readEvents = async (stream: NodeJS.ReadableStream) =>
    (await streamToString(stream))
      .split('\n\n')
      .filter(Boolean)
      .map((line) => line.replace(/^data: /, ''));

  it('emits the message as a delta chunk, the usage as a separate chunk, then [DONE]', async () => {
    const events = await readEvents(
      completionToEventStream({
        id: 'chatcmpl-1',
        model: 'gpt-4o',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            finish_reason: 'tool_calls',
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                { id: 'call-1', type: 'function', function: { name: 'tool', arguments: '{}' } },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      })
    );

    expect(events).toHaveLength(3);
    expect(JSON.parse(events[0])).toEqual({
      id: 'chatcmpl-1',
      model: 'gpt-4o',
      object: 'chat.completion.chunk',
      choices: [
        {
          index: 0,
          finish_reason: 'tool_calls',
          delta: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                index: 0,
                function: { name: 'tool', arguments: '{}' },
              },
            ],
          },
        },
      ],
    });
    expect(JSON.parse(events[1])).toEqual({
      id: 'chatcmpl-1',
      model: 'gpt-4o',
      object: 'chat.completion.chunk',
      choices: [],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });
    expect(events[2]).toBe('[DONE]');
  });

  it('omits the usage chunk when the completion has no usage', async () => {
    const events = await readEvents(
      completionToEventStream({
        id: 'chatcmpl-1',
        choices: [
          { index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Hi' } },
        ],
      })
    );

    expect(events).toHaveLength(2);
    expect(JSON.parse(events[0]).choices[0].delta.content).toBe('Hi');
    expect(events[1]).toBe('[DONE]');
  });
});
