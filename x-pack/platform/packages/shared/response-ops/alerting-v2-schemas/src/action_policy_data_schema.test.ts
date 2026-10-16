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
  findActionPoliciesRequestSchema,
  putActionPolicyDataSchema,
  snoozeActionPolicyBodySchema,
  updateActionPolicyDataSchema,
} from './action_policy_data_schema';
import { FIND_MAX_RESULT_WINDOW, MAX_BULK_ITEMS, MAX_KQL_LENGTH } from './constants';

const DESTINATIONS = [{ type: 'workflow' as const, id: 'wf-1' }];

describe('createActionPolicyDataSchema', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };

  describe('valid payloads', () => {
    it('accepts minimal payload (defaults to per_alert, no throttle)', () => {
      const result = createActionPolicyDataSchema.parse(base);

      expect(result.grouping).toBeUndefined();
      expect(result.throttle).toBeUndefined();
    });

    it('trims surrounding whitespace from name', () => {
      const result = createActionPolicyDataSchema.parse({ ...base, name: '  Test  ' });

      expect(result.name).toBe('Test');
    });

    it('accepts per_alert + on_status_change', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.grouping?.mode).toBe('per_alert');
      expect(result.throttle?.strategy).toBe('on_status_change');
    });

    it('accepts per_alert + per_status_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'per_status_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'per_status_interval', interval: '5m' });
    });

    it('accepts per_alert + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts per_field + time_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping: { mode: 'per_field', fields: ['host.name'] },
        throttle: { strategy: 'time_interval', interval: '10m' },
      });

      expect(result.grouping?.mode).toBe('per_field');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '10m' });
    });

    it('accepts per_field + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping: { mode: 'per_field', fields: ['host.name'] },
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts all + time_interval with interval', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping: { mode: 'all' },
        throttle: { strategy: 'time_interval', interval: '1h' },
      });

      expect(result.grouping?.mode).toBe('all');
    });

    it('accepts all + every_time', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        grouping: { mode: 'all' },
        throttle: { strategy: 'every_time' },
      });

      expect(result.throttle?.strategy).toBe('every_time');
    });

    it('accepts no grouping with a per_alert-compatible strategy', () => {
      const result = createActionPolicyDataSchema.parse({
        ...base,
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.grouping).toBeUndefined();
      expect(result.throttle?.strategy).toBe('on_status_change');
    });
  });

  describe('invalid payloads', () => {
    it('rejects whitespace-only name', () => {
      expect(() => createActionPolicyDataSchema.parse({ ...base, name: '   ' })).toThrow();
    });

    it('rejects the removed per_episode grouping mode', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({ ...base, grouping: { mode: 'per_episode' } })
      ).toThrow();
    });

    it.each([
      ['an empty tags array', { tags: [] }],
      ['an empty expression', { expression: '' }],
      ['a null tags array', { tags: null }],
      ['a null expression', { expression: null }],
    ])('rejects a matcher with %s', (_, matcher) => {
      expect(() => createActionPolicyDataSchema.parse({ ...base, matcher })).toThrow();
    });

    it('rejects per_alert + time_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'per_alert' },
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + on_status_change', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'per_field', fields: ['host.name'] },
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_field + per_status_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'per_field', fields: ['host.name'] },
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + on_status_change', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'all' },
          throttle: { strategy: 'on_status_change' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects all + per_status_interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'all' },
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      ).toThrow('not valid for grouping mode');
    });

    it('rejects per_status_interval without interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'per_alert' },
          throttle: { strategy: 'per_status_interval' },
        })
      ).toThrow();
    });

    it('rejects time_interval without interval', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'all' },
          throttle: { strategy: 'time_interval' },
        })
      ).toThrow();
    });

    it('rejects a null interval on a strategy that takes one', () => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: 'per_alert' },
          throttle: { strategy: 'per_status_interval', interval: null },
        })
      ).toThrow();
    });

    it.each([
      ['per_alert', 'on_status_change'],
      ['per_alert', 'every_time'],
    ])('rejects an interval on %s + %s', (groupingMode, strategy) => {
      expect(() =>
        createActionPolicyDataSchema.parse({
          ...base,
          grouping: { mode: groupingMode },
          throttle: { strategy, interval: '5m' },
        })
      ).toThrow();
    });

    it('rejects an omitted grouping with time_interval (defaults to per_alert)', () => {
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

describe('an empty union object names no variant', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };

  it.each([
    ['throttle on create', createActionPolicyDataSchema, { ...base, throttle: {} }],
    ['throttle on put', putActionPolicyDataSchema, { ...base, throttle: {} }],
    ['throttle on patch', updateActionPolicyDataSchema, { throttle: {} }],
    ['grouping on create', createActionPolicyDataSchema, { ...base, grouping: {} }],
    ['grouping on put', putActionPolicyDataSchema, { ...base, grouping: {} }],
    ['grouping on patch', updateActionPolicyDataSchema, { grouping: {} }],
  ])('rejects %s', (_label, schema, body) => {
    expect(schema.safeParse(body).success).toBe(false);
  });
});

/**
 * The mode decides which keys the grouping has, so the shape is judged from the body alone on every
 * write: nothing here could become valid by merging onto a stored policy.
 */
describe('grouping shape judged without the stored document', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };
  const writeSchemas: Array<[string, typeof createActionPolicyDataSchema]> = [
    ['create', createActionPolicyDataSchema],
    ['replace', putActionPolicyDataSchema],
  ];

  const invalidGroupings: Array<[string, unknown]> = [
    ['per_field with no fields', { mode: 'per_field' }],
    ['per_field with an empty fields array', { mode: 'per_field', fields: [] }],
    ['per_field with a whitespace-only field', { mode: 'per_field', fields: ['   '] }],
    ['fields on the all mode', { mode: 'all', fields: ['host.name'] }],
    ['fields on the per_alert mode', { mode: 'per_alert', fields: ['host.name'] }],
    ['an unknown mode', { mode: 'per_galaxy' }],
    ['a null mode', { mode: null }],
    ['fields with no mode to belong to', { fields: ['host.name'] }],
  ];

  describe.each(writeSchemas)('on %s', (_label, schema) => {
    it.each(invalidGroupings)('rejects %s', (_case, grouping) => {
      expect(schema.safeParse({ ...base, grouping }).success).toBe(false);
    });
  });

  it.each(invalidGroupings)('rejects %s on patch', (_case, grouping) => {
    expect(updateActionPolicyDataSchema.safeParse({ grouping }).success).toBe(false);
  });

  it.each([
    ['per_alert', { mode: 'per_alert' }],
    ['all', { mode: 'all' }],
    ['per_field with fields', { mode: 'per_field', fields: ['host.name', 'service.name'] }],
  ])('accepts %s on patch, replacing the block whole', (_case, grouping) => {
    expect(updateActionPolicyDataSchema.parse({ grouping })).toEqual({ grouping });
  });

  it('trims the grouping fields', () => {
    const result = createActionPolicyDataSchema.parse({
      ...base,
      grouping: { mode: 'per_field', fields: ['  host.name  '] },
    });

    expect(result.grouping).toEqual({ mode: 'per_field', fields: ['host.name'] });
  });
});

describe('putActionPolicyDataSchema', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };

  it('accepts the create-action-policy body unchanged', () => {
    expect(putActionPolicyDataSchema.parse(base)).toEqual(base);
  });

  // Lifecycle state belongs to `_enable`/`_disable`, so a write body may not carry it.
  it('rejects enabled', () => {
    expect(putActionPolicyDataSchema.safeParse({ ...base, enabled: true }).success).toBe(false);
    expect(putActionPolicyDataSchema.safeParse({ ...base, enabled: false }).success).toBe(false);
  });

  it('rejects enabled on createActionPolicyDataSchema too', () => {
    expect(createActionPolicyDataSchema.safeParse({ ...base, enabled: true }).success).toBe(false);
  });

  it('rejects snoozed_until', () => {
    expect(
      putActionPolicyDataSchema.safeParse({
        ...base,
        snoozed_until: '2026-10-07T00:00:00.000Z',
      }).success
    ).toBe(false);
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

    it('accepts a compatible grouping and throttle together', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping: { mode: 'all' },
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.grouping?.mode).toBe('all');
      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts throttle without grouping (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        throttle: { strategy: 'time_interval', interval: '5m' },
      });

      expect(result.throttle).toEqual({ strategy: 'time_interval', interval: '5m' });
    });

    it('accepts grouping without throttle (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping: { mode: 'per_field', fields: ['host.name'] },
      });

      expect(result.grouping).toEqual({ mode: 'per_field', fields: ['host.name'] });
    });

    it('accepts setting throttle to null (clear throttle)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping: { mode: 'per_alert' },
        throttle: null,
      });

      expect(result.throttle).toBeNull();
    });

    it('accepts setting grouping to null with throttle absent (skips validation)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping: null,
      });

      expect(result.grouping).toBeNull();
    });

    it('accepts setting both grouping and throttle to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping: null,
        throttle: null,
      });

      expect(result.grouping).toBeNull();
      expect(result.throttle).toBeNull();
    });

    it('accepts setting matcher to null', () => {
      const result = updateActionPolicyDataSchema.parse({
        matcher: null,
      });

      expect(result.matcher).toBeNull();
    });

    it('accepts a matcher that omits both sub-fields, which names no leaf to change', () => {
      expect(updateActionPolicyDataSchema.parse({ matcher: {} })).toEqual({ matcher: {} });
    });

    it('accepts a matcher that sets one sub-field and leaves the other out', () => {
      const result = updateActionPolicyDataSchema.parse({ matcher: { tags: ['prod'] } });

      expect(result.matcher).toEqual({ tags: ['prod'] });
    });

    it('accepts clearing a single matcher sub-field', () => {
      const result = updateActionPolicyDataSchema.parse({ matcher: { expression: null } });

      expect(result.matcher).toEqual({ expression: null });
    });

    it('accepts replacing the throttle with a variant that has fewer keys', () => {
      const result = updateActionPolicyDataSchema.parse({ throttle: { strategy: 'every_time' } });

      expect(result.throttle).toEqual({ strategy: 'every_time' });
    });

    it('accepts a null grouping with a per_alert-compatible strategy (defaults to per_alert)', () => {
      const result = updateActionPolicyDataSchema.parse({
        grouping: null,
        throttle: { strategy: 'on_status_change' },
      });

      expect(result.grouping).toBeNull();
      expect(result.throttle?.strategy).toBe('on_status_change');
    });
  });

  describe('invalid payloads', () => {
    it('rejects unknown keys', () => {
      expect(() => updateActionPolicyDataSchema.parse({ nope: true })).toThrow();
    });

    it('rejects clearing a field that is required at create', () => {
      expect(() => updateActionPolicyDataSchema.parse({ name: null })).toThrow();
      expect(() => updateActionPolicyDataSchema.parse({ destinations: null })).toThrow();
    });

    it('still enforces the leaf constraints from the create schema', () => {
      expect(() => updateActionPolicyDataSchema.parse({ name: '' })).toThrow();
      expect(() => updateActionPolicyDataSchema.parse({ destinations: [] })).toThrow();
      expect(() => updateActionPolicyDataSchema.parse({ matcher: { tags: [] } })).toThrow();
    });
  });

  /**
   * A PATCH body is a sparse delta, so a cross-field rule cannot be judged from it alone: the
   * grouping mode a strategy is checked against may be the stored one. These bodies are therefore
   * accepted here and validated after the merge, by `ActionPolicyClient`.
   */
  describe('cross-field invariants deferred to the merged document', () => {
    it.each([
      [
        'an incompatible grouping mode and throttle strategy',
        {
          grouping: { mode: 'per_alert' },
          throttle: { strategy: 'time_interval', interval: '5m' },
        },
      ],
      [
        'a null grouping with an aggregate-only strategy',
        { grouping: null, throttle: { strategy: 'time_interval', interval: '5m' } },
      ],
      [
        'per_field with on_status_change',
        {
          grouping: { mode: 'per_field', fields: ['host.name'] },
          throttle: { strategy: 'on_status_change' },
        },
      ],
    ])('accepts %s', (_label, body) => {
      expect(updateActionPolicyDataSchema.safeParse(body).success).toBe(true);
    });
  });

  /**
   * The strategy decides which keys the throttle has, so the shape is judged from the body alone:
   * nothing here could become valid by merging onto a stored policy.
   */
  describe('throttle shape judged without the stored document', () => {
    it.each([
      [
        'per_status_interval without an interval',
        { throttle: { strategy: 'per_status_interval' } },
      ],
      ['time_interval without an interval', { throttle: { strategy: 'time_interval' } }],
      ['an interval on every_time', { throttle: { strategy: 'every_time', interval: '5m' } }],
      [
        'an interval on on_status_change',
        { throttle: { strategy: 'on_status_change', interval: '5m' } },
      ],
      ['an interval with no strategy to belong to', { throttle: { interval: '10m' } }],
      ['a null interval', { throttle: { strategy: 'time_interval', interval: null } }],
      ['a null strategy', { throttle: { strategy: null, interval: '5m' } }],
    ])('rejects %s', (_label, body) => {
      expect(updateActionPolicyDataSchema.safeParse(body).success).toBe(false);
    });
  });
});

describe('action policy optional fields are never empty', () => {
  const base = { name: 'Test', description: 'Desc', destinations: DESTINATIONS };
  const writeSchemas: Array<[string, typeof createActionPolicyDataSchema]> = [
    ['create', createActionPolicyDataSchema],
    ['replace', putActionPolicyDataSchema],
  ];

  describe('grouping.fields', () => {
    it.each(writeSchemas)('rejects an empty array on %s', (_label, schema) => {
      expect(
        schema.safeParse({ ...base, grouping: { mode: 'per_field', fields: [] } }).success
      ).toBe(false);
    });

    it.each(writeSchemas)('rejects null on %s', (_label, schema) => {
      expect(
        schema.safeParse({ ...base, grouping: { mode: 'per_field', fields: null } }).success
      ).toBe(false);
    });

    it.each(writeSchemas)('accepts a one-item array on %s', (_label, schema) => {
      expect(
        schema.safeParse({ ...base, grouping: { mode: 'per_field', fields: ['host.name'] } })
          .success
      ).toBe(true);
    });

    it('rejects an empty array on patch', () => {
      expect(
        updateActionPolicyDataSchema.safeParse({ grouping: { mode: 'per_field', fields: [] } })
          .success
      ).toBe(false);
    });

    it('accepts null on patch, which clears the whole block', () => {
      expect(updateActionPolicyDataSchema.parse({ grouping: null })).toEqual({ grouping: null });
    });
  });

  describe('throttle', () => {
    it.each(writeSchemas)('rejects an empty object on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, throttle: {} }).success).toBe(false);
    });

    it.each(writeSchemas)('rejects an interval without a strategy on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, throttle: { interval: '5m' } }).success).toBe(false);
    });

    it.each(writeSchemas)('rejects a null interval on %s', (_label, schema) => {
      expect(
        schema.safeParse({ ...base, throttle: { strategy: 'on_status_change', interval: null } })
          .success
      ).toBe(false);
    });

    it.each(writeSchemas)('rejects null on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, throttle: null }).success).toBe(false);
    });

    it.each(writeSchemas)('accepts an intervalless strategy alone on %s', (_label, schema) => {
      expect(
        schema.safeParse({ ...base, throttle: { strategy: 'on_status_change' } }).success
      ).toBe(true);
    });

    it('rejects an interval-only patch', () => {
      expect(
        updateActionPolicyDataSchema.safeParse({ throttle: { interval: '10m' } }).success
      ).toBe(false);
    });

    // The strategy is what makes a throttle meaningful: clear the block, not the leaf.
    it('rejects a null strategy on patch', () => {
      expect(updateActionPolicyDataSchema.safeParse({ throttle: { strategy: null } }).success).toBe(
        false
      );
    });

    it('accepts null on patch, which clears the whole block', () => {
      expect(updateActionPolicyDataSchema.parse({ throttle: null })).toEqual({ throttle: null });
    });
  });

  describe('matcher', () => {
    it.each(writeSchemas)('rejects an empty object on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, matcher: {} }).success).toBe(false);
    });

    it.each(writeSchemas)('rejects null on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, matcher: null }).success).toBe(false);
    });

    it.each(writeSchemas)('rejects a blank expression on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, matcher: { expression: '   ' } }).success).toBe(false);
    });

    it.each(writeSchemas)('accepts one leaf alone on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, matcher: { tags: ['prod'] } }).success).toBe(true);
      expect(schema.safeParse({ ...base, matcher: { expression: 'severity: 1' } }).success).toBe(
        true
      );
    });

    it('accepts an empty object on patch, where it names no leaf and clears nothing', () => {
      expect(updateActionPolicyDataSchema.parse({ matcher: {} })).toEqual({ matcher: {} });
    });

    it('accepts a cleared leaf on patch', () => {
      expect(updateActionPolicyDataSchema.parse({ matcher: { tags: null } })).toEqual({
        matcher: { tags: null },
      });
    });

    it('accepts null on patch, which clears the whole matcher', () => {
      expect(updateActionPolicyDataSchema.parse({ matcher: null })).toEqual({ matcher: null });
    });
  });

  describe('description', () => {
    const { description, ...withoutDescription } = base;

    it.each(writeSchemas)('accepts an omitted description on %s', (_label, schema) => {
      const result = schema.safeParse(withoutDescription);
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('description');
    });

    it.each(writeSchemas)('rejects null on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, description: null }).success).toBe(false);
    });

    it.each(writeSchemas)('rejects an empty or blank description on %s', (_label, schema) => {
      expect(schema.safeParse({ ...base, description: '' }).success).toBe(false);
      expect(schema.safeParse({ ...base, description: '   ' }).success).toBe(false);
    });

    it.each(writeSchemas)('trims the stored description on %s', (_label, schema) => {
      expect(schema.parse({ ...base, description: '  Desc  ' })).toMatchObject({
        description: 'Desc',
      });
    });

    it('accepts null on patch, which clears it', () => {
      expect(updateActionPolicyDataSchema.parse({ description: null })).toEqual({
        description: null,
      });
    });
  });
});

describe('findActionPoliciesRequestSchema', () => {
  it('accepts an empty object', () => {
    expect(findActionPoliciesRequestSchema.parse({})).toEqual({});
  });

  it('accepts valid query params', () => {
    expect(
      findActionPoliciesRequestSchema.parse({
        page: 2,
        per_page: 50,
        filter: 'enabled: true',
        search: 'cpu',
        sort_field: 'name',
        sort_order: 'asc',
      })
    ).toEqual({
      page: 2,
      per_page: 50,
      filter: 'enabled: true',
      search: 'cpu',
      sort_field: 'name',
      sort_order: 'asc',
    });
  });

  it('rejects unknown keys', () => {
    expect(() => findActionPoliciesRequestSchema.parse({ unknown_field: 'x' })).toThrow();
  });

  it('rejects a filter over the maximum KQL length', () => {
    expect(
      findActionPoliciesRequestSchema.safeParse({ filter: 'a'.repeat(MAX_KQL_LENGTH) }).success
    ).toBe(true);

    expect(
      findActionPoliciesRequestSchema.safeParse({ filter: 'a'.repeat(MAX_KQL_LENGTH + 1) }).success
    ).toBe(false);
  });

  it('coerces numeric strings for page and per_page', () => {
    expect(findActionPoliciesRequestSchema.parse({ page: '3', per_page: '10' })).toEqual({
      page: 3,
      per_page: 10,
    });
  });

  it.each([0, 1.5, 'abc', FIND_MAX_RESULT_WINDOW + 1])('rejects page %p', (page) => {
    expect(findActionPoliciesRequestSchema.safeParse({ page }).success).toBe(false);
  });

  it.each([0, 1.5, 101])('rejects per_page %p', (perPage) => {
    expect(findActionPoliciesRequestSchema.safeParse({ per_page: perPage }).success).toBe(false);
  });

  it('rejects a page beyond the result window', () => {
    expect(findActionPoliciesRequestSchema.safeParse({ page: 100, per_page: 100 }).success).toBe(
      true
    );
    expect(findActionPoliciesRequestSchema.safeParse({ page: 101, per_page: 100 }).success).toBe(
      false
    );
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
