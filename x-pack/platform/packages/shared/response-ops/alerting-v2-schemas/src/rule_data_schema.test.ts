/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ARTIFACT_VALUE_LIMIT,
  ARTIFACT_VALUE_LIMITS,
  RUNBOOK_ARTIFACT_TYPE,
} from '@kbn/alerting-v2-constants';
import { createRuleDataSchema, updateRuleDataSchema } from './rule_data_schema';

const validCreateData = {
  kind: 'alert',
  metadata: { name: 'test rule' },
  schedule: { every: '5m' },
  evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
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
        evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
      });
    });

    it('accepts a full payload with all optional fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        metadata: { name: 'test rule', owner: 'team-a', tags: ['label-1', 'label-2'] },
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
        artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }],
      });

      expect(result).toEqual(
        expect.objectContaining({
          metadata: { name: 'test rule', owner: 'team-a', tags: ['label-1', 'label-2'] },
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
          artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }],
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

  describe('metadata.description', () => {
    it('accepts a valid description', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        metadata: { name: 'test rule', description: 'A useful description' },
      });

      expect(result.metadata.description).toBe('A useful description');
    });

    it('accepts metadata without description (optional)', () => {
      const result = createRuleDataSchema.parse(validCreateData);

      expect(result.metadata.description).toBeUndefined();
    });

    it('rejects a description exceeding 1024 characters', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: { name: 'test rule', description: 'a'.repeat(1025) },
      });

      expect(result.success).toBe(false);
    });

    it('accepts a description at the 1024 character limit', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        metadata: { name: 'test rule', description: 'a'.repeat(1024) },
      });

      expect(result.metadata.description).toHaveLength(1024);
    });
  });

  describe('metadata.tags', () => {
    it('rejects tags exceeding 20 items', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: {
          name: 'test rule',
          tags: Array.from({ length: 21 }, (_, i) => `label-${i}`),
        },
      });

      expect(result.success).toBe(false);
    });

    it('accepts up to 20 tags', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: {
          name: 'test rule',
          tags: Array.from({ length: 20 }, (_, i) => `label-${i}`),
        },
      });

      expect(result.success).toBe(true);
    });

    it('rejects a label exceeding 128 characters', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: { name: 'test rule', tags: ['a'.repeat(129)] },
      });

      expect(result.success).toBe(false);
    });

    it('accepts a label at the 128 character limit', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        metadata: { name: 'test rule', tags: ['a'.repeat(128)] },
      });

      expect(result.success).toBe(true);
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

    it('accepts schedule.every of exactly 5s (minimum)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '5s' },
      });

      expect(result.success).toBe(true);
    });

    it('rejects schedule.every below 5s (4s)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '4s' },
      });

      expect(result.success).toBe(false);
    });

    it('accepts schedule.every of exactly 365d (maximum)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '365d' },
      });

      expect(result.success).toBe(true);
    });

    it('rejects schedule.every exceeding 365d', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '366d' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects schedule.every exceeding 365d via cross-unit (55w)', () => {
      // 55 weeks = 385 days > 365 days
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '55w' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects schedule.lookback exceeding 365d', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        schedule: { every: '5m', lookback: '366d' },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('evaluation.query.base', () => {
    it('rejects an empty query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        evaluation: { query: { base: '' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        evaluation: { query: { base: 'FROM |' } },
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

    it('rejects pending_count greater than 1000', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_count: 1001 },
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

    it('rejects recovering_count greater than 1000', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { recovering_count: 1001 },
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

    it('rejects pending_timeframe exceeding 365d', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_timeframe: '366d' },
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

    it('rejects recovering_timeframe exceeding 365d', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { recovering_timeframe: '366d' },
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

  describe('recovery_policy', () => {
    it('accepts recovery_policy with type "no_breach"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_policy: { type: 'no_breach' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts recovery_policy with type "query" when query.base is provided', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_policy: {
          type: 'query',
          query: { base: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects recovery_policy with type "query" when query is missing', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_policy: { type: 'query' },
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(['recovery_policy', 'query', 'base']);
    });

    it('rejects recovery_policy with type "query" when query.base is missing', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_policy: { type: 'query', query: {} },
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toEqual(['recovery_policy', 'query', 'base']);
    });

    it('rejects recovery_policy with type "query" when query.base is empty', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_policy: { type: 'query', query: { base: '' } },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('artifacts value length', () => {
    it('accepts a runbook artifact at the maximum allowed length', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        artifacts: [
          {
            id: 'runbook-1',
            type: RUNBOOK_ARTIFACT_TYPE,
            value: 'a'.repeat(ARTIFACT_VALUE_LIMITS[RUNBOOK_ARTIFACT_TYPE]),
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects a runbook artifact exceeding the maximum allowed length', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        artifacts: [
          {
            id: 'runbook-1',
            type: RUNBOOK_ARTIFACT_TYPE,
            value: 'a'.repeat(ARTIFACT_VALUE_LIMITS[RUNBOOK_ARTIFACT_TYPE] + 1),
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: `Artifact value must be at most ${ARTIFACT_VALUE_LIMITS[RUNBOOK_ARTIFACT_TYPE]} characters for type "${RUNBOOK_ARTIFACT_TYPE}".`,
            }),
          ])
        );
      }
    });

    it('accepts a non-runbook artifact at the default maximum length', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        artifacts: [
          {
            id: 'artifact-1',
            type: 'host',
            value: 'a'.repeat(DEFAULT_ARTIFACT_VALUE_LIMIT),
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-runbook artifact exceeding the default maximum length', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        artifacts: [
          {
            id: 'artifact-1',
            type: 'host',
            value: 'a'.repeat(DEFAULT_ARTIFACT_VALUE_LIMIT + 1),
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining(
                `Artifact value must be at most ${DEFAULT_ARTIFACT_VALUE_LIMIT} characters`
              ),
            }),
          ])
        );
      }
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

  it('accepts a description update', () => {
    const result = updateRuleDataSchema.parse({
      metadata: { description: 'updated description' },
    });
    expect(result.metadata?.description).toBe('updated description');
  });

  it('accepts artifacts in update payload and supports null removal', () => {
    const withArtifacts = updateRuleDataSchema.parse({
      artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }],
    });
    expect(withArtifacts).toMatchObject({
      artifacts: [{ id: 'artifact-1', type: 'host', value: 'host-a' }],
    });

    const nullArtifacts = updateRuleDataSchema.parse({ artifacts: null });
    expect(nullArtifacts).toMatchObject({ artifacts: null });
  });

  it('accepts an enabled field set to true', () => {
    const result = updateRuleDataSchema.parse({ enabled: true });
    expect(result).toEqual({ enabled: true });
  });

  it('accepts an enabled field set to false', () => {
    const result = updateRuleDataSchema.parse({ enabled: false });
    expect(result).toEqual({ enabled: false });
  });

  it('omits enabled when not provided', () => {
    const result = updateRuleDataSchema.parse({});
    expect(result).not.toHaveProperty('enabled');
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

    it('rejects a description exceeding 1024 characters', () => {
      const result = updateRuleDataSchema.safeParse({
        metadata: { description: 'a'.repeat(1025) },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid schedule duration', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { every: 'bad' } });
      expect(result.success).toBe(false);
    });

    it('rejects schedule.every below 5s (4s)', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { every: '4s' } });
      expect(result.success).toBe(false);
    });

    it('rejects schedule.every exceeding 365d', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { every: '366d' } });
      expect(result.success).toBe(false);
    });

    it('rejects schedule.every exceeding 365d via cross-unit (55w)', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { every: '55w' } });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid lookback duration', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { lookback: 'bad' } });
      expect(result.success).toBe(false);
    });

    it('rejects schedule.lookback exceeding 365d', () => {
      const result = updateRuleDataSchema.safeParse({ schedule: { lookback: '366d' } });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL query', () => {
      const result = updateRuleDataSchema.safeParse({
        evaluation: { query: { base: 'FROM |' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 20 tags', () => {
      const result = updateRuleDataSchema.safeParse({
        metadata: { tags: Array.from({ length: 21 }, (_, i) => `label-${i}`) },
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

  describe('artifacts value length', () => {
    it('accepts a runbook artifact at the maximum allowed length', () => {
      const result = updateRuleDataSchema.safeParse({
        artifacts: [
          {
            id: 'runbook-1',
            type: RUNBOOK_ARTIFACT_TYPE,
            value: 'a'.repeat(ARTIFACT_VALUE_LIMITS[RUNBOOK_ARTIFACT_TYPE]),
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects a runbook artifact exceeding the maximum allowed length', () => {
      const result = updateRuleDataSchema.safeParse({
        artifacts: [
          {
            id: 'runbook-1',
            type: RUNBOOK_ARTIFACT_TYPE,
            value: 'a'.repeat(ARTIFACT_VALUE_LIMITS[RUNBOOK_ARTIFACT_TYPE] + 1),
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: `Artifact value must be at most ${ARTIFACT_VALUE_LIMITS[RUNBOOK_ARTIFACT_TYPE]} characters for type "${RUNBOOK_ARTIFACT_TYPE}".`,
            }),
          ])
        );
      }
    });

    it('accepts a non-runbook artifact at the default maximum length', () => {
      const result = updateRuleDataSchema.safeParse({
        artifacts: [
          {
            id: 'artifact-1',
            type: 'host',
            value: 'a'.repeat(DEFAULT_ARTIFACT_VALUE_LIMIT),
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-runbook artifact exceeding the default maximum length', () => {
      const result = updateRuleDataSchema.safeParse({
        artifacts: [
          {
            id: 'artifact-1',
            type: 'host',
            value: 'a'.repeat(DEFAULT_ARTIFACT_VALUE_LIMIT + 1),
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining(
                `Artifact value must be at most ${DEFAULT_ARTIFACT_VALUE_LIMIT} characters`
              ),
            }),
          ])
        );
      }
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

    it('rejects pending_count greater than 1000', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending_count: 1001 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects recovering_count greater than 1000', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { recovering_count: 1001 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid pending_timeframe duration', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending_timeframe: 'bad' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects pending_timeframe exceeding 365d', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending_timeframe: '366d' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects recovering_timeframe exceeding 365d', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { recovering_timeframe: '366d' },
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
