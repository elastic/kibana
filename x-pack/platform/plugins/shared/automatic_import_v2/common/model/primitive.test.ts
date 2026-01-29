/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';

import { NonEmptyString, UUID } from './primitive.gen';

describe('primitive schemas', () => {
  describe('NonEmptyString', () => {
    it('accepts valid non-empty string', () => {
      const validStrings = [
        'valid',
        'a',
        '123',
        'string with spaces',
        'special!@#$%^&*()chars',
        'unicode-characters-™-©-®',
      ];

      validStrings.forEach((str) => {
        const result = NonEmptyString.safeParse(str);
        expectParseSuccess(result);
        expect(result.data).toBe(str);
      });
    });

    it('rejects empty string', () => {
      const result = NonEmptyString.safeParse('');
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('String must contain at least 1 character');
    });

    it('rejects whitespace-only string', () => {
      const whitespaceStrings = ['   ', '\t', '\n', '\r', '  \t\n  '];

      whitespaceStrings.forEach((str) => {
        const result = NonEmptyString.safeParse(str);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toContain('No empty strings allowed');
      });
    });

    it('accepts string with leading/trailing whitespace if it has content', () => {
      const validStrings = ['  valid  ', '\tvalid\t', '\nvalid\n'];

      validStrings.forEach((str) => {
        const result = NonEmptyString.safeParse(str);
        expectParseSuccess(result);
        expect(result.data).toBe(str);
      });
    });

    it('rejects non-string values', () => {
      const invalidValues = [123, true, null, undefined, {}, []];

      invalidValues.forEach((value) => {
        const result = NonEmptyString.safeParse(value);
        expectParseError(result);
      });
    });

    it('accepts very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = NonEmptyString.safeParse(longString);
      expectParseSuccess(result);
      expect(result.data).toHaveLength(10000);
    });

    it('accepts strings with newlines and special characters', () => {
      const complexString = 'Line 1\nLine 2\rLine 3\tTabbed\nWith "quotes" and \'apostrophes\'';
      const result = NonEmptyString.safeParse(complexString);
      expectParseSuccess(result);
      expect(result.data).toBe(complexString);
    });
  });

  describe('UUID', () => {
    it('accepts valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      ];

      validUUIDs.forEach((uuid) => {
        const result = UUID.safeParse(uuid);
        expectParseSuccess(result);
        expect(result.data).toBe(uuid);
      });
    });

    it('rejects invalid UUID format', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        'ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ', // invalid hex
      ];

      invalidUUIDs.forEach((uuid) => {
        const result = UUID.safeParse(uuid);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toContain('Invalid uuid');
      });
    });

    it('accepts uppercase UUIDs', () => {
      const upperCaseUUID = '123E4567-E89B-12D3-A456-426614174000';
      const result = UUID.safeParse(upperCaseUUID);
      expectParseSuccess(result);
    });

    it('accepts mixed case UUIDs', () => {
      const mixedCaseUUID = '123e4567-E89B-12d3-A456-426614174000';
      const result = UUID.safeParse(mixedCaseUUID);
      expectParseSuccess(result);
    });

    it('rejects UUID with missing hyphens', () => {
      const noHyphens = '123e4567e89b12d3a456426614174000';
      const result = UUID.safeParse(noHyphens);
      expectParseError(result);
    });

    it('rejects UUID with incorrect hyphen positions', () => {
      const wrongHyphens = '123e4567-e89b1-2d3a-456-426614174000';
      const result = UUID.safeParse(wrongHyphens);
      expectParseError(result);
    });

    it('rejects non-string values', () => {
      const invalidValues = [123, true, null, undefined, {}, []];

      invalidValues.forEach((value) => {
        const result = UUID.safeParse(value);
        expectParseError(result);
      });
    });

    it('rejects empty string', () => {
      const result = UUID.safeParse('');
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('Invalid uuid');
    });

    it('rejects whitespace', () => {
      const result = UUID.safeParse('   ');
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('Invalid uuid');
    });
  });
});
