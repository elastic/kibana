/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import {
  executeActionPolicyOperations,
  ActionPolicyOperationValidationError,
  type ActionPolicyOperation,
} from './operations';

describe('executeActionPolicyOperations', () => {
  describe('validate operation', () => {
    const validPolicy: Partial<ActionPolicyAttachmentData> = {
      name: 'Test Policy',
      description: 'A test policy',
      destinations: [{ type: 'workflow', id: '00000000-0000-0000-0000-000000000001' }],
    };

    it('passes validation for a complete action policy', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'validate' }];

      const result = executeActionPolicyOperations(validPolicy, ops);

      expect(result.name).toBe('Test Policy');
    });

    it('passes validation when validate follows mutation operations', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_metadata', name: 'My Policy', description: 'desc' },
        {
          operation: 'set_destinations',
          destinations: [{ type: 'workflow', id: '00000000-0000-0000-0000-000000000001' }],
        },
        { operation: 'validate' },
      ];

      const result = executeActionPolicyOperations({}, ops, { isNew: true });

      expect(result.name).toBe('My Policy');
    });

    it('throws ActionPolicyOperationValidationError when name is empty', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'validate' }];

      expect(() =>
        executeActionPolicyOperations(
          { ...validPolicy, name: '' },
          ops
        )
      ).toThrow(ActionPolicyOperationValidationError);
    });

    it('throws when destinations are missing', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'validate' }];

      expect(() =>
        executeActionPolicyOperations(
          { name: 'Test', description: 'desc', destinations: [] },
          ops
        )
      ).toThrow('Action policy is not ready to save');
    });

    it('includes Zod issue paths in the error message', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'validate' }];

      expect(() =>
        executeActionPolicyOperations(
          { name: '', description: '', destinations: [] },
          ops
        )
      ).toThrow(/destinations:/);
    });

    it('does not update attachment data when validate throws', () => {
      const original: Partial<ActionPolicyAttachmentData> = {
        name: '',
        description: '',
        destinations: [],
      };
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_metadata', name: '' },
        { operation: 'validate' },
      ];

      expect(() => executeActionPolicyOperations(original, ops)).toThrow(
        ActionPolicyOperationValidationError
      );
    });
  });

  describe('basic operations', () => {
    it('applies set_metadata', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_metadata', name: 'My Policy', description: 'A description' },
      ];

      const result = executeActionPolicyOperations({}, ops);

      expect(result.name).toBe('My Policy');
      expect(result.description).toBe('A description');
    });

    it('applies set_destinations', () => {
      const ops: ActionPolicyOperation[] = [
        {
          operation: 'set_destinations',
          destinations: [{ type: 'workflow', id: '00000000-0000-0000-0000-000000000001' }],
        },
      ];

      const result = executeActionPolicyOperations({}, ops);

      expect(result.destinations).toEqual([
        { type: 'workflow', id: '00000000-0000-0000-0000-000000000001' },
      ]);
    });

    it('applies set_matcher', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_matcher', matcher: 'rule.name: "test"' },
      ];

      const result = executeActionPolicyOperations({}, ops);

      expect(result.matcher).toBe('rule.name: "test"');
    });

    it('applies set_grouping', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_grouping', groupingMode: 'per_field', groupBy: ['host.name'] },
      ];

      const result = executeActionPolicyOperations({}, ops);

      expect(result.groupingMode).toBe('per_field');
      expect(result.groupBy).toEqual(['host.name']);
    });

    it('throws when per_field grouping has no groupBy fields', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_grouping', groupingMode: 'per_field', groupBy: [] },
      ];

      expect(() => executeActionPolicyOperations({}, ops)).toThrow(
        'groupBy fields are required when groupingMode is "per_field"'
      );
    });
  });

  describe('throttle / grouping compatibility', () => {
    it('throws when per_episode grouping uses time_interval strategy', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_throttle', strategy: 'time_interval', interval: '5m' },
      ];

      expect(() =>
        executeActionPolicyOperations({ groupingMode: 'per_episode' }, ops)
      ).toThrow('not valid for grouping mode');
    });

    it('throws when strategy requires interval but none provided', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_throttle', strategy: 'per_status_interval' },
      ];

      expect(() => executeActionPolicyOperations({}, ops)).toThrow('requires an interval');
    });
  });
});
