/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkActionNotificationPoliciesBodySchema,
  createNotificationPolicyDataSchema,
  updateNotificationPolicyDataSchema,
} from './notification_policy_data_schema';

const DESTINATIONS = [{ type: 'workflow' as const, id: 'wf-1' }];

describe('createNotificationPolicyDataSchema', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };

  describe('valid payloads', () => {
    it('accepts minimal payload (defaults to per_episode, no throttle)', () => {
      const result = createNotificationPolicyDataSchema.parse(base);

      expect(result.groupingMode).toBeUndefined();
      expect(result.throttle).toBeUndefined();
    });

    it('accepts per_episode + on_status_change', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_episode',
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.groupingMode).toBe('per_episode');
      expect(result.throttle?.strategy).toBe('on_status_change');
    });

    it('accepts per_episode + per_status_interval with interval', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_episode',
        throttle: { strategy: 'per_status_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'per_status_interval', interval: '5m' });
    });

    it('accepts per_episode + every_time', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_episode',
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts per_field + time_interval with interval', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttle: { strategy: 'time_interval', interval: '10m' },
      });

      expect(result.groupingMode).toBe('per_field');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '10m' });
    });

    it('accepts per_field + every_time', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        groupingMode: 'per_field',
        groupBy: ['host.name'],
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts all + time_interval with interval', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        groupingMode: 'all',
        throttle: { strategy: 'time_interval', interval: '1h' },
      });

      expect(result.groupingMode).toBe('all');
    });

    it('accepts all + every_time', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        groupingMode: 'all',
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts empty throttle object (no strategy)', () => {
      const result = createNotificationPolicyDataSchema.parse({
        ...base,
        throttle: {},
      });

      expect(result.throttle).toEqual({});
    });

    it('accepts no groupingMode with per_episode-compatible strategy', () => {
      const result = createNotificationPolicyDataSchema.parse({
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
        createNotificationPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_episode',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + on_status_change', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_field',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + per_status_interval', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_field',
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + on_status_change', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          groupingMode: 'all',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + per_status_interval', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          groupingMode: 'all',
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_status_interval without interval', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          groupingMode: 'per_episode',
          throttle: { strategy: 'per_status_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects time_interval without interval', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          groupingMode: 'all',
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects omitted groupingMode with time_interval (defaults to per_episode)', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects empty destinations', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          ...base,
          destinations: [],
        })
      ).toThrow();
    });

    it('rejects missing name', () => {
      expect(() =>
        createNotificationPolicyDataSchema.parse({
          description: 'Desc',
          destinations: DESTINATIONS,
        })
      ).toThrow();
    });
  });
});

describe('updateNotificationPolicyDataSchema', () => {
  describe('valid payloads', () => {
    it('accepts an empty partial update', () => {
      const result = updateNotificationPolicyDataSchema.parse({});

      expect(result).toEqual({});
    });

    it('accepts updating only name', () => {
      const result = updateNotificationPolicyDataSchema.parse({ name: 'New name' });

      expect(result.name).toBe('New name');
    });

    it('accepts compatible groupingMode and throttle together', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        groupingMode: 'all',
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.groupingMode).toBe('all');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts throttle without groupingMode (skips validation)', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts groupingMode without throttle (skips validation)', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        groupingMode: 'per_field',
      });

      expect(result.groupingMode).toBe('per_field');
    });

    it('accepts setting throttle to null (clear throttle)', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        groupingMode: 'per_episode',
        throttle: null,
      });

      expect(result.throttle).toBeNull();
    });

    it('accepts setting groupingMode to null with throttle absent (skips validation)', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        groupingMode: null,
      });

      expect(result.groupingMode).toBeNull();
    });

    it('accepts setting both groupingMode and throttle to null', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        groupingMode: null,
        throttle: null,
      });

      expect(result.groupingMode).toBeNull();
      expect(result.throttle).toBeNull();
    });

    it('accepts setting matcher to null', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        matcher: null,
      });

      expect(result.matcher).toBeNull();
    });

    it('accepts setting groupBy to null', () => {
      const result = updateNotificationPolicyDataSchema.parse({
        groupBy: null,
      });

      expect(result.groupBy).toBeNull();
    });

    it('accepts groupingMode null with per_episode-compatible strategy (defaults to per_episode)', () => {
      const result = updateNotificationPolicyDataSchema.parse({
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
        updateNotificationPolicyDataSchema.parse({
          groupingMode: 'per_episode',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects groupingMode null with aggregate-only strategy (null defaults to per_episode)', () => {
      expect(() =>
        updateNotificationPolicyDataSchema.parse({
          groupingMode: null,
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects strategy requiring interval when interval is missing', () => {
      expect(() =>
        updateNotificationPolicyDataSchema.parse({
          groupingMode: 'all',
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects per_field + on_status_change', () => {
      expect(() =>
        updateNotificationPolicyDataSchema.parse({
          groupingMode: 'per_field',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_status_interval without interval even when groupingMode is omitted', () => {
      expect(() =>
        updateNotificationPolicyDataSchema.parse({
          throttle: { strategy: 'per_status_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects time_interval without interval even when groupingMode is omitted', () => {
      expect(() =>
        updateNotificationPolicyDataSchema.parse({
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });
  });
});

describe('bulkActionNotificationPoliciesBodySchema', () => {
  it('accepts a delete action', () => {
    const result = bulkActionNotificationPoliciesBodySchema.parse({
      actions: [{ id: 'policy-1', action: 'delete' }],
    });

    expect(result).toEqual({
      actions: [{ id: 'policy-1', action: 'delete' }],
    });
  });

  it('accepts mixed actions including delete', () => {
    const result = bulkActionNotificationPoliciesBodySchema.parse({
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
      bulkActionNotificationPoliciesBodySchema.parse({
        actions: [{ id: 'policy-1', action: 'unknown' }],
      })
    ).toThrow();
  });

  it('rejects an empty actions array', () => {
    expect(() =>
      bulkActionNotificationPoliciesBodySchema.parse({
        actions: [],
      })
    ).toThrow();
  });
});
