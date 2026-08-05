/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunkEvent } from '../../../test_utils';
import { manuallyCountPromptTokens, manuallyCountCompletionTokens } from './manually_count_tokens';

describe('manuallyCountPromptTokens', () => {
  const reference = manuallyCountPromptTokens({
    messages: [{ role: 'user', content: 'message' }],
  });

  it('counts token from the message content', () => {
    const count = manuallyCountPromptTokens({
      messages: [
        { role: 'user', content: 'question 1' },
        { role: 'assistant', content: 'answer 1' },
        { role: 'user', content: 'question 2' },
      ],
    });

    expect(count).toBeGreaterThan(reference);
  });

  it('counts token from tools', () => {
    const count = manuallyCountPromptTokens({
      messages: [{ role: 'user', content: 'message' }],
      tools: [{ type: 'function', function: { name: 'my-function', description: 'description' } }],
    });

    expect(count).toBeGreaterThan(reference);
  });
});

describe('manuallyCountPromptTokens - array content', () => {
  it('handles array content with text parts', () => {
    const count = manuallyCountPromptTokens({
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello world' }] }],
    });
    expect(count).toBeGreaterThan(0);
  });

  it('does not throw on empty array content', () => {
    expect(() =>
      manuallyCountPromptTokens({ messages: [{ role: 'user', content: [] }] })
    ).not.toThrow();
  });

  it('does not throw on non-text content parts', () => {
    expect(() =>
      manuallyCountPromptTokens({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: 'https://example.com/image.png' } },
              { type: 'text', text: 'describe' },
            ],
          },
        ],
      })
    ).not.toThrow();
  });

  it('returns a positive count for messages with non-text content parts', () => {
    const count = manuallyCountPromptTokens({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: 'https://example.com/image.png' } },
            { type: 'text', text: 'describe' },
          ],
        },
      ],
    });
    expect(count).toBeGreaterThan(0);
  });
});

describe('manuallyCountPromptTokens - special tokens', () => {
  it('does not throw when the prompt contains a GPT special token', () => {
    expect(() =>
      manuallyCountPromptTokens({
        messages: [{ role: 'user', content: 'Summarize: <|endoftext|>' }],
      })
    ).not.toThrow();
  });

  it('returns a positive count when the prompt contains a GPT special token', () => {
    const count = manuallyCountPromptTokens({
      messages: [{ role: 'user', content: 'Summarize: <|endoftext|>' }],
    });
    expect(count).toBeGreaterThan(0);
  });
});

describe('manuallyCountCompletionTokens', () => {
  const reference = manuallyCountCompletionTokens([chunkEvent('chunk-1')]);

  it('counts tokens from the content chunks', () => {
    const count = manuallyCountCompletionTokens([
      chunkEvent('chunk-1'),
      chunkEvent('chunk-2'),
      chunkEvent('chunk-2'),
    ]);

    expect(count).toBeGreaterThan(reference);
  });

  it('does not throw when a chunk contains a GPT special token', () => {
    expect(() =>
      manuallyCountCompletionTokens([chunkEvent('Result: <|endoftext|>')])
    ).not.toThrow();
  });

  it('returns a positive count when a chunk contains a GPT special token', () => {
    const count = manuallyCountCompletionTokens([chunkEvent('Result: <|endoftext|>')]);
    expect(count).toBeGreaterThan(0);
  });

  it('counts tokens from chunks with tool calls', () => {
    const count = manuallyCountCompletionTokens([
      chunkEvent('chunk-1', [
        {
          toolCallId: 'tool-call-id',
          index: 0,
          function: {
            name: 'function',
            arguments: '{}',
          },
        },
      ]),
    ]);

    expect(count).toBeGreaterThan(reference);
  });
});
