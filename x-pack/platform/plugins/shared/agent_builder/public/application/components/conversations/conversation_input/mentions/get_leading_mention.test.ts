/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLeadingMention } from './get_leading_mention';

const julian = '[@Julian Rosado](mention://u_julian_0?kind=user)';
const andrew = '[@Andrew Brown](mention://u_andrew_0?kind=user)';
const agent = '[@Elastic AI Agent](mention://my-agent?kind=agent)';
const image = '[photo.png](image://photo.png)';
const skill = '[/Summarize](skill://skill-1)';

describe('getLeadingMention', () => {
  it('finds a user mention at the start', () => {
    expect(getLeadingMention(`${julian} look`)).toEqual({ id: 'u_julian_0', kind: 'user' });
  });

  it('finds an agent mention at the start', () => {
    expect(getLeadingMention(`${agent} summarize`)).toEqual({ id: 'my-agent', kind: 'agent' });
  });

  it('finds a mention with nothing after it', () => {
    expect(getLeadingMention(julian)).toEqual({ id: 'u_julian_0', kind: 'user' });
  });

  it.each([
    ['spaces', '  '],
    ['a new line', '\n'],
    ['empty lines and spaces', '\n \n  '],
    ['a zero-width space the editor adds before a first chip', '​'],
  ])('ignores %s before the mention', (_name, before) => {
    expect(getLeadingMention(`${before}${julian} look`)).toEqual({
      id: 'u_julian_0',
      kind: 'user',
    });
  });

  it('only looks at the first mention', () => {
    expect(getLeadingMention(`${agent} - ${julian} is the best`)).toEqual({
      id: 'my-agent',
      kind: 'agent',
    });
  });

  it('finds the next mention once the first one is deleted, only if it is now at the start', () => {
    expect(getLeadingMention(`, talk to ${andrew} please`)).toBeUndefined();
    expect(getLeadingMention(`${andrew} please`)).toEqual({ id: 'u_andrew_0', kind: 'user' });
  });

  it('ignores a mention after text', () => {
    expect(getLeadingMention(`hey ${julian} look`)).toBeUndefined();
  });

  it('ignores a mention after an image', () => {
    expect(getLeadingMention(`${image} ${julian}`)).toBeUndefined();
  });

  it('ignores a mention after another command chip', () => {
    expect(getLeadingMention(`${skill} ${julian}`)).toBeUndefined();
  });

  it('ignores a chip that is not a mention', () => {
    expect(getLeadingMention(`${skill} look`)).toBeUndefined();
  });

  it('ignores typed @name text that was not picked from the menu', () => {
    expect(getLeadingMention('@julian look')).toBeUndefined();
  });

  it('ignores a mention without a known kind', () => {
    expect(getLeadingMention('[@Julian](mention://u_julian_0) look')).toBeUndefined();
    expect(getLeadingMention('[@Julian](mention://u_julian_0?kind=team) look')).toBeUndefined();
  });

  it.each([
    ['empty text', ''],
    ['only whitespace', '  \n '],
  ])('returns nothing for %s', (_n, text) => {
    expect(getLeadingMention(text)).toBeUndefined();
  });
});
