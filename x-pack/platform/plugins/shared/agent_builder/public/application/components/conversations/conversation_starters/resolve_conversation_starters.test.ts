/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveConversationStarters } from './resolve_conversation_starters';

const labels = (...values: string[]) => values.map((label) => ({ label }));

describe('resolveConversationStarters', () => {
  it('returns the default starters when the app has none', () => {
    expect(resolveConversationStarters({ defaultStarters: labels('a', 'b') })).toEqual({
      starters: labels('a', 'b'),
      source: 'default',
    });
  });

  it('returns the starters of the app instead of the default ones', () => {
    expect(
      resolveConversationStarters({
        appStarters: labels('app 1', 'app 2'),
        defaultStarters: labels('a', 'b', 'c'),
      })
    ).toEqual({ starters: labels('app 1', 'app 2'), source: 'application' });
  });

  it('does not fill in the default starters after the starters of the app', () => {
    expect(
      resolveConversationStarters({
        appStarters: labels('app 1'),
        defaultStarters: labels('a', 'b'),
      }).starters
    ).toEqual(labels('app 1'));
  });

  it('returns the starters of the solution instead of the default ones', () => {
    expect(
      resolveConversationStarters({
        solutionStarters: labels('s1', 's2'),
        defaultStarters: labels('a', 'b', 'c'),
      })
    ).toEqual({ starters: labels('s1', 's2'), source: 'solution' });
  });

  it('prefers the starters of the app over those of the solution and the default ones', () => {
    expect(
      resolveConversationStarters({
        appStarters: labels('app'),
        solutionStarters: labels('s1'),
        defaultStarters: labels('a'),
      })
    ).toEqual({ starters: labels('app'), source: 'application' });
  });

  it('falls back to the default starters when the solution has none', () => {
    expect(
      resolveConversationStarters({ solutionStarters: [], defaultStarters: labels('a') })
    ).toEqual({ starters: labels('a'), source: 'default' });
    expect(
      resolveConversationStarters({ solutionStarters: labels(' '), defaultStarters: labels('a') })
    ).toEqual({ starters: labels('a'), source: 'default' });
  });

  it('uses the default starters when the app passes an empty list or only blank labels', () => {
    expect(resolveConversationStarters({ appStarters: [], defaultStarters: labels('a') })).toEqual({
      starters: labels('a'),
      source: 'default',
    });
    expect(
      resolveConversationStarters({ appStarters: labels('', '   '), defaultStarters: labels('a') })
    ).toEqual({ starters: labels('a'), source: 'default' });
  });

  it('returns an empty list when there are no starters', () => {
    expect(resolveConversationStarters({})).toEqual({ starters: [], source: 'default' });
    expect(resolveConversationStarters({ appStarters: [], defaultStarters: [] })).toEqual({
      starters: [],
      source: 'default',
    });
  });

  it('trims labels', () => {
    expect(resolveConversationStarters({ appStarters: labels('  a  ', 'b') }).starters).toEqual(
      labels('a', 'b')
    );
  });

  it('drops starters without a label and repeated labels, keeping the first', () => {
    expect(
      resolveConversationStarters({ appStarters: labels('a', '', '   ', 'a', 'b') }).starters
    ).toEqual(labels('a', 'b'));
  });

  it('keeps at most three starters', () => {
    expect(
      resolveConversationStarters({ defaultStarters: labels('1', '2', '3', '4', '5') }).starters
    ).toEqual(labels('1', '2', '3'));
    expect(
      resolveConversationStarters({ appStarters: labels('1', '2', '3', '4', '5') }).starters
    ).toEqual(labels('1', '2', '3'));
  });
});
