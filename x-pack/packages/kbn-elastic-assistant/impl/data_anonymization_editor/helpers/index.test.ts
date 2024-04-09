/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied } from '@kbn/elastic-assistant-common';
import { getIsDataAnonymizable, updateSelectedPromptContext } from '.';
import { SelectedPromptContext } from '../../assistant/prompt_context/types';

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
        total: 3,
        page: 1,
        perPage: 100,
        data: [
          {
            id: 'fieldName1',
            field: 'fieldName1',
            anonymized: false,
            allowed: true,
          },
          {
            id: 'fieldName2',
            field: 'fieldName2',
            anonymized: false,
            allowed: true,
          },
          {
            id: 'fieldName3',
            field: 'fieldName3',
            anonymized: false,
            allowed: true,
          },
        ],
      };

      expect(
        isAllowed({ anonymizationFields: anonymizationFields.data, field: 'fieldName1' })
      ).toBe(true);
    });

    it('returns false when the field is NOT present in the allowSet', () => {
      const anonymizationFields = {
        total: 3,
        page: 1,
        perPage: 100,
        data: [
          {
            id: 'fieldName1',
            field: 'fieldName1',
            anonymized: false,
            allowed: true,
          },
          {
            id: 'fieldName2',
            field: 'fieldName2',
            anonymized: false,
            allowed: true,
          },
          {
            id: 'fieldName3',
            field: 'fieldName3',
            anonymized: false,
            allowed: true,
          },
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
          {
            id: 'field1',
            field: 'field1',
            anonymized: false,
            allowed: true,
          },
          {
            id: 'field2',
            field: 'field2',
            anonymized: false,
            allowed: true,
          },
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
          {
            id: 'field1',
            field: 'field1',
            anonymized: false,
            allowed: true,
          },
          {
            id: 'field2',
            field: 'field2',
            anonymized: false,
            allowed: true,
          },
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
          {
            id: 'field1',
            field: 'field1',
            anonymized: false,
            allowed: true,
          },
          {
            id: '',
            field: '',
            anonymized: false,
            allowed: true,
          },
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
        {
          id: 'user.name',
          field: 'user.name',
          anonymized: true,
          allowed: true,
        },
        {
          id: 'host.name',
          field: 'host.name',
          anonymized: true,
          allowed: true,
        },
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
      const field = 'user.name';

      expect(isAnonymized({ anonymizationFields: [], field })).toBe(false);
    });
  });

  describe('updateSelectedPromptContext', () => {
    const selectedPromptContext: SelectedPromptContext = {
      contextAnonymizationFields: {
        total: 2,
        page: 1,
        perPage: 100,
        data: [
          {
            id: 'user.name',
            field: 'user.name',
            anonymized: true,
            allowed: true,
          },
          {
            id: 'event.category',
            field: 'event.category',
            anonymized: true,
            allowed: false,
          },
          {
            id: 'event.action',
            field: 'event.action',
            anonymized: false,
            allowed: true,
          },
        ],
      },
      promptContextId: 'testId',
      rawData: {},
    };

    it('updates the allow list when update is `allow` and the operation is `add`', () => {
      const result = updateSelectedPromptContext({
        field: 'event.action',
        operation: 'add',
        selectedPromptContext,
        update: 'allow',
      });

      expect(result.contextAnonymizationFields?.data).toEqual([
        {
          id: 'event.category',
          field: 'event.category',
          anonymized: true,
          allowed: false,
        },
        {
          id: 'event.action',
          field: 'event.action',
          anonymized: false,
          allowed: true,
        },
        {
          id: 'user.name',
          field: 'user.name',
          anonymized: true,
          allowed: true,
        },
      ]);
    });

    it('updates the allow list when update is `allow` and the operation is `remove`', () => {
      const result = updateSelectedPromptContext({
        field: 'user.name',
        operation: 'remove',
        selectedPromptContext,
        update: 'allow',
      });

      expect(result.contextAnonymizationFields).toEqual({
        data: [
          { allowed: false, anonymized: true, field: 'event.category', id: 'event.category' },
          { allowed: false, anonymized: true, field: 'user.name', id: 'user.name' },
          { allowed: true, anonymized: false, field: 'event.action', id: 'event.action' },
        ],
        page: 1,
        perPage: 100,
        total: 2,
      });
    });

    it('updates the allowReplacement list when update is `allowReplacement` and the operation is `add`', () => {
      const result = updateSelectedPromptContext({
        field: 'event.category',
        operation: 'add',
        selectedPromptContext,
        update: 'allowReplacement',
      });
      expect(result.contextAnonymizationFields).toEqual({
        data: [
          { allowed: true, anonymized: true, field: 'user.name', id: 'user.name' },
          { allowed: false, anonymized: true, field: 'event.category', id: 'event.category' },
          { allowed: true, anonymized: false, field: 'event.action', id: 'event.action' },
        ],
        page: 1,
        perPage: 100,
        total: 2,
      });
    });

    it('updates the allowReplacement list when update is `allowReplacement` and the operation is `remove`', () => {
      const result = updateSelectedPromptContext({
        field: 'user.name',
        operation: 'remove',
        selectedPromptContext,
        update: 'allowReplacement',
      });
      expect(result.contextAnonymizationFields).toEqual({
        data: [
          { allowed: false, anonymized: true, field: 'event.category', id: 'event.category' },
          { allowed: true, anonymized: false, field: 'event.action', id: 'event.action' },
          { allowed: true, anonymized: false, field: 'user.name', id: 'user.name' },
        ],
        page: 1,
        perPage: 100,
        total: 2,
      });
    });

    it('does not update selectedPromptContext when update is not "allow" or "allowReplacement"', () => {
      const result = updateSelectedPromptContext({
        field: 'user.name',
        operation: 'add',
        selectedPromptContext,
        update: 'deny',
      });

      expect(result).toEqual(selectedPromptContext);
    });
  });
});
