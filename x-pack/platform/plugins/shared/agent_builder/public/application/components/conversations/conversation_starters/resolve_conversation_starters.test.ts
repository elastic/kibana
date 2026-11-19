/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveConversationStarters } from './resolve_conversation_starters';

describe('resolveConversationStarters', () => {
  it('returns the agent starters when the consumer passes none', () => {
    expect(resolveConversationStarters({ agentStarters: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('uses the consumer starters instead of the agent starters', () => {
    expect(
      resolveConversationStarters({ consumerStarters: ['app'], agentStarters: ['a', 'b', 'c'] })
    ).toEqual(['app']);
  });

  it('falls back to the agent starters when the consumer list is empty or blank', () => {
    expect(resolveConversationStarters({ consumerStarters: [], agentStarters: ['a'] })).toEqual([
      'a',
    ]);
    expect(
      resolveConversationStarters({ consumerStarters: ['  ', ''], agentStarters: ['a'] })
    ).toEqual(['a']);
  });

  it('returns an empty list when neither source has starters', () => {
    expect(resolveConversationStarters({})).toEqual([]);
    expect(resolveConversationStarters({ agentStarters: [] })).toEqual([]);
  });

  it('trims values and drops empty and duplicate ones', () => {
    expect(resolveConversationStarters({ agentStarters: ['  a  ', '', 'a', 'b', '   '] })).toEqual([
      'a',
      'b',
    ]);
  });

  it('keeps at most three starters', () => {
    expect(resolveConversationStarters({ consumerStarters: ['1', '2', '3', '4', '5'] })).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(resolveConversationStarters({ agentStarters: ['1', '2', '3', '4'] })).toEqual([
      '1',
      '2',
      '3',
    ]);
  });
});
