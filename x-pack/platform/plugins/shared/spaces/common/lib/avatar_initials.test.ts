/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGraphemes, isValidSpaceInitials } from './avatar_initials';
import { MAX_SPACE_INITIALS_CODE_UNITS } from '../constants';

const THUMBS_UP = '\u{1F44D}';
const THUMBS_UP_MEDIUM = '\u{1F44D}\u{1F3FD}';
const DEVANAGARI_KSSA = '\u0915\u094D\u0937';

describe('getGraphemes', () => {
  it('keeps emoji modifiers and conjuncts with their base character', () => {
    expect(getGraphemes(`A${THUMBS_UP_MEDIUM}${DEVANAGARI_KSSA}`)).toEqual([
      'A',
      THUMBS_UP_MEDIUM,
      DEVANAGARI_KSSA,
    ]);
  });
});

describe('isValidSpaceInitials', () => {
  it.each([
    ['empty', ''],
    ['two letters', 'AB'],
    ['two emoji with skin tones', `${THUMBS_UP_MEDIUM}${THUMBS_UP_MEDIUM}`],
    ['a letter and an emoji', `A${THUMBS_UP}`],
    ['a Devanagari conjunct', DEVANAGARI_KSSA],
  ])('accepts %s', (_, initials) => {
    expect(isValidSpaceInitials(initials)).toBe(true);
  });

  it.each([
    ['three letters', 'ABC'],
    ['three emoji', `${THUMBS_UP}${THUMBS_UP}${THUMBS_UP}`],
  ])('rejects %s', (_, initials) => {
    expect(isValidSpaceInitials(initials)).toBe(false);
  });

  it('rejects a single grapheme over the code unit cap', () => {
    expect(isValidSpaceInitials(`a${'\u0301'.repeat(MAX_SPACE_INITIALS_CODE_UNITS)}`)).toBe(false);
  });
});
