/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied, getIsDataAnonymizable } from '.';

const anonymizationFields = [
  { id: 'fieldName1', field: 'fieldName1', allowed: true, anonymized: false },
  { id: 'fieldName2', field: 'fieldName2', allowed: false, anonymized: false },
  { id: 'fieldName3', field: 'fieldName3', allowed: false, anonymized: false },
];

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
      expect(isAllowed({ anonymizationFields, field: 'fieldName1' })).toBe(true);
    });

    it('returns false when the field is NOT present in the allowSet', () => {
      expect(isAllowed({ anonymizationFields, field: 'nonexistentField' })).toBe(false);
    });
  });

  describe('isDenied', () => {
    it('returns true when the field is NOT in the allowSet', () => {
      expect(isDenied({ anonymizationFields, field: 'field3' })).toBe(true);
    });

    it('returns false when the field is in the allowSet', () => {
      expect(isDenied({ anonymizationFields, field: 'fieldName1' })).toBe(false);
    });

    it('returns true for an empty allowSet', () => {
      expect(isDenied({ anonymizationFields: [], field: 'field1' })).toBe(true);
    });

    it('returns false when the field is an empty string and allowSet contains the empty string', () => {
      expect(
        isDenied({
          anonymizationFields: [
            ...anonymizationFields,
            { id: '', field: '', allowed: true, anonymized: false },
          ],
          field: '',
        })
      ).toBe(false);
    });
  });

  describe('isAnonymized', () => {
    it('returns true when the field is in the allowReplacementSet', () => {
      expect(
        isAnonymized({
          anonymizationFields: [
            ...anonymizationFields,
            { id: 'user.name', field: 'user.name', allowed: false, anonymized: true },
          ],
          field: 'user.name',
        })
      ).toBe(true);
    });

    it('returns false when the field is NOT in the allowReplacementSet', () => {
      expect(isAnonymized({ anonymizationFields, field: 'foozle' })).toBe(false);
    });

    it('returns false when allowReplacementSet is empty', () => {
      expect(isAnonymized({ anonymizationFields: [], field: 'user.name' })).toBe(false);
    });
  });
});
