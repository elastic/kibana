/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRoundTranscript,
  MAX_ROUND_CHARS,
  MAX_TOOL_RESULT_CHARS,
  parseMessages,
} from './trace_transcripts';

const user = (text: string) => ({ role: 'user', parts: [{ type: 'text', content: text }] });
const assistant = (text: string) => ({
  role: 'assistant',
  parts: [{ type: 'text', content: text }],
});

/** The shapes Agent Builder records on a `chat` span, as stored in its traces data stream. */
const toolCalls = {
  role: 'assistant',
  parts: [
    {
      type: 'tool_call',
      id: 'c1',
      name: 'platform_core_list_indices',
      arguments: '{"pattern":"logs-*"}',
    },
  ],
};
const toolResult = {
  role: 'tool',
  parts: [
    {
      type: 'tool_call_response',
      id: 'c1',
      response: JSON.stringify({
        response: '<tool_result>{"results":[{"data":{"indices":["logs-a"]}}]}</tool_result>',
      }),
    },
  ],
};

describe('parseMessages', () => {
  it('reads the JSON string a span stores, and an array as it is', () => {
    expect(parseMessages(JSON.stringify([user('hi')]))).toEqual([user('hi')]);
    expect(parseMessages([user('hi')])).toEqual([user('hi')]);
  });

  it('drops what is not a message, and returns nothing for what is not an array', () => {
    expect(
      parseMessages(JSON.stringify([user('hi'), { role: 1 }, null, { role: 'user' }]))
    ).toEqual([user('hi')]);
    expect(parseMessages('not json')).toEqual([]);
    expect(parseMessages('{"role":"user"}')).toEqual([]);
    expect(parseMessages(undefined)).toEqual([]);
  });
});

describe('buildRoundTranscript', () => {
  it('renders the round from its last user message: the question, tool calls, their results and the answer', () => {
    const transcript = buildRoundTranscript({
      lastChat: {
        inputMessages: JSON.stringify([
          user('[User: jdoe — Sent: 2026-11-10T09:00:00Z]\n\nAn earlier question'),
          assistant('An earlier answer'),
          user('[User: jdoe — Sent: 2026-11-11T13:11:39Z]\n\nWhich logs indices are there?'),
          toolCalls,
          toolResult,
        ]),
        outputMessages: JSON.stringify([
          {
            role: 'assistant',
            finish_reason: 'stop',
            parts: [{ type: 'text', content: 'Just logs-a.' }],
          },
        ]),
      },
    });

    expect(transcript).toBe(
      [
        'User: Which logs indices are there?',
        'Assistant called platform_core_list_indices: {"pattern":"logs-*"}',
        'Tool result: {"results":[{"data":{"indices":["logs-a"]}}]}',
        'Assistant: Just logs-a.',
      ].join('\n')
    );
  });

  it('starts at what the user sent, leaving out the user messages Agent Builder adds itself', () => {
    const attachmentEvent = user(
      '<conversation_event type="attachment_added" timestamp="2026-11-11T13:11:56Z">\n  <attachment attachment_type="text" />\n</conversation_event>'
    );
    const transcript = buildRoundTranscript({
      lastChat: {
        inputMessages: [
          user(
            '[User: elastic — Sent: 2026-11-11T13:11:39Z]\n\nI am Tom, I want vegetarian meals.'
          ),
          toolCalls,
          toolResult,
          attachmentEvent,
        ],
        outputMessages: [assistant('Noted, Tom.')],
      },
    });

    expect(transcript).toBe(
      [
        'User: I am Tom, I want vegetarian meals.',
        'Assistant called platform_core_list_indices: {"pattern":"logs-*"}',
        'Tool result: {"results":[{"data":{"indices":["logs-a"]}}]}',
        'Assistant: Noted, Tom.',
      ].join('\n')
    );
  });

  it('starts at the last user message for a source without sender headers', () => {
    expect(
      buildRoundTranscript({
        lastChat: {
          inputMessages: [user('first'), assistant('one'), user('second')],
          outputMessages: [assistant('two')],
        },
      })
    ).toBe('User: second\nAssistant: two');
  });

  it('cuts long tool results, and keeps the start and the end of a long round', () => {
    const long = {
      role: 'tool',
      parts: [{ type: 'tool_call_response', id: 'c1', response: 'x'.repeat(10_000) }],
    };
    const short = buildRoundTranscript({
      lastChat: {
        inputMessages: [user('q'), toolCalls, long],
        outputMessages: [assistant('done')],
      },
    });
    expect(short).toContain(`Tool result: ${'x'.repeat(MAX_TOOL_RESULT_CHARS)} […]`);

    const many = Array.from({ length: 40 }, () => long);
    const capped = buildRoundTranscript({
      lastChat: {
        inputMessages: [user('the question'), ...many],
        outputMessages: [assistant('the answer')],
      },
    });
    expect(capped!.length).toBeLessThanOrEqual(MAX_ROUND_CHARS + 10);
    expect(capped!.startsWith('User: the question')).toBe(true);
    expect(capped!.endsWith('Assistant: the answer')).toBe(true);
  });

  it('keeps only the answer when the user message was left out of the trace', () => {
    expect(
      buildRoundTranscript({
        lastChat: {
          inputMessages: [assistant('An earlier answer')],
          outputMessages: [assistant('Now this.')],
        },
      })
    ).toBe('Assistant: Now this.');
  });

  it('has nothing to say for a round whose spans hold no conversation text', () => {
    expect(buildRoundTranscript({})).toBeUndefined();
    expect(buildRoundTranscript({ lastChat: {} })).toBeUndefined();
    expect(
      buildRoundTranscript({
        lastChat: { inputMessages: [toolResult], outputMessages: [toolCalls] },
      })
    ).toBeUndefined();
  });
});
