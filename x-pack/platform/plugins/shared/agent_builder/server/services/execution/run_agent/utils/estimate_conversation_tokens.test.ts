/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { estimateMessagesTokens } from './estimate_conversation_tokens';

describe('estimateMessagesTokens', () => {
  it('counts message content (~4 chars per token)', () => {
    expect(estimateMessagesTokens([new HumanMessage('a'.repeat(40))])).toBe(10);
  });

  it('counts tool_calls on AI messages in addition to content', () => {
    const withTools = estimateMessagesTokens([
      new AIMessage({
        content: '',
        tool_calls: [
          { id: '1', name: 'search', args: { query: 'x'.repeat(80) }, type: 'tool_call' },
        ],
      }),
    ]);
    const withoutTools = estimateMessagesTokens([new AIMessage({ content: '' })]);
    expect(withTools).toBeGreaterThan(withoutTools);
  });

  it('counts tool result message content', () => {
    expect(
      estimateMessagesTokens([new ToolMessage({ content: 'x'.repeat(40), tool_call_id: '1' })])
    ).toBe(10);
  });

  it('uses a flat cost for image_url content parts instead of character-based estimation', () => {
    const bigBase64 = 'a'.repeat(400_000); // ~1 MB PNG-scale payload
    const withImage = estimateMessagesTokens([
      new HumanMessage({
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${bigBase64}` } },
        ],
      }),
    ]);
    // If we were estimating char/4, this would be ~100k. Flat cost keeps it well below that.
    expect(withImage).toBeLessThan(2_000);
  });
});
