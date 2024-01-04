/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied, getIsDataAnonymizable } from '.';

describe('helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getIsDataAnonymizable', () => {
    it('returns false for string data', () => {
      const rawData = 'this will not be anonymized';

      const result = getIsDataAnonymizable(rawData);

      expect(result).toBe(false);
    });

    it('returns true for key / values data', () => {
      const rawData = { key: ['value1', 'value2'] };

      const result = getIsDataAnonymizable(rawData);

      expect(result).toBe(true);
    });
  });

  describe('isAllowed', () => {
    it('returns true when the field is present in the allowSet', () => {
      const allowSet = new Set(['fieldName1', 'fieldName2', 'fieldName3']);

      expect(isAllowed({ allowSet, field: 'fieldName1' })).toBe(true);
    });

    it('returns false when the field is NOT present in the allowSet', () => {
      const allowSet = new Set(['fieldName1', 'fieldName2', 'fieldName3']);

      expect(isAllowed({ allowSet, field: 'nonexistentField' })).toBe(false);
    });
  });

  describe('isDenied', () => {
    it('returns true when the field is NOT in the allowSet', () => {
      const allowSet = new Set(['field1', 'field2']);
      const field = 'field3';

      expect(isDenied({ allowSet, field })).toBe(true);
    });

    it('returns false when the field is in the allowSet', () => {
      const allowSet = new Set(['field1', 'field2']);
      const field = 'field1';

      expect(isDenied({ allowSet, field })).toBe(false);
    });

    it('returns true for an empty allowSet', () => {
      const allowSet = new Set<string>();
      const field = 'field1';

      expect(isDenied({ allowSet, field })).toBe(true);
    });

    it('returns false when the field is an empty string and allowSet contains the empty string', () => {
      const allowSet = new Set(['', 'field1']);
      const field = '';

      expect(isDenied({ allowSet, field })).toBe(false);
    });
  });

  describe('isAnonymized', () => {
    const allowReplacementSet = new Set(['user.name', 'host.name']);

    it('returns true when the field is in the allowReplacementSet', () => {
      const field = 'user.name';

      expect(isAnonymized({ allowReplacementSet, field })).toBe(true);
    });

    it('returns false when the field is NOT in the allowReplacementSet', () => {
      const field = 'foozle';

      expect(isAnonymized({ allowReplacementSet, field })).toBe(false);
    });

    it('returns false when allowReplacementSet is empty', () => {
      const emptySet = new Set<string>();
      const field = 'user.name';

      expect(isAnonymized({ allowReplacementSet: emptySet, field })).toBe(false);
    });
  });
});
