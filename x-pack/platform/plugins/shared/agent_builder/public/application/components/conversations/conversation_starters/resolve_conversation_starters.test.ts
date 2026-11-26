/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveConversationStarters } from './resolve_conversation_starters';

const labels = (...values: string[]) => values.map((label) => ({ label }));

describe('resolveConversationStarters', () => {
  it('returns the default starters when nothing is more specific', () => {
    expect(resolveConversationStarters({ defaultStarters: labels('a', 'b') })).toEqual({
      starters: labels('a', 'b'),
      source: 'default',
    });
  });

  it('returns the starters of the solution instead of the default ones', () => {
    expect(
      resolveConversationStarters({
        solutionStarters: labels('s1', 's2'),
        defaultStarters: labels('a', 'b', 'c'),
      })
    ).toEqual({ starters: labels('s1', 's2'), source: 'solution' });
  });

  it('prefers the starters of the app, without filling in the other lists', () => {
    expect(
      resolveConversationStarters({
        appStarters: labels('app'),
        solutionStarters: labels('s1', 's2'),
        defaultStarters: labels('a', 'b', 'c'),
      })
    ).toEqual({ starters: labels('app'), source: 'application' });
  });

  it.each([
    ['an empty list of the app', { appStarters: [] }],
    ['a list of the app with only blank labels', { appStarters: labels('', '   ') }],
    ['an empty list of the solution', { solutionStarters: [] }],
    ['a list of the solution with only blank labels', { solutionStarters: labels(' ') }],
  ])('falls back to the default starters for %s', (_name, lists) => {
    expect(resolveConversationStarters({ ...lists, defaultStarters: labels('a') })).toEqual({
      starters: labels('a'),
      source: 'default',
    });
  });

  it('returns an empty list when there are no starters', () => {
    expect(resolveConversationStarters({})).toEqual({ starters: [], source: 'default' });
  });

  it('trims labels, and drops blank and repeated labels keeping the first', () => {
    expect(
      resolveConversationStarters({ appStarters: labels('  a  ', '', '   ', 'a', 'b') }).starters
    ).toEqual(labels('a', 'b'));
  });

  it('keeps and trims the prompts, and drops blank ones', () => {
    expect(
      resolveConversationStarters({
        appStarters: [
          { label: 'a', prompt: '  Tell me about a  ' },
          { label: 'b', prompt: '   ' },
        ],
      }).starters
    ).toEqual([{ label: 'a', prompt: 'Tell me about a' }, { label: 'b' }]);
  });

  it('keeps at most three starters', () => {
    expect(
      resolveConversationStarters({ appStarters: labels('1', '2', '3', '4', '5') }).starters
    ).toEqual(labels('1', '2', '3'));
  });
});
