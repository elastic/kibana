/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleDataSchema, updateRuleDataSchema } from './rule_data_schema';

const validCreateData = {
  kind: 'alert',
  metadata: { name: 'test rule' },
  schedule: { every: '5m' },
  evaluation: { query: { base: 'FROM logs-* | LIMIT 1', condition: 'count > 0' } },
};

describe('createRuleDataSchema', () => {
  describe('valid payloads', () => {
    it('accepts a minimal valid payload and applies defaults', () => {
      const result = createRuleDataSchema.parse(validCreateData);

      expect(result).toEqual({
        kind: 'alert',
        metadata: { name: 'test rule' },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        evaluation: { query: { base: 'FROM logs-* | LIMIT 1', condition: 'count > 0' } },
      });
    });

    it('accepts a full payload with all optional fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        metadata: { name: 'test rule', owner: 'team-a', labels: ['label-1', 'label-2'] },
        time_field: 'event.created',
        schedule: { every: '5m', lookback: '10m' },
        grouping: { fields: ['host.name'] },
        recovery_policy: { type: 'no_breach' },
        no_data: { behavior: 'recover', timeframe: '15m' },
        state_transition: {
          pending_operator: 'AND',
          pending_count: 3,
          pending_timeframe: '10m',
          recovering_operator: 'OR',
          recovering_count: 5,
          recovering_timeframe: '15m',
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          metadata: { name: 'test rule', owner: 'team-a', labels: ['label-1', 'label-2'] },
          time_field: 'event.created',
          schedule: { every: '5m', lookback: '10m' },
          grouping: { fields: ['host.name'] },
          state_transition: {
            pending_operator: 'AND',
            pending_count: 3,
            pending_timeframe: '10m',
            recovering_operator: 'OR',
            recovering_count: 5,
            recovering_timeframe: '15m',
          },
        })
      );
    });

    it('accepts kind "signal" without state_transition', () => {
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

  describe('metadata.name', () => {
    it('rejects an empty name', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: { name: '' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a name exceeding 256 characters', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: { name: 'a'.repeat(257) },
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

  describe('metadata.labels', () => {
    it('rejects labels exceeding 100 items', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: {
          name: 'test rule',
          labels: Array.from({ length: 101 }, (_, i) => `label-${i}`),
        },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a label exceeding 64 characters', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: { name: 'test rule', labels: ['a'.repeat(65)] },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('schedule', () => {
    it('rejects an invalid duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: 'bad' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside schedule', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '1m', extra: true },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('evaluation.query.base', () => {
    it('rejects an empty query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        evaluation: { query: { base: '', condition: 'count > 0' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        evaluation: { query: { base: 'FROM |', condition: 'count > 0' } },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('schedule.lookback', () => {
    it('rejects an invalid duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '5m', lookback: 'invalid' },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('grouping.fields', () => {
    it('rejects more than 16 keys', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        grouping: { fields: Array.from({ length: 17 }, (_, i) => `field-${i}`) },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('state_transition', () => {
    it('accepts an empty state_transition object', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: {},
      });

      expect(result.state_transition).toEqual({});
    });

    it('accepts state_transition with only pending fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: {
          pending_operator: 'AND',
          pending_count: 2,
          pending_timeframe: '10m',
        },
      });

      expect(result.state_transition).toEqual({
        pending_operator: 'AND',
        pending_count: 2,
        pending_timeframe: '10m',
      });
    });

    it('accepts state_transition with only recovering fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: {
          recovering_operator: 'OR',
          recovering_count: 5,
          recovering_timeframe: '15m',
        },
      });

      expect(result.state_transition).toEqual({
        recovering_operator: 'OR',
        recovering_count: 5,
        recovering_timeframe: '15m',
      });
    });

    it('accepts pending_count of 0', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: { pending_count: 0 },
      });

      expect(result.state_transition?.pending_count).toBe(0);
    });

    it('accepts recovering_count of 0', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: { recovering_count: 0 },
      });

      expect(result.state_transition?.recovering_count).toBe(0);
    });

    it('rejects a negative pending_count', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_count: -1 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a non-integer pending_count', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_count: 1.5 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a negative recovering_count', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { recovering_count: -1 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a non-integer recovering_count', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { recovering_count: 2.5 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid pending_operator', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_operator: 'XOR' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid recovering_operator', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { recovering_operator: 'NOT' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid pending_timeframe duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_timeframe: 'bad' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid recovering_timeframe duration', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { recovering_timeframe: 'bad' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside state_transition (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { unknownKey: true },
      });

      expect(result.success).toBe(false);
    });

    it('rejects state_transition when kind is "signal"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        kind: 'signal',
        state_transition: { pending_count: 1 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('required fields', () => {
    it.each(['kind', 'metadata', 'schedule', 'evaluation'] as const)(
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
    const result = updateRuleDataSchema.parse({ metadata: { name: 'updated name' } });
    expect(result).toEqual({ metadata: { name: 'updated name' } });
  });

  it('accepts a state_transition object', () => {
    const result = updateRuleDataSchema.parse({
      state_transition: { pending_count: 3, recovering_count: 5 },
    });

    expect(result.state_transition).toEqual({ pending_count: 3, recovering_count: 5 });
  });

  it('accepts state_transition set to null (removal)', () => {
    const result = updateRuleDataSchema.parse({ state_transition: null });
    expect(result.state_transition).toBeNull();
  });

  it('strips unknown properties', () => {
    const result = updateRuleDataSchema.parse({ unknownProp: 'removed' });
    expect(result).not.toHaveProperty('unknownProp');
  });

  describe('field constraints', () => {
    it('rejects an empty name', () => {
      const result = updateRuleDataSchema.safeParse({ metadata: { name: '' } });
      expect(result.success).toBe(false);
    });

    it('rejects a name exceeding 256 characters', () => {
      const result = updateRuleDataSchema.safeParse({
        metadata: { name: 'a'.repeat(257) },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid schedule duration', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { every: 'bad' } });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid lookback duration', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { lookback: 'bad' } });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL query', () => {
      const result = updateRuleDataSchema.safeParse({
        evaluation: { query: { base: 'FROM |' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 100 labels', () => {
      const result = updateRuleDataSchema.safeParse({
        metadata: { labels: Array.from({ length: 101 }, (_, i) => `label-${i}`) },
      });

      expect(result.success).toBe(false);
    });

    it('rejects more than 16 grouping fields', () => {
      const result = updateRuleDataSchema.safeParse({
        grouping: { fields: Array.from({ length: 17 }, (_, i) => `field-${i}`) },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('state_transition constraints', () => {
    it('rejects an invalid pending_operator', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending_operator: 'XOR' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a non-integer pending_count', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending_count: 1.5 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid pending_timeframe duration', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending_timeframe: 'bad' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside state_transition (strict)', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { unknownKey: true },
      });

      expect(result.success).toBe(false);
    });
  });
});
