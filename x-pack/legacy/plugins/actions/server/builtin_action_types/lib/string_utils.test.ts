/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withoutControlCharacters } from './string_utils';

describe('ensureSingleLineString()', () => {
  test('works with plain ole strings', () => {
    expect(withoutControlCharacters('')).toEqual('');
    expect(withoutControlCharacters(' a b c ')).toEqual(' a b c ');
  });

  test('works with multiple control characters', () => {
    expect(withoutControlCharacters(' \r \n ')).toEqual(' ; ; ');
    expect(withoutControlCharacters('\r \n ')).toEqual('; ; ');
    expect(withoutControlCharacters(' \r \n')).toEqual(' ; ;');
    expect(withoutControlCharacters('\r \n')).toEqual('; ;');
  });

  test('works with /00-/1F, except tab', () => {
    for (let c = 0; c <= 0x1f; c++) {
      if (c === 0x09) {
        expect(withoutControlCharacters(String.fromCharCode(c))).toEqual('\t');
      } else {
        expect(withoutControlCharacters(String.fromCharCode(c))).toEqual(';');
      }
    }
    expect(withoutControlCharacters(String.fromCharCode(0x20))).toEqual(' ');
  });

  test('works with /7F-/9F', () => {
    expect(withoutControlCharacters(String.fromCharCode(0x7e))).toEqual('~');
    for (let c = 0x7f; c <= 0x9f; c++) {
      expect(withoutControlCharacters(String.fromCharCode(c))).toEqual(';');
    }
    const nbsp = String.fromCharCode(0xa0);
    expect(withoutControlCharacters(nbsp)).toEqual(nbsp);
  });

  test('works with UCS newlines', () => {
    expect(withoutControlCharacters('\u2027')).toEqual('\u2027');
    expect(withoutControlCharacters('\u2028')).toEqual(';');
    expect(withoutControlCharacters('\u2029')).toEqual(';');
    expect(withoutControlCharacters('\u202A')).toEqual('\u202A');
  });
});
