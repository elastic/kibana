/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyBulkEditOperation } from './apply_bulk_edit_operation';
import { Rule } from '../../types';

describe('applyBulkEditOperation', () => {
  describe('tags operations', () => {
    test('should add tag', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['add-tag'],
          operation: 'add',
        },
        ruleMock
      );

      expect(modifiedAttributes).toHaveProperty('tags', ['tag-1', 'tag-2', 'add-tag']);
      expect(isAttributeModified).toBe(true);
    });

    test('should add multiple tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['add-tag-1', 'add-tag-2'],
          operation: 'add',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', [
        'tag-1',
        'tag-2',
        'add-tag-1',
        'add-tag-2',
      ]);
      expect(isAttributeModified).toBe(true);
    });

    test('should not have duplicated tags when added existed ones', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['tag-1', 'tag-3'],
          operation: 'add',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', ['tag-1', 'tag-2', 'tag-3']);
      expect(isAttributeModified).toBe(true);
    });

    test('should delete tag', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['tag-1'],
          operation: 'delete',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', ['tag-2']);
      expect(isAttributeModified).toBe(true);
    });

    test('should delete multiple tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['tag-1', 'tag-2'],
          operation: 'delete',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', []);
      expect(isAttributeModified).toBe(true);
    });

    test('should rewrite tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['rewrite-tag'],
          operation: 'set',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', ['rewrite-tag']);
      expect(isAttributeModified).toBe(true);
    });

    test('should return isAttributeModified=false when only adding already existing tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['tag-1', 'tag-2'],
          operation: 'add',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', ['tag-1', 'tag-2']);
      expect(isAttributeModified).toBe(false);
    });

    test('should return isAttributeModified=false when adding no tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: [],
          operation: 'add',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', ['tag-1', 'tag-2']);
      expect(isAttributeModified).toBe(false);
    });

    test('should return isAttributeModified=false when deleting no tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: [],
          operation: 'delete',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', ['tag-1', 'tag-2']);
      expect(isAttributeModified).toBe(false);
    });

    test('should return isAttributeModified=false when deleting non-existing tags', () => {
      const ruleMock: Partial<Rule> = {
        tags: ['tag-1', 'tag-2'],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'tags',
          value: ['tag-3'],
          operation: 'delete',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('tags', ['tag-1', 'tag-2']);
      expect(isAttributeModified).toBe(false);
    });
  });

  describe('actions operations', () => {
    test('should add actions', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };

      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'actions',
          value: [
            {
              id: 'mock-add-action-id-1',
              group: 'default',
              params: {},
            },
            {
              id: 'mock-add-action-id-2',
              group: 'default',
              params: {},
            },
          ],
          operation: 'add',
        },
        ruleMock
      );

      expect(modifiedAttributes).toHaveProperty('actions', [
        { id: 'mock-action-id', group: 'default', params: {} },
        { id: 'mock-add-action-id-1', group: 'default', params: {} },
        { id: 'mock-add-action-id-2', group: 'default', params: {} },
      ]);

      expect(isAttributeModified).toBe(true);
    });

    test('should add action with different params and same id', () => {
      const ruleMock = {
        actions: [
          {
            id: 'mock-action-id',
            group: 'default',
            params: { test: 1 },
          },
        ],
      };

      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'actions',
          value: [
            {
              id: 'mock-action-id',
              group: 'default',
              params: { test: 2 },
            },
          ],
          operation: 'add',
        },
        ruleMock
      );

      expect(modifiedAttributes).toHaveProperty('actions', [
        {
          id: 'mock-action-id',
          group: 'default',
          params: { test: 1 },
        },
        {
          id: 'mock-action-id',
          group: 'default',
          params: { test: 2 },
        },
      ]);

      expect(isAttributeModified).toBe(true);
    });

    test('should rewrite actions', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };

      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'actions',
          value: [
            {
              id: 'mock-rewrite-action-id-1',
              group: 'default',
              params: {},
            },
          ],
          operation: 'set',
        },
        ruleMock
      );

      expect(modifiedAttributes).toHaveProperty('actions', [
        {
          id: 'mock-rewrite-action-id-1',
          group: 'default',
          params: {},
        },
      ]);

      expect(isAttributeModified).toBe(true);
    });
  });

  describe('throttle operations', () => {
    test('should rewrite throttle', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'throttle',
          value: '1d',
          operation: 'set',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('throttle', '1d');
      expect(isAttributeModified).toBe(true);
    });
  });

  describe('notifyWhen operations', () => {
    test('should rewrite notifyWhen', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'notifyWhen',
          value: 'onThrottleInterval',
          operation: 'set',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('notifyWhen', 'onThrottleInterval');
      expect(isAttributeModified).toBe(true);
    });
  });

  describe('schedule operations', () => {
    test('should rewrite schedule', () => {
      const ruleMock = {
        actions: [{ id: 'mock-action-id', group: 'default', params: {} }],
      };
      const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
        {
          field: 'schedule',
          value: { interval: '1d' },
          operation: 'set',
        },
        ruleMock
      );
      expect(modifiedAttributes).toHaveProperty('schedule', { interval: '1d' });
      expect(isAttributeModified).toBe(true);
    });
  });
});
