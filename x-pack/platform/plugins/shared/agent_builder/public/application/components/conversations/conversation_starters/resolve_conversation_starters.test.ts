/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveConversationStarters } from './resolve_conversation_starters';

const labels = (...values: string[]) => values.map((label) => ({ label }));

describe('resolveConversationStarters', () => {
  it('returns the agent starters', () => {
    expect(resolveConversationStarters({ agentStarters: labels('a', 'b') })).toEqual(
      labels('a', 'b')
    );
  });

  it('returns an empty list when the agent has no starters', () => {
    expect(resolveConversationStarters({})).toEqual([]);
    expect(resolveConversationStarters({ agentStarters: [] })).toEqual([]);
  });

  it('trims labels', () => {
    expect(resolveConversationStarters({ agentStarters: labels('  a  ', 'b') })).toEqual(
      labels('a', 'b')
    );
  });

  it('drops starters without a label and repeated labels, keeping the first', () => {
    expect(
      resolveConversationStarters({ agentStarters: labels('a', '', '   ', 'a', 'b') })
    ).toEqual(labels('a', 'b'));
  });

  it('keeps at most three starters', () => {
    expect(resolveConversationStarters({ agentStarters: labels('1', '2', '3', '4', '5') })).toEqual(
      labels('1', '2', '3')
    );
  });
});
