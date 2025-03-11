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
