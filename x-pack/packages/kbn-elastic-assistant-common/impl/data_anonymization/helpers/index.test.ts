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
      const anonymizationFields = {
        total: 2,
        page: 1,
        perPage: 100,
        data: [
          { id: 'fieldName1', field: 'fieldName1', allowed: true, anonymized: false },
          { id: 'fieldName2', field: 'fieldName2', allowed: false, anonymized: false },
          { id: 'fieldName3', field: 'fieldName3', allowed: false, anonymized: false },
        ],
      };

      expect(
        isAllowed({ anonymizationFields: anonymizationFields.data, field: 'fieldName1' })
      ).toBe(true);
    });

    it('returns false when the field is NOT present in the allowSet', () => {
      const anonymizationFields = {
        total: 2,
        page: 1,
        perPage: 100,
        data: [
          { id: 'fieldName1', field: 'fieldName1', allowed: true, anonymized: false },
          { id: 'fieldName2', field: 'fieldName2', allowed: false, anonymized: false },
          { id: 'fieldName3', field: 'fieldName3', allowed: false, anonymized: false },
        ],
      };

      expect(
        isAllowed({ anonymizationFields: anonymizationFields.data, field: 'nonexistentField' })
      ).toBe(false);
    });
  });

  describe('isDenied', () => {
    it('returns true when the field is NOT in the allowSet', () => {
      const anonymizationFields = {
        total: 2,
        page: 1,
        perPage: 100,
        data: [
          { id: 'field1', field: 'field1', allowed: true, anonymized: false },
          { id: 'field2', field: 'field2', allowed: false, anonymized: false },
        ],
      };
      const field = 'field3';

      expect(isDenied({ anonymizationFields: anonymizationFields.data, field })).toBe(true);
    });

    it('returns false when the field is in the allowSet', () => {
      const anonymizationFields = {
        total: 2,
        page: 1,
        perPage: 100,
        data: [
          { id: 'field1', field: 'field1', allowed: true, anonymized: false },
          { id: 'field2', field: 'field2', allowed: false, anonymized: false },
        ],
      };
      const field = 'field1';

      expect(isDenied({ anonymizationFields: anonymizationFields.data, field })).toBe(false);
    });

    it('returns true for an empty allowSet', () => {
      const anonymizationFields = {
        total: 0,
        page: 1,
        perPage: 100,
        data: [],
      };
      const field = 'field1';

      expect(isDenied({ anonymizationFields: anonymizationFields.data, field })).toBe(true);
    });

    it('returns false when the field is an empty string and allowSet contains the empty string', () => {
      const anonymizationFields = {
        total: 2,
        page: 1,
        perPage: 100,
        data: [
          { id: 'field1', field: 'field1', allowed: true, anonymized: false },
          { id: '', field: '', allowed: false, anonymized: false },
        ],
      };
      const field = '';

      expect(isDenied({ anonymizationFields: anonymizationFields.data, field })).toBe(false);
    });
  });

  describe('isAnonymized', () => {
    const anonymizationFields = {
      total: 2,
      page: 1,
      perPage: 100,
      data: [
        { id: 'user.name', field: 'user.name', allowed: false, anonymized: true },
        { id: 'host.name', field: 'host.name', allowed: false, anonymized: true },
      ],
    };

    it('returns true when the field is in the allowReplacementSet', () => {
      const field = 'user.name';

      expect(isAnonymized({ anonymizationFields: anonymizationFields.data, field })).toBe(true);
    });

    it('returns false when the field is NOT in the allowReplacementSet', () => {
      const field = 'foozle';

      expect(isAnonymized({ anonymizationFields: anonymizationFields.data, field })).toBe(false);
    });

    it('returns false when allowReplacementSet is empty', () => {
      const anonymizationFieldsEmpty = {
        total: 0,
        page: 1,
        perPage: 100,
        data: [],
      };
      const field = 'user.name';

      expect(isAnonymized({ anonymizationFields: anonymizationFieldsEmpty.data, field })).toBe(
        false
      );
    });
  });
});
