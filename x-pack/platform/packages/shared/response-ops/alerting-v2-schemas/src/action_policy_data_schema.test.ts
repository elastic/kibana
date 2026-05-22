/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkActionActionPoliciesBodySchema,
  createActionPolicyDataSchema,
  updateActionPolicyDataSchema,
} from './action_policy_data_schema';

const DESTINATIONS = [{ type: 'workflow' as const, id: 'wf-1' }];

describe('createActionPolicyDataSchema', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };

  describe('valid payloads', () => {
    it('accepts minimal payload (defaults to per_episode, no throttle)', () => {
      const result = createActionPolicyDataSchema.parse(base);

      expect(result.groupingMode).toBeUndefined();
      expect(result.throttle).toBeUndefined();
    });

    it('accepts per_episode + on_status_change', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_episode',
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.groupingMode).toBe('per_episode');
      expect(result.throttle?.strategy).toBe('on_status_change');
    });

    it('accepts per_episode + per_status_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_episode',
        throttle: { strategy: 'per_status_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'per_status_interval', interval: '5m' });
    });

    it('accepts per_episode + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_episode',
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts per_field + time_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttle: { strategy: 'time_interval', interval: '10m' },
      });

      expect(result.groupingMode).toBe('per_field');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '10m' });
    });

    it('accepts per_field + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts all + time_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        groupingMode: 'all',
        throttle: { strategy: 'time_interval', interval: '1h' },
      });

      expect(result.groupingMode).toBe('all');
    });

    it('accepts all + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        groupingMode: 'all',
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts empty throttle object (no strategy)', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        throttle: {},
      });

      expect(result.throttle).toEqual({});
    });

    it('accepts no groupingMode with per_episode-compatible strategy', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.groupingMode).toBeUndefined();
      expect(result.throttle?.strategy).toBe('on_status_change');
    });
  });

  describe('invalid payloads', () => {
    it('rejects per_episode + time_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_episode',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + on_status_change', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_field',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + per_status_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_field',
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + on_status_change', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          groupingMode: 'all',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + per_status_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          groupingMode: 'all',
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_status_interval without interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_episode',
          throttle: { strategy: 'per_status_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects time_interval without interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          groupingMode: 'all',
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects omitted groupingMode with time_interval (defaults to per_episode)', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects empty destinations', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          destinations: [],
        })
      ).toThrow();
    });

    it('rejects missing name', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          description: 'Desc',
          destinations: DESTINATIONS,
        })
      ).toThrow();
    });
  });

  describe('type and ruleId', () => {
    it('defaults type to "global" when omitted', () => {
      const result = createActionPolicyDataSchema.parse(base);

      expect(result.type).toBe('global');
      expect(result.ruleId).toBeUndefined();
    });

    it('accepts explicit type "global" without ruleId', () => {
      const result = createActionPolicyDataSchema.parse({ ...base, type: 'global' });

      expect(result.type).toBe('global');
      expect(result.ruleId).toBeUndefined();
    });

    it('accepts type "single_rule" with non-empty ruleId', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        type: 'single_rule',
        ruleId: 'rule-1',
      });

      expect(result.type).toBe('single_rule');
      expect(result.ruleId).toBe('rule-1');
    });

    it('rejects type "single_rule" without ruleId', () => {
      expect(() => createActionPolicyDataSchema.parse({ ...base, type: 'single_rule' })).toThrow(
        /ruleId is required/
      );
    });

    it('rejects type "single_rule" with empty ruleId', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({ ...base, type: 'single_rule', ruleId: '' })
      ).toThrow();
    });

    it('rejects type "global" with ruleId set', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({ ...base, type: 'global', ruleId: 'rule-1' })
      ).toThrow(/ruleId is only allowed/);
    });

    it('rejects ruleId provided with no type (defaults to global, so ruleId is forbidden)', () => {
      expect(() => createActionPolicyDataSchema.parse({ ...base, ruleId: 'rule-1' })).toThrow(
        /ruleId is only allowed/
      );
    });

    it('rejects an unknown type value', () => {
      expect(() => createActionPolicyDataSchema.parse({ ...base, type: 'team_rule' })).toThrow();
    });
  });
});

describe('updateActionPolicyDataSchema', () => {
  describe('immutability of type and ruleId', () => {
    it('rejects `type` in the update payload (immutable)', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({ name: 'New', type: 'single_rule' })
      ).toThrow();
    });

    it('rejects `ruleId` in the update payload (immutable)', () => {
      expect(() => updateActionPolicyDataSchema.parse({ name: 'New', ruleId: 'rule-2' })).toThrow();
    });

    it('rejects any unknown key (strict)', () => {
      expect(() => updateActionPolicyDataSchema.parse({ name: 'New', futureField: 'x' })).toThrow();
    });
  });

  describe('valid payloads', () => {
    it('accepts an empty partial update', () => {
      const result = updateActionPolicyDataSchema.parse({});

      expect(result).toEqual({});
    });

    it('accepts updating only name', () => {
      const result = updateActionPolicyDataSchema.parse({ name: 'New name' });

      expect(result.name).toBe('New name');
    });

    it('accepts compatible groupingMode and throttle together', () => {
      const result = updateActionPolicyDataSchema.parse({
        groupingMode: 'all',
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.groupingMode).toBe('all');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts throttle without groupingMode (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts groupingMode without throttle (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        groupingMode: 'per_field',
      });

      expect(result.groupingMode).toBe('per_field');
    });

    it('accepts setting throttle to null (clear throttle)', () => {
      const result = updateActionPolicyDataSchema.parse({
        groupingMode: 'per_episode',
        throttle: null,
      });

      expect(result.throttle).toBeNull();
    });

    it('accepts setting groupingMode to null with throttle absent (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        groupingMode: null,
      });

      expect(result.groupingMode).toBeNull();
    });

    it('accepts setting both groupingMode and throttle to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        groupingMode: null,
        throttle: null,
      });

      expect(result.groupingMode).toBeNull();
      expect(result.throttle).toBeNull();
    });

    it('accepts setting matcher to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        matcher: null,
      });

      expect(result.matcher).toBeNull();
    });

    it('accepts setting groupBy to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        groupBy: null,
      });

      expect(result.groupBy).toBeNull();
    });

    it('accepts groupingMode null with per_episode-compatible strategy (defaults to per_episode)', () => {
      const result = updateActionPolicyDataSchema.parse({
        groupingMode: null,
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.groupingMode).toBeNull();
      expect(result.throttle?.strategy).toBe('on_status_change');
    });
  });

  describe('invalid payloads', () => {
    it('rejects incompatible groupingMode and throttle strategy', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          groupingMode: 'per_episode',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects groupingMode null with aggregate-only strategy (null defaults to per_episode)', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          groupingMode: null,
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects strategy requiring interval when interval is missing', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          groupingMode: 'all',
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects per_field + on_status_change', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          groupingMode: 'per_field',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_status_interval without interval even when groupingMode is omitted', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          throttle: { strategy: 'per_status_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects time_interval without interval even when groupingMode is omitted', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });
  });
});

describe('bulkActionActionPoliciesBodySchema', () => {
  it('accepts a delete action', () => {
    const result = bulkActionActionPoliciesBodySchema.parse({
      actions: [{ id: 'policy-1', action: 'delete' }],
    });

    expect(result).toEqual({
      actions: [{ id: 'policy-1', action: 'delete' }],
    });
  });

  it('accepts mixed actions including delete', () => {
    const result = bulkActionActionPoliciesBodySchema.parse({
      actions: [
        { id: 'policy-1', action: 'enable' },
        { id: 'policy-2', action: 'disable' },
        { id: 'policy-3', action: 'delete' },
        { id: 'policy-4', action: 'snooze', snoozedUntil: '2026-04-01T10:00:00Z' },
        { id: 'policy-5', action: 'unsnooze' },
      ],
    });

    expect(result.actions).toHaveLength(5);
    expect(result.actions[2]).toEqual({ id: 'policy-3', action: 'delete' });
  });

  it('rejects an unknown action', () => {
    expect(() =>
      bulkActionActionPoliciesBodySchema.parse({
        actions: [{ id: 'policy-1', action: 'unknown' }],
      })
    ).toThrow();
  });

  it('rejects an empty actions array', () => {
    expect(() =>
      bulkActionActionPoliciesBodySchema.parse({
        actions: [],
      })
    ).toThrow();
  });
});
