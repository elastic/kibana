/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyDestinationSchema,
  bulkSnoozeActionPoliciesBodySchema,
  createActionPolicyDataSchema,
  snoozeActionPolicyBodySchema,
  updateActionPolicyDataSchema,
} from './action_policy_data_schema';
import { MAX_BULK_ITEMS } from './constants';

const DESTINATIONS = [{ type: 'workflow' as const, id: 'wf-1' }];

describe('createActionPolicyDataSchema', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };

  describe('valid payloads', () => {
    it('accepts minimal payload (defaults to per_episode, no throttle)', () => {
      const result = createActionPolicyDataSchema.parse(base);

      expect(result.grouping_mode).toBeUndefined();
      expect(result.throttle).toBeUndefined();
    });

    it('accepts per_episode + on_status_change', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping_mode: 'per_episode',
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.grouping_mode).toBe('per_episode');
      expect(result.throttle?.strategy).toBe('on_status_change');
    });

    it('accepts per_episode + per_status_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping_mode: 'per_episode',
        throttle: { strategy: 'per_status_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'per_status_interval', interval: '5m' });
    });

    it('accepts per_episode + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping_mode: 'per_episode',
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts per_field + time_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping_mode: 'per_field',
        group_by: ['host.name'],
        throttle: { strategy: 'time_interval', interval: '10m' },
      });

      expect(result.grouping_mode).toBe('per_field');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '10m' });
    });

    it('accepts per_field + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping_mode: 'per_field',
        group_by: ['host.name'],
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts all + time_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping_mode: 'all',
        throttle: { strategy: 'time_interval', interval: '1h' },
      });

      expect(result.grouping_mode).toBe('all');
    });

    it('accepts all + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping_mode: 'all',
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

    it('accepts no grouping_mode with per_episode-compatible strategy', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.grouping_mode).toBeUndefined();
      expect(result.throttle?.strategy).toBe('on_status_change');
    });
  });

  describe('invalid payloads', () => {
    it('rejects per_episode + time_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping_mode: 'per_episode',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + on_status_change', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping_mode: 'per_field',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + per_status_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping_mode: 'per_field',
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + on_status_change', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping_mode: 'all',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + per_status_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping_mode: 'all',
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_status_interval without interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping_mode: 'per_episode',
          throttle: { strategy: 'per_status_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects time_interval without interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping_mode: 'all',
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects omitted grouping_mode with time_interval (defaults to per_episode)', () => {
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

    it('rejects unknown top-level fields (strict)', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          unknownField: 'x',
        })
      ).toThrow();
    });

    it('rejects unknown keys inside throttle (strict)', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          throttle: { strategy: 'on_status_change', unknownField: 'x' },
        })
      ).toThrow();
    });
  });
});

describe('updateActionPolicyDataSchema', () => {
  it('rejects any unknown key (strict)', () => {
    expect(() => updateActionPolicyDataSchema.parse({ name: 'New', unknownField: 'x' })).toThrow();
  });

  it('rejects unknown keys inside throttle (strict)', () => {
    expect(() =>
      updateActionPolicyDataSchema.parse({
        throttle: { strategy: 'on_status_change', unknownField: 'x' },
      })
    ).toThrow();
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

    it('accepts compatible grouping_mode and throttle together', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping_mode: 'all',
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.grouping_mode).toBe('all');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts throttle without grouping_mode (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts grouping_mode without throttle (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping_mode: 'per_field',
      });

      expect(result.grouping_mode).toBe('per_field');
    });

    it('accepts setting throttle to null (clear throttle)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping_mode: 'per_episode',
        throttle: null,
      });

      expect(result.throttle).toBeNull();
    });

    it('accepts setting grouping_mode to null with throttle absent (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping_mode: null,
      });

      expect(result.grouping_mode).toBeNull();
    });

    it('accepts setting both grouping_mode and throttle to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping_mode: null,
        throttle: null,
      });

      expect(result.grouping_mode).toBeNull();
      expect(result.throttle).toBeNull();
    });

    it('accepts setting matcher to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        matcher: null,
      });

      expect(result.matcher).toBeNull();
    });

    it('accepts setting group_by to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        group_by: null,
      });

      expect(result.group_by).toBeNull();
    });

    it('accepts grouping_mode null with per_episode-compatible strategy (defaults to per_episode)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping_mode: null,
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.grouping_mode).toBeNull();
      expect(result.throttle?.strategy).toBe('on_status_change');
    });
  });

  describe('invalid payloads', () => {
    it('rejects incompatible grouping_mode and throttle strategy', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          grouping_mode: 'per_episode',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects grouping_mode null with aggregate-only strategy (null defaults to per_episode)', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          grouping_mode: null,
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects strategy requiring interval when interval is missing', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          grouping_mode: 'all',
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects per_field + on_status_change', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          grouping_mode: 'per_field',
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_status_interval without interval even when grouping_mode is omitted', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          throttle: { strategy: 'per_status_interval' },
        })
      ).toThrow('requires an interval');
    });

    it('rejects time_interval without interval even when grouping_mode is omitted', () => {
      expect(() =>
        updateActionPolicyDataSchema.parse({
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow('requires an interval');
    });
  });
});

describe('bulkSnoozeActionPoliciesBodySchema', () => {
  it('accepts ids plus snoozed_until', () => {
    const result = bulkSnoozeActionPoliciesBodySchema.parse({
      ids: ['policy-1', 'policy-2'],
      snoozed_until: '2026-04-01T10:00:00Z',
    });

    expect(result).toEqual({
      ids: ['policy-1', 'policy-2'],
      snoozed_until: '2026-04-01T10:00:00Z',
    });
  });

  it('rejects a missing snoozed_until', () => {
    expect(() =>
      bulkSnoozeActionPoliciesBodySchema.parse({
        ids: ['policy-1'],
      })
    ).toThrow();
  });

  it('rejects a non-datetime snoozed_until', () => {
    expect(() =>
      bulkSnoozeActionPoliciesBodySchema.parse({
        ids: ['policy-1'],
        snoozed_until: 'not-a-date',
      })
    ).toThrow();
  });

  it('rejects an empty ids array', () => {
    expect(() =>
      bulkSnoozeActionPoliciesBodySchema.parse({
        ids: [],
        snoozed_until: '2026-04-01T10:00:00Z',
      })
    ).toThrow();
  });

  it('rejects more than MAX_BULK_ITEMS ids', () => {
    expect(() =>
      bulkSnoozeActionPoliciesBodySchema.parse({
        ids: Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `policy-${i}`),
        snoozed_until: '2026-04-01T10:00:00Z',
      })
    ).toThrow();
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() =>
      bulkSnoozeActionPoliciesBodySchema.parse({
        ids: ['policy-1'],
        snoozed_until: '2026-04-01T10:00:00Z',
        unknownField: 'x',
      })
    ).toThrow();
  });
});

describe('snoozeActionPolicyBodySchema', () => {
  it('rejects unknown top-level fields (strict)', () => {
    expect(() =>
      snoozeActionPolicyBodySchema.parse({
        snoozed_until: '2026-04-01T10:00:00Z',
        unknownField: 'x',
      })
    ).toThrow();
  });
});

describe('actionPolicyDestinationSchema', () => {
  it('rejects unknown fields on workflow destination (strict)', () => {
    expect(() =>
      actionPolicyDestinationSchema.parse({
        type: 'workflow',
        id: 'wf-1',
        unknownField: 'x',
      })
    ).toThrow();
  });
});
