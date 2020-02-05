/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderTemplate, getMedianStringLength } from './string_utils';

const strings: string[] = [
  'foo',
  'foofoofoofoofoo',
  'foofoofoo',
  'f',
  'f',
  'foofoofoofoofoofoofoo',
];
const noStrings: string[] = [];

describe('ML - string utils', () => {
  describe('renderTemplate', () => {
    test('returns plain string', () => {
      const templateString = 'plain string';
      const result = renderTemplate(templateString);
      expect(result).toBe(result);
    });
    test('returns rendered template with one replacement', () => {
      const templateString = 'string with {{one}} replacement';
      const result = renderTemplate(templateString, { one: '1' });
      expect(result).toBe('string with 1 replacement');
    });
    test('returns rendered template with two replacements', () => {
      const templateString = 'string with {{one}} replacement, and a {{two}} one.';
      const result = renderTemplate(templateString, { one: '1', two: '2nd' });
      expect(result).toBe('string with 1 replacement, and a 2nd one.');
    });
  });

  describe('getMedianStringLength', () => {
    test('test median for string array', () => {
      const result = getMedianStringLength(strings);
      expect(result).toBe(9);
    });

    test('test median for no strings', () => {
      const result = getMedianStringLength(noStrings);
      expect(result).toBe(0);
    });
  });
});
