/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDataJson } from './parse_data_json';

describe('parseDataJson', () => {
  describe('missing / empty input', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
    ])('returns an empty object for %s input', (_label, input) => {
      expect(parseDataJson(input)).toEqual({});
    });
  });

  describe('malformed input', () => {
    it.each([
      ['unterminated brace', '{'],
      ['stray comma', '{"a":1,}'],
      ['plain text', 'not json'],
      ['truncated string', '"abc'],
    ])('returns an empty object for %s', (_label, raw) => {
      expect(parseDataJson(raw)).toEqual({});
    });
  });

  describe('non-object JSON roots', () => {
    // The synthetic `.rule-events` doc builder expects an object value for
    // `data`, so anything else must collapse to `{}` rather than leak through.
    it.each([
      ['array root', '[1, 2, 3]'],
      ['number root', '42'],
      ['boolean root', 'true'],
      ['string root', '"hello"'],
      ['null root', 'null'],
    ])('returns an empty object for %s', (_label, raw) => {
      expect(parseDataJson(raw)).toEqual({});
    });
  });

  describe('object JSON roots', () => {
    it('returns an empty object for an empty JSON object', () => {
      expect(parseDataJson('{}')).toEqual({});
    });

    it('returns the parsed object for a flat JSON object', () => {
      expect(parseDataJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
    });

    it('preserves nested structure', () => {
      expect(parseDataJson('{"outer":{"inner":[1,2]},"flag":false,"missing":null}')).toEqual({
        outer: { inner: [1, 2] },
        flag: false,
        missing: null,
      });
    });

    it('returns the object intact (same reference) when handed one directly', () => {
      const input = { outer: { inner: [1, 2] }, flag: false, missing: null };

      expect(parseDataJson(input)).toBe(input);
    });
  });
});
