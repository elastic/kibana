/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleDataSchema, updateRuleDataSchema } from './rule_data_schema';

const validCreateData = {
  name: 'test rule',
  kind: 'alert' as const,
  schedule: { custom: '5m' },
  query: 'FROM logs-* | LIMIT 1',
  lookbackWindow: '5m',
};

describe('createRuleDataSchema', () => {
  describe('valid payloads', () => {
    it('accepts a minimal valid payload and applies defaults', () => {
      const result = createRuleDataSchema.parse(validCreateData);

      expect(result).toEqual({
        name: 'test rule',
        kind: 'alert',
        tags: [],
        schedule: { custom: '5m' },
        enabled: true,
        query: 'FROM logs-* | LIMIT 1',
        timeField: '@timestamp',
        lookbackWindow: '5m',
        groupingKey: [],
      });
    });

    it('accepts a full payload with all optional fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        tags: ['tag-1', 'tag-2'],
        enabled: false,
        timeField: 'event.created',
        groupingKey: ['host.name'],
        stateTransition: {
          pendingOperator: 'AND',
          pendingCount: 3,
          pendingTimeframe: '10m',
          recoveringOperator: 'OR',
          recoveringCount: 5,
          recoveringTimeframe: '15m',
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          tags: ['tag-1', 'tag-2'],
          enabled: false,
          timeField: 'event.created',
          groupingKey: ['host.name'],
          stateTransition: {
            pendingOperator: 'AND',
            pendingCount: 3,
            pendingTimeframe: '10m',
            recoveringOperator: 'OR',
            recoveringCount: 5,
            recoveringTimeframe: '15m',
          },
        })
      );
    });

    it('accepts kind "signal" without stateTransition', () => {
      const result = createRuleDataSchema.parse({ ...validCreateData, kind: 'signal' });
      expect(result.kind).toBe('signal');
    });

    it('strips unknown properties', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        unknownProp: 'should be removed',
      });

      expect(result).not.toHaveProperty('unknownProp');
    });
  });

  describe('name', () => {
    it('rejects an empty name', () => {
      const result = createRuleDataSchema.safeParse({ ...validCreateData, name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects a name exceeding 64 characters', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        name: 'a'.repeat(65),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('kind', () => {
    it('rejects an invalid kind', () => {
      const result = createRuleDataSchema.safeParse({ ...validCreateData, kind: 'unknown' });
      expect(result.success).toBe(false);
    });
  });

  describe('tags', () => {
    it('rejects tags exceeding 100 items', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        tags: Array.from({ length: 101 }, (_, i) => `tag-${i}`),
      });
      expect(result.success).toBe(false);
    });

    it('rejects a tag exceeding 64 characters', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        tags: ['a'.repeat(65)],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('schedule', () => {
    it('rejects an invalid duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { custom: 'bad' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside schedule (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { custom: '1m', extra: true },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('query', () => {
    it('rejects an empty query', () => {
      const result = createRuleDataSchema.safeParse({ ...validCreateData, query: '' });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL query', () => {
      const result = createRuleDataSchema.safeParse({ ...validCreateData, query: 'FROM |' });
      expect(result.success).toBe(false);
    });
  });

  describe('lookbackWindow', () => {
    it('rejects an invalid duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        lookbackWindow: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('groupingKey', () => {
    it('rejects more than 16 keys', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        groupingKey: Array.from({ length: 17 }, (_, i) => `field-${i}`),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('stateTransition', () => {
    it('accepts an empty stateTransition object', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        stateTransition: {},
      });
      expect(result.stateTransition).toEqual({});
    });

    it('accepts stateTransition with only pending fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        stateTransition: { pendingOperator: 'AND', pendingCount: 2, pendingTimeframe: '10m' },
      });
      expect(result.stateTransition).toEqual({
        pendingOperator: 'AND',
        pendingCount: 2,
        pendingTimeframe: '10m',
      });
    });

    it('accepts stateTransition with only recovering fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        stateTransition: {
          recoveringOperator: 'OR',
          recoveringCount: 5,
          recoveringTimeframe: '15m',
        },
      });
      expect(result.stateTransition).toEqual({
        recoveringOperator: 'OR',
        recoveringCount: 5,
        recoveringTimeframe: '15m',
      });
    });

    it('accepts pendingCount of 0', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        stateTransition: { pendingCount: 0 },
      });
      expect(result.stateTransition?.pendingCount).toBe(0);
    });

    it('accepts recoveringCount of 0', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        stateTransition: { recoveringCount: 0 },
      });
      expect(result.stateTransition?.recoveringCount).toBe(0);
    });

    it('rejects a negative pendingCount', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { pendingCount: -1 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-integer pendingCount', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { pendingCount: 1.5 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a negative recoveringCount', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { recoveringCount: -1 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-integer recoveringCount', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { recoveringCount: 2.5 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid pendingOperator', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { pendingOperator: 'XOR' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid recoveringOperator', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { recoveringOperator: 'NOT' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid pendingTimeframe duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { pendingTimeframe: 'bad' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid recoveringTimeframe duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { recoveringTimeframe: 'bad' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside stateTransition (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        stateTransition: { unknownKey: true },
      });
      expect(result.success).toBe(false);
    });

    it('rejects stateTransition when kind is "signal"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        kind: 'signal',
        stateTransition: { pendingCount: 1 },
      });
      expect(result.success).toBe(false);

      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('stateTransition'));
        expect(issue?.message).toBe('stateTransition is only allowed when kind is "alert".');
      }
    });
  });

  describe('required fields', () => {
    it.each(['name', 'kind', 'schedule', 'query', 'lookbackWindow'] as const)(
      'rejects when required field "%s" is missing',
      (field) => {
        const { [field]: _, ...data } = validCreateData;
        const result = createRuleDataSchema.safeParse(data);
        expect(result.success).toBe(false);
      }
    );
  });
});

describe('updateRuleDataSchema', () => {
  it('accepts an empty payload', () => {
    const result = updateRuleDataSchema.parse({});
    expect(result).toEqual({});
  });

  it('accepts partial updates', () => {
    const result = updateRuleDataSchema.parse({ name: 'updated name' });
    expect(result).toEqual({ name: 'updated name' });
  });

  it('accepts a stateTransition object', () => {
    const result = updateRuleDataSchema.parse({
      stateTransition: { pendingCount: 3, recoveringCount: 5 },
    });
    expect(result.stateTransition).toEqual({ pendingCount: 3, recoveringCount: 5 });
  });

  it('accepts stateTransition set to null (removal)', () => {
    const result = updateRuleDataSchema.parse({ stateTransition: null });
    expect(result.stateTransition).toBeNull();
  });

  it('strips unknown properties', () => {
    const result = updateRuleDataSchema.parse({ unknownProp: 'removed' });
    expect(result).not.toHaveProperty('unknownProp');
  });

  describe('field constraints', () => {
    it('rejects an empty name', () => {
      const result = updateRuleDataSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects a name exceeding 64 characters', () => {
      const result = updateRuleDataSchema.safeParse({ name: 'a'.repeat(65) });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid schedule duration', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { custom: 'bad' } });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid lookbackWindow duration', () => {
      const result = updateRuleDataSchema.safeParse({ lookbackWindow: 'bad' });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL query', () => {
      const result = updateRuleDataSchema.safeParse({ query: 'FROM |' });
      expect(result.success).toBe(false);
    });

    it('rejects more than 100 tags', () => {
      const result = updateRuleDataSchema.safeParse({
        tags: Array.from({ length: 101 }, (_, i) => `tag-${i}`),
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 16 groupingKey entries', () => {
      const result = updateRuleDataSchema.safeParse({
        groupingKey: Array.from({ length: 17 }, (_, i) => `field-${i}`),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('stateTransition constraints', () => {
    it('rejects an invalid pendingOperator', () => {
      const result = updateRuleDataSchema.safeParse({
        stateTransition: { pendingOperator: 'XOR' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-integer pendingCount', () => {
      const result = updateRuleDataSchema.safeParse({
        stateTransition: { pendingCount: 1.5 },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid pendingTimeframe duration', () => {
      const result = updateRuleDataSchema.safeParse({
        stateTransition: { pendingTimeframe: 'bad' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside stateTransition (strict)', () => {
      const result = updateRuleDataSchema.safeParse({
        stateTransition: { unknownKey: true },
      });
      expect(result.success).toBe(false);
    });
  });
});
