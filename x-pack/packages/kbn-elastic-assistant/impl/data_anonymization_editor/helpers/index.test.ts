/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowed, isAnonymized, isDenied } from '@kbn/elastic-assistant-common';
import { getIsDataAnonymizable } from '.';
import { SelectedPromptContext } from '../../assistant/prompt_context/types';

import { BatchUpdateListItem } from '../context_editor/types';

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

  describe('updateList', () => {
    it('adds a new field to the list when the operation is `add`', () => {
      const result = updateList({
        field: 'newField',
        list: ['field1', 'field2'],
        operation: 'add',
      });

      expect(result).toEqual(['field1', 'field2', 'newField']);
    });

    it('does NOT add a duplicate field to the list when the operation is `add`', () => {
      const result = updateList({
        field: 'field1',
        list: ['field1', 'field2'],
        operation: 'add',
      });

      expect(result).toEqual(['field1', 'field2']);
    });

    it('removes an existing field from the list when the operation is `remove`', () => {
      const result = updateList({
        field: 'field1',
        list: ['field1', 'field2'],
        operation: 'remove',
      });

      expect(result).toEqual(['field2']);
    });

    it('should NOT modify the list when removing a non-existent field', () => {
      const result = updateList({
        field: 'host.name',
        list: ['field1', 'field2'],
        operation: 'remove',
      });

      expect(result).toEqual(['field1', 'field2']);
    });
  });

  describe('updateSelectedPromptContext', () => {
    const selectedPromptContext: SelectedPromptContext = {
      allow: ['user.name', 'event.category'],
      allowReplacement: ['user.name'],
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

      expect(result.allow).toEqual(['user.name', 'event.category', 'event.action']);
    });

    it('updates the allow list when update is `allow` and the operation is `remove`', () => {
      const result = updateSelectedPromptContext({
        field: 'user.name',
        operation: 'remove',
        selectedPromptContext,
        update: 'allow',
      });

      expect(result.allow).toEqual(['event.category']);
    });

    it('updates the allowReplacement list when update is `allowReplacement` and the operation is `add`', () => {
      const result = updateSelectedPromptContext({
        field: 'event.type',
        operation: 'add',
        selectedPromptContext,
        update: 'allowReplacement',
      });
      expect(result.allowReplacement).toEqual(['user.name', 'event.type']);
    });

    it('updates the allowReplacement list when update is `allowReplacement` and the operation is `remove`', () => {
      const result = updateSelectedPromptContext({
        field: 'user.name',
        operation: 'remove',
        selectedPromptContext,
        update: 'allowReplacement',
      });
      expect(result.allowReplacement).toEqual([]);
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

  describe('updateDefaultList', () => {
    it('updates the `defaultAllow` list to add a field when the operation is add', () => {
      const currentList = ['test1', 'test2'];
      const setDefaultList = jest.fn();
      const update = 'defaultAllow';
      const updates: BatchUpdateListItem[] = [{ field: 'test3', operation: 'add', update }];

      updateDefaultList({ currentList, setDefaultList, update, updates });

      expect(setDefaultList).toBeCalledWith([...currentList, 'test3']);
    });

    it('updates the `defaultAllow` list to remove a field when the operation is remove', () => {
      const currentList = ['test1', 'test2'];
      const setDefaultList = jest.fn();
      const update = 'defaultAllow';
      const updates: BatchUpdateListItem[] = [{ field: 'test1', operation: 'remove', update }];

      updateDefaultList({ currentList, setDefaultList, update, updates });

      expect(setDefaultList).toBeCalledWith(['test2']);
    });

    it('does NOT invoke `setDefaultList` when `update` does NOT match any of the batched `updates` types', () => {
      const currentList = ['test1', 'test2'];
      const setDefaultList = jest.fn();
      const update = 'allow';
      const updates: BatchUpdateListItem[] = [
        { field: 'test1', operation: 'remove', update: 'defaultAllow' }, // update does not match
      ];

      updateDefaultList({ currentList, setDefaultList, update, updates });

      expect(setDefaultList).not.toBeCalled();
    });

    it('does NOT invoke `setDefaultList` when `updates` is empty', () => {
      const currentList = ['test1', 'test2'];
      const setDefaultList = jest.fn();
      const update = 'defaultAllow';
      const updates: BatchUpdateListItem[] = []; // no updates

      updateDefaultList({ currentList, setDefaultList, update, updates });

      expect(setDefaultList).not.toBeCalled();
    });
  });

  describe('updateDefaults', () => {
    const setDefaultAllow = jest.fn();
    const setDefaultAllowReplacement = jest.fn();

    const defaultAllow = ['field1', 'field2'];
    const defaultAllowReplacement = ['field2'];
    const batchUpdateListItems: BatchUpdateListItem[] = [
      {
        field: 'field1',
        operation: 'remove',
        update: 'defaultAllow',
      },
      {
        field: 'host.name',
        operation: 'add',
        update: 'defaultAllowReplacement',
      },
    ];

    it('updates defaultAllow with filtered updates', () => {
      updateDefaults({
        defaultAllow,
        defaultAllowReplacement,
        setDefaultAllow,
        setDefaultAllowReplacement,
        updates: batchUpdateListItems,
      });

      expect(setDefaultAllow).toHaveBeenCalledWith(['field2']);
    });

    it('updates defaultAllowReplacement with filtered updates', () => {
      updateDefaults({
        defaultAllow,
        defaultAllowReplacement,
        setDefaultAllow,
        setDefaultAllowReplacement,
        updates: batchUpdateListItems,
      });

      expect(setDefaultAllowReplacement).toHaveBeenCalledWith(['field2', 'host.name']);
    });
  });
});
