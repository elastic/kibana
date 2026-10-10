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

      expect(() => executeActionPolicyOperations({ ...validPolicy, name: '' }, ops)).toThrow(
        ActionPolicyOperationValidationError
      );
    });

    it('throws when destinations are missing', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'validate' }];

      expect(() =>
        executeActionPolicyOperations({ name: 'Test', description: 'desc', destinations: [] }, ops)
      ).toThrow('Action policy is not ready to save');
    });

    it('includes Zod issue paths in the error message', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'validate' }];

      expect(() =>
        executeActionPolicyOperations({ name: '', description: '', destinations: [] }, ops)
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
        { operation: 'set_matcher', matcher: { expression: 'alert_status: "active"' } },
      ];

      const result = executeActionPolicyOperations({}, ops);

      expect(result.matcher).toEqual({ expression: 'alert_status: "active"' });
    });

    it('applies set_grouping', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_grouping', groupingMode: 'per_field', groupBy: ['host.name'] },
      ];

      const result = executeActionPolicyOperations({}, ops);

      expect(result.grouping).toEqual({ mode: 'per_field', fields: ['host.name'] });
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

  /**
   * The grouping is one mode variant, so the draft the tool builds names exactly one: a mode that
   * groups on no field cannot carry fields, and `per_field` cannot be left without them.
   */
  describe('set_grouping builds the variant the mode names', () => {
    const run = (
      op: Extract<ActionPolicyOperation, { operation: 'set_grouping' }>,
      existing: Parameters<typeof executeActionPolicyOperations>[0] = {}
    ) => executeActionPolicyOperations(existing, [op]);

    it.each(['per_alert', 'all'] as const)('builds %s with no fields', (groupingMode) => {
      expect(run({ operation: 'set_grouping', groupingMode }).grouping).toEqual({
        mode: groupingMode,
      });
    });

    it('drops the stored fields when switching away from per_field', () => {
      const existing = { grouping: { mode: 'per_field' as const, fields: ['host.name'] } };

      expect(run({ operation: 'set_grouping', groupingMode: 'all' }, existing).grouping).toEqual({
        mode: 'all',
      });
    });

    it('carries the stored fields over when only the mode is repeated', () => {
      const existing = { grouping: { mode: 'per_field' as const, fields: ['host.name'] } };

      expect(
        run({ operation: 'set_grouping', groupingMode: 'per_field' }, existing).grouping
      ).toEqual({ mode: 'per_field', fields: ['host.name'] });
    });

    it('groups by field when only fields are named and the stored mode is per_field', () => {
      const existing = { grouping: { mode: 'per_field' as const, fields: ['host.name'] } };

      expect(
        run({ operation: 'set_grouping', groupBy: ['service.name'] }, existing).grouping
      ).toEqual({ mode: 'per_field', fields: ['service.name'] });
    });

    it.each(['per_alert', 'all'] as const)(
      'rejects fields on %s, which groups on none',
      (groupingMode) => {
        expect(() =>
          run({ operation: 'set_grouping', groupingMode, groupBy: ['host.name'] })
        ).toThrow('does not group on fields');
      }
    );

    it('rejects per_field when neither the operation nor the draft has fields', () => {
      expect(() => run({ operation: 'set_grouping', groupingMode: 'per_field' })).toThrow(
        'groupBy fields are required'
      );
    });
  });

  it('passes validation for a complete rule-scoped policy', () => {
    const ops: ActionPolicyOperation[] = [
      { operation: 'set_metadata', name: 'My Policy', description: 'desc' },
      {
        operation: 'set_destinations',
        destinations: [{ type: 'workflow', id: '00000000-0000-0000-0000-000000000001' }],
      },
      { operation: 'set_matcher', matcher: { tags: ['critical'] } },
      { operation: 'validate' },
    ];

    const result = executeActionPolicyOperations({}, ops, { isNew: true });

    expect(result.matcher).toEqual({ tags: ['critical'] });
  });

  describe('throttle / grouping compatibility', () => {
    it('throws when per_alert grouping uses time_interval strategy', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_throttle', strategy: 'time_interval', interval: '5m' },
      ];

      expect(() => executeActionPolicyOperations({ grouping: { mode: 'per_alert' } }, ops)).toThrow(
        'not valid for grouping mode'
      );
    });

    it('throws when strategy requires interval but none provided', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_throttle', strategy: 'per_status_interval' },
      ];

      expect(() => executeActionPolicyOperations({}, ops)).toThrow('requires an interval');
    });
  });

  describe('set_throttle builds the variant the strategy names', () => {
    it('drops the stored interval when switching to a strategy without one', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'set_throttle', strategy: 'every_time' }];

      const result = executeActionPolicyOperations(
        { grouping: { mode: 'all' }, throttle: { strategy: 'time_interval', interval: '5m' } },
        ops
      );

      expect(result.throttle).toEqual({ strategy: 'every_time' });
    });

    it('carries the stored interval over to another strategy that takes one', () => {
      const ops: ActionPolicyOperation[] = [
        { operation: 'set_throttle', strategy: 'per_status_interval' },
      ];

      const result = executeActionPolicyOperations(
        {
          grouping: { mode: 'per_alert' },
          throttle: { strategy: 'time_interval', interval: '5m' },
        },
        ops
      );

      expect(result.throttle).toEqual({ strategy: 'per_status_interval', interval: '5m' });
    });

    // An interval the strategy never reads is an error, not a value the server quietly discards.
    it.each(['every_time', 'on_status_change'] as const)(
      'throws when an interval is spelled out for %s',
      (strategy) => {
        const ops: ActionPolicyOperation[] = [
          { operation: 'set_throttle', strategy, interval: '5m' },
        ];

        expect(() => executeActionPolicyOperations({}, ops)).toThrow('does not take an interval');
      }
    );

    it('keeps the stored strategy when only the interval is set', () => {
      const ops: ActionPolicyOperation[] = [{ operation: 'set_throttle', interval: '10m' }];

      const result = executeActionPolicyOperations(
        {
          grouping: { mode: 'per_alert' },
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        },
        ops
      );

      expect(result.throttle).toEqual({ strategy: 'per_status_interval', interval: '10m' });
    });
  });
});
