/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAllowed,
  isAnonymized,
  isDenied,
  getIsDataAnonymizable,
  replaceAnonymizedValuesWithOriginalValues,
} from '.';

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

  describe('replaceAnonymizedValuesWithOriginalValues', () => {
    const replacements = {
      '3541b730-1dce-4937-b63f-0d618ea1cc5f': 'not-an-administrator',
      'b222e892-431e-4e4f-9295-2ba92ef9d12d': 'domain-controller',
    };

    it('replaces anonymized values with original values', () => {
      const messageContent =
        'User {{ user.name 3541b730-1dce-4937-b63f-0d618ea1cc5f }} added a member to the Administrators group on host {{ host.name b222e892-431e-4e4f-9295-2ba92ef9d12d }}';

      const result = replaceAnonymizedValuesWithOriginalValues({ messageContent, replacements });

      expect(result).toEqual(
        'User {{ user.name not-an-administrator }} added a member to the Administrators group on host {{ host.name domain-controller }}'
      );
    });

    it('returns the original messageContent if no replacements are found', () => {
      const messageContent = 'There are no replacements applicable to this message';

      const result = replaceAnonymizedValuesWithOriginalValues({ messageContent, replacements });

      expect(result).toEqual(messageContent);
    });

    it('returns the original messageContent if replacements is null', () => {
      const messageContent =
        'User {{ user.name 3541b730-1dce-4937-b63f-0d618ea1cc5f }} added a member to the Administrators group on host {{ host.name b222e892-431e-4e4f-9295-2ba92ef9d12d }}';

      const result = replaceAnonymizedValuesWithOriginalValues({
        messageContent,
        replacements: null, // <-- null
      });

      expect(result).toEqual(messageContent);
    });

    it('returns the original messageContent if replacements is undefined', () => {
      const messageContent =
        'User {{ user.name 3541b730-1dce-4937-b63f-0d618ea1cc5f }} added a member to the Administrators group on host {{ host.name b222e892-431e-4e4f-9295-2ba92ef9d12d }}';

      const result = replaceAnonymizedValuesWithOriginalValues({
        messageContent,
        replacements: undefined, // <-- undefined
      });

      expect(result).toEqual(messageContent);
    });

    it('replaces multiple occurrences of the same replacement key', () => {
      const messageContent =
        'User {{ user.name 3541b730-1dce-4937-b63f-0d618ea1cc5f }} added a member to the Administrators group on host {{ host.name b222e892-431e-4e4f-9295-2ba92ef9d12d }}, which is unusual because {{ user.name 3541b730-1dce-4937-b63f-0d618ea1cc5f }} is not a member of the Administrators group.';

      const result = replaceAnonymizedValuesWithOriginalValues({ messageContent, replacements });

      expect(result).toEqual(
        'User {{ user.name not-an-administrator }} added a member to the Administrators group on host {{ host.name domain-controller }}, which is unusual because {{ user.name not-an-administrator }} is not a member of the Administrators group.'
      );
    });
  });
});
