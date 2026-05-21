/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseErrors } from '../test_helpers/zod_schema_test_utils';

import {
  limitedArraySchema,
  limitedNumberAsIntegerSchema,
  limitedNumberSchema,
  limitedStringSchema,
  mimeTypeString,
  NonEmptyString,
  paginationSchema,
} from '.';
import { MAX_DOCS_PER_PAGE } from '../constants';

describe('schema', () => {
  describe('NonEmptyString', () => {
    it('rejects an empty string', () => {
      expect(parseErrors(NonEmptyString, '')).toEqual(['string must have length >= 1']);
    });

    it('rejects whitespace-only strings (io-ts parity)', () => {
      expect(parseErrors(NonEmptyString, '   ')).toEqual(['string must have length >= 1']);
      expect(parseErrors(NonEmptyString, '\t\n')).toEqual(['string must have length >= 1']);
    });

    it('accepts a non-empty string', () => {
      expect(parseErrors(NonEmptyString, 'a')).toEqual([]);
    });

    it('preserves the original (untrimmed) value on success', () => {
      const result = NonEmptyString.safeParse(' a ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(' a ');
    });
  });

  describe('limitedArraySchema', () => {
    const fieldName = 'foobar';

    it('fails when given an empty string', () => {
      expect(
        parseErrors(limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }), [''])
      ).toEqual(['string must have length >= 1']);
    });

    it('fails when given an empty array', () => {
      expect(
        parseErrors(limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }), [])
      ).toEqual(['The length of the field foobar is too short. Array must be of length >= 1.']);
    });

    it('fails when given an array larger than the limit of one item', () => {
      expect(
        parseErrors(limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }), [
          'a',
          'b',
        ])
      ).toEqual(['The length of the field foobar is too long. Array must be of length <= 1.']);
    });

    it('succeeds when given an array of 1 item with a non-empty string', () => {
      expect(
        parseErrors(limitedArraySchema({ codec: NonEmptyString, fieldName, min: 1, max: 1 }), ['a'])
      ).toEqual([]);
    });

    it('succeeds when given an array of 0 items when the min is 0', () => {
      expect(
        parseErrors(limitedArraySchema({ codec: NonEmptyString, fieldName, min: 0, max: 2 }), [])
      ).toEqual([]);
    });
  });

  describe('limitedStringSchema', () => {
    const fieldName = 'foo';

    it('fails when given string is shorter than minimum', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 2, max: 5 }), 'a')).toEqual([
        'The length of the foo is too short. The minimum length is 2.',
      ]);
    });

    it('fails when given string is empty and minimum is not 0', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 1, max: 1 }), '')).toEqual([
        'The foo field cannot be an empty string.',
      ]);
    });

    it('fails when given string consists only of whitespace and minimum is not 0', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 1, max: 1 }), '  ')).toEqual([
        'The foo field cannot be an empty string.',
      ]);
    });

    it('fails when given string is larger than maximum', () => {
      expect(
        parseErrors(limitedStringSchema({ fieldName, min: 1, max: 5 }), 'Hello there!!')
      ).toEqual(['The length of the foo is too long. The maximum length is 5.']);
    });

    it('succeeds when given string within limit', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 1, max: 50 }), 'Hello!!')).toEqual(
        []
      );
    });

    it('succeeds when given string is empty and minimum is 0', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 0, max: 5 }), '')).toEqual([]);
    });

    it('succeeds when given string consists only of whitespace and minimum is 0', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 0, max: 5 }), '  ')).toEqual([]);
    });

    it('succeeds when given string is same length as maximum', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 0, max: 5 }), 'Hello')).toEqual([]);
    });

    it('succeeds when trimmed length is within maximum (trailing whitespace ignored)', () => {
      expect(parseErrors(limitedStringSchema({ fieldName, min: 0, max: 5 }), 'Hello  ')).toEqual(
        []
      );
    });
  });

  describe('paginationSchema', () => {
    it('succeeds when no page or perPage passed', () => {
      expect(parseErrors(paginationSchema({ maxPerPage: 1 }), {})).toEqual([]);
    });

    it('succeeds when only valid page is passed', () => {
      expect(parseErrors(paginationSchema({ maxPerPage: 2 }), { page: 0 })).toEqual([]);
    });

    it('succeeds when only valid perPage is passed', () => {
      expect(parseErrors(paginationSchema({ maxPerPage: 3 }), { perPage: 1 })).toEqual([]);
    });

    it('succeeds when page and perPage are passed and valid', () => {
      expect(parseErrors(paginationSchema({ maxPerPage: 3 }), { page: 1, perPage: 2 })).toEqual([]);
    });

    it('fails when perPage > maxPerPage', () => {
      expect(parseErrors(paginationSchema({ maxPerPage: 3 }), { perPage: 4 })).toEqual([
        'The provided perPage value is too high. The maximum allowed perPage value is 3.',
      ]);
    });

    it(`fails when page > ${MAX_DOCS_PER_PAGE}`, () => {
      expect(
        parseErrors(paginationSchema({ maxPerPage: 3 }), { page: MAX_DOCS_PER_PAGE + 1 })
      ).toEqual([
        'The number of documents is too high. Paginating through more than 10000 documents is not possible.',
      ]);
    });

    it(`fails when page * perPage > ${MAX_DOCS_PER_PAGE}`, () => {
      expect(
        parseErrors(paginationSchema({ maxPerPage: 3 }), { page: MAX_DOCS_PER_PAGE, perPage: 2 })
      ).toEqual([
        'The number of documents is too high. Paginating through more than 10000 documents is not possible.',
      ]);
    });

    it('accepts numeric strings for page/perPage', () => {
      expect(parseErrors(paginationSchema({ maxPerPage: 3 }), { page: '1', perPage: '2' })).toEqual(
        []
      );
    });

    it('rejects non-numeric strings for page/perPage (NumberFromString parity)', () => {
      const result = paginationSchema({ maxPerPage: 3 }).safeParse({ page: 'a', perPage: 'b' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toEqual(
          expect.arrayContaining(['cannot parse to a number', 'cannot parse to a number'])
        );
      }
    });
  });

  describe('limitedNumberSchema', () => {
    it('succeeds when the number is within range', () => {
      expect(parseErrors(limitedNumberSchema({ fieldName: 'foo', min: 0, max: 2 }), 1)).toEqual([]);
    });

    it('fails when given a number lower than the minimum', () => {
      expect(parseErrors(limitedNumberSchema({ fieldName: 'foo', min: 1, max: 2 }), 0)).toEqual([
        'The foo field cannot be less than 1.',
      ]);
    });

    it('fails when given a number higher than the maximum', () => {
      expect(parseErrors(limitedNumberSchema({ fieldName: 'foo', min: 1, max: 2 }), 3)).toEqual([
        'The foo field cannot be more than 2.',
      ]);
    });
  });

  describe('mimeTypeString', () => {
    it('succeeds when the value is an allowed mime type', () => {
      expect(parseErrors(mimeTypeString, 'image/jpx')).toEqual([]);
    });

    it('fails when the value is not an allowed mime type', () => {
      expect(parseErrors(mimeTypeString, 'foo/bar')).toEqual([
        'The mime type field value foo/bar is not allowed.',
      ]);
    });
  });

  describe('limitedNumberAsIntegerSchema', () => {
    it('succeeds when the number is a safe integer', () => {
      expect(parseErrors(limitedNumberAsIntegerSchema({ fieldName: 'foo' }), 1)).toEqual([]);
    });

    it('fails when given a number lower than MIN_SAFE_INTEGER', () => {
      expect(
        parseErrors(limitedNumberAsIntegerSchema({ fieldName: 'foo' }), Number.MIN_SAFE_INTEGER - 1)
      ).toEqual([
        'The foo field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.',
      ]);
    });

    it('fails when given a number higher than MAX_SAFE_INTEGER', () => {
      expect(
        parseErrors(limitedNumberAsIntegerSchema({ fieldName: 'foo' }), Number.MAX_SAFE_INTEGER + 1)
      ).toEqual([
        'The foo field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.',
      ]);
    });

    it('fails when given null', () => {
      const result = limitedNumberAsIntegerSchema({ fieldName: 'foo' }).safeParse(null);
      expect(result.success).toBe(false);
    });

    it('fails when given a string', () => {
      const result = limitedNumberAsIntegerSchema({ fieldName: 'foo' }).safeParse('some string');
      expect(result.success).toBe(false);
    });

    it('fails when given a float', () => {
      expect(parseErrors(limitedNumberAsIntegerSchema({ fieldName: 'foo' }), 1.2)).toEqual([
        'The foo field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.',
      ]);
    });
  });
});
