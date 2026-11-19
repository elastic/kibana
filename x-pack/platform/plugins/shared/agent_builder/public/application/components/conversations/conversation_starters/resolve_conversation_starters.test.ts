/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveConversationStarters } from './resolve_conversation_starters';

const labels = (...values: string[]) => values.map((label) => ({ label }));

describe('resolveConversationStarters', () => {
  it('returns the agent starters when the consumer passes none', () => {
    expect(resolveConversationStarters({ agentStarters: labels('a', 'b') })).toEqual(
      labels('a', 'b')
    );
  });

  it('uses the consumer starters instead of the agent starters', () => {
    expect(
      resolveConversationStarters({
        consumerStarters: labels('app'),
        agentStarters: labels('a', 'b', 'c'),
      })
    ).toEqual(labels('app'));
  });

  it('falls back to the agent starters when the consumer list is empty or blank', () => {
    expect(
      resolveConversationStarters({ consumerStarters: [], agentStarters: labels('a') })
    ).toEqual(labels('a'));
    expect(
      resolveConversationStarters({
        consumerStarters: labels('  ', ''),
        agentStarters: labels('a'),
      })
    ).toEqual(labels('a'));
  });

  it('returns an empty list when neither source has starters', () => {
    expect(resolveConversationStarters({})).toEqual([]);
    expect(resolveConversationStarters({ agentStarters: [] })).toEqual([]);
  });

  it('keeps the prompt of a starter', () => {
    expect(
      resolveConversationStarters({
        agentStarters: [{ label: 'Top errors', prompt: 'Show me the top 10 errors' }],
      })
    ).toEqual([{ label: 'Top errors', prompt: 'Show me the top 10 errors' }]);
  });

  it('trims labels and prompts and drops a prompt that is blank', () => {
    expect(
      resolveConversationStarters({
        agentStarters: [
          { label: '  a  ', prompt: '  send this  ' },
          { label: 'b', prompt: '   ' },
        ],
      })
    ).toEqual([{ label: 'a', prompt: 'send this' }, { label: 'b' }]);
  });

  it('drops starters without a label and repeated labels, keeping the first', () => {
    expect(
      resolveConversationStarters({
        agentStarters: [
          { label: 'a', prompt: 'first' },
          { label: '' },
          { label: '   ' },
          { label: 'a', prompt: 'second' },
          { label: 'b' },
        ],
      })
    ).toEqual([{ label: 'a', prompt: 'first' }, { label: 'b' }]);
  });

  it('keeps at most three starters', () => {
    expect(
      resolveConversationStarters({ consumerStarters: labels('1', '2', '3', '4', '5') })
    ).toEqual(labels('1', '2', '3'));
    expect(resolveConversationStarters({ agentStarters: labels('1', '2', '3', '4') })).toEqual(
      labels('1', '2', '3')
    );
  });
});
