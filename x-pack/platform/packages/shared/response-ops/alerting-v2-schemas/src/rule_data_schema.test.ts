/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUNBOOK_ARTIFACT_TYPE, RUNBOOK_CONTENT_LIMIT } from '@kbn/alerting-v2-constants';
import {
  createRuleDataBaseSchema,
  createRuleDataSchema,
  isRecoveryDelayAllowed,
  updateRuleDataSchema,
  IMMUTABLE_RULE_FIELDS,
  getBreachEsqlQuery,
  getRecoverEsqlQuery,
  getNoDataEsqlQuery,
  getRootEsqlQuery,
  bulkGetRulesResponseSchema,
  bulkGetRulesParamsSchema,
  updateRuleBodySchema,
  ruleTagsParamsSchema,
} from './rule_data_schema';
import { tagsResponseSchema } from './common';
import {
  ID_MAX_LENGTH,
  MAX_ARTIFACT_DATA_FIELDS,
  MAX_BULK_ITEMS,
  MAX_FIELD_NAME_LENGTH,
} from './constants';

const validCreateData = {
  kind: 'alert',
  metadata: { name: 'test rule' },
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
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
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
      });
    });

    it('accepts a full payload with all optional fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        metadata: { name: 'test rule', owner: 'team-a', tags: ['label-1', 'label-2'] },
        time_field: 'event.created',
        schedule: { every: '5m', lookback: '10m' },
        recovery_strategy: 'no_breach',
        grouping: { fields: ['host.name'] },
        state_transition: {
          pending_operator: 'AND',
          pending_count: 3,
          pending_timeframe: '10m',
          recovering_operator: 'OR',
          recovering_count: 5,
          recovering_timeframe: '15m',
        },
        artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
      });

      expect(result).toEqual(
        expect.objectContaining({
          metadata: { name: 'test rule', owner: 'team-a', tags: ['label-1', 'label-2'] },
          time_field: 'event.created',
          schedule: { every: '5m', lookback: '10m' },
          recovery_strategy: 'no_breach',
          grouping: { fields: ['host.name'] },
          state_transition: {
            pending_operator: 'AND',
            pending_count: 3,
            pending_timeframe: '10m',
            recovering_operator: 'OR',
            recovering_count: 5,
            recovering_timeframe: '15m',
          },
          artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
        })
      );
    });

    it('accepts kind "signal" without state_transition', () => {
      const result = createRuleDataSchema.parse({ ...validCreateData, kind: 'signal' });
      expect(result.kind).toBe('signal');
    });

    it('rejects unknown top-level fields (strict)', () => {
      expect(() =>
        createRuleDataSchema.parse({
          ...validCreateData,
          unknownProp: 'should be rejected',
        })
      ).toThrow();
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

  describe('query', () => {
    it('rejects an empty breach query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { format: 'standalone', breach: { query: '' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL breach query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { format: 'standalone', breach: { query: 'FROM |' } },
      });
      expect(result.success).toBe(false);
    });

    it('accepts a standalone query with a recovery query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'query',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          recovery: { query: 'FROM logs-* | WHERE status == "ok"' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts recovery_strategy "no_breach" without a recovery block', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'no_breach',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a standalone query with a no_data block', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        no_data_strategy: 'last_known_status',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
        },
      });
      expect(result.query).toEqual({
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 1' },
        no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
      });
    });

    it('rejects no_data_strategy "emit"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data_strategy: 'emit',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts no_data_strategy "last_known_status"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data_strategy: 'last_known_status',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a composed query with breach segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: 'WHERE cpu > 0.9' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a composed query without a breach block', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects a composed query with an empty breach segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: '' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a composed query with a whitespace-only breach segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: ' ' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts recovery_strategy "query" without a composed breach block', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'query',
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          recovery: { segment: 'WHERE cpu < 0.5' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects a composed query with an invalid breach segment (compose fails ES|QL validation)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: 'WHERE (' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a composed query with a whitespace-only recovery segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'query',
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: 'WHERE cpu > 0.9' },
          recovery: { segment: ' ' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a composed query with an invalid recovery segment (compose fails ES|QL validation)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'query',
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: 'WHERE cpu > 0.9' },
          recovery: { segment: 'WHERE (' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts recovery_strategy "no_breach" with a composed query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'no_breach',
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: 'WHERE cpu > 0.9' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a composed query with recovery segment', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        recovery_strategy: 'query',
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: 'WHERE cpu > 0.9' },
          recovery: { segment: 'WHERE cpu <= 0.5' },
        },
      });
      expect(result.query).toMatchObject({
        recovery: { segment: 'WHERE cpu <= 0.5' },
      });
    });

    it('rejects a signal rule with composed format', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        kind: 'signal',
        query: {
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: 'WHERE error == true' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a signal rule with recovery_strategy "query"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        kind: 'signal',
        recovery_strategy: 'query',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          recovery: { query: 'FROM logs-* | WHERE status == "ok"' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a signal rule with recovery_strategy "no_breach"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        kind: 'signal',
        recovery_strategy: 'no_breach',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects recovery_strategy "query" when query.recovery is absent', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'query',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects recovery_strategy "no_breach" when query.recovery is also provided', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'no_breach',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          recovery: { query: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects recovery_strategy "none" when query.recovery is also provided', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'none',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          recovery: { query: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a signal rule with a no_data_strategy', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        kind: 'signal',
        no_data_strategy: 'last_known_status',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects standalone no_data_strategy "recover" when query.no_data is absent', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data_strategy: 'recover',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects standalone no_data_strategy "last_known_status" when query.no_data is absent', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data_strategy: 'last_known_status',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects no_data_strategy "none" when query.no_data is also provided', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data_strategy: 'none',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects standalone query.no_data when no_data_strategy is omitted', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts composed no_data_strategy "recover" without a no_data block', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data_strategy: 'recover',
        query: {
          format: 'composed',
          base: 'FROM metrics-* | STATS AVG(cpu) BY host.name',
          breach: { segment: 'WHERE AVG(cpu) > 0.9' },
        },
      });
      expect(result.success).toBe(true);
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
        recovery_strategy: 'no_breach',
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

  describe('recovery delay allowed', () => {
    it('rejects a recovering_count when recovery_strategy is unset', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_count: 0, recovering_count: 2 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a recovering_count when recovery_strategy is "none"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'none',
        state_transition: { recovering_count: 2 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a recovering_timeframe when recovery is disabled', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'none',
        state_transition: { recovering_timeframe: '5m' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an inert recovery delay even when no_data_strategy is "recover"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'none',
        no_data_strategy: 'recover',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM logs-* | STATS c = COUNT(*)' },
        },
        state_transition: { recovering_count: 2 },
      });

      expect(result.success).toBe(false);
    });

    it('accepts recovering_count of 0 when recovery is disabled', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'none',
        state_transition: { pending_count: 0, recovering_count: 0 },
      });

      expect(result.success).toBe(true);
    });

    it('accepts pending-only state_transition when recovery is disabled', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'none',
        state_transition: { pending_count: 3 },
      });

      expect(result.success).toBe(true);
    });

    it('accepts a recovering delay when recovery_strategy is "no_breach"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery_strategy: 'no_breach',
        state_transition: { recovering_count: 2, recovering_timeframe: '5m' },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('artifacts envelope', () => {
    const parseWithArtifact = (artifact: Record<string, unknown>) =>
      createRuleDataSchema.safeParse({ ...validCreateData, artifacts: [artifact] });

    // How large a value may be depends on the artifact type, so it is bounded
    // server-side where the artifact-type registry is available: by the type's
    // own `dataSchema`, or by a generic per-field ceiling for unregistered types.
    it('does not bound the size of a data value', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { value: 'a'.repeat(100_000) },
      });

      expect(result.success).toBe(true);
    });

    it('accepts runbook-sized content, since per-type limits are registry-enforced', () => {
      const result = parseWithArtifact({
        id: 'runbook-1',
        type: RUNBOOK_ARTIFACT_TYPE,
        data: { content: 'a'.repeat(RUNBOOK_CONTENT_LIMIT) },
      });

      expect(result.success).toBe(true);
    });

    it('does not enforce per-type required fields at the envelope layer', () => {
      const result = parseWithArtifact({
        id: 'runbook-1',
        type: RUNBOOK_ARTIFACT_TYPE,
        data: {},
      });

      expect(result.success).toBe(true);
    });

    it('accepts structured values of any shape', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { count: 12, enabled: true, nested: { a: 'b' }, list: [1, 2, 3] },
      });

      expect(result.success).toBe(true);
    });

    it(`accepts an artifact carrying ${MAX_ARTIFACT_DATA_FIELDS} fields`, () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: Object.fromEntries(
          Array.from({ length: MAX_ARTIFACT_DATA_FIELDS }, (_, index) => [`field-${index}`, 'a'])
        ),
      });

      expect(result.success).toBe(true);
    });

    it('rejects an artifact carrying more fields than the limit', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: Object.fromEntries(
          Array.from({ length: MAX_ARTIFACT_DATA_FIELDS + 1 }, (_, index) => [
            `field-${index}`,
            'a',
          ])
        ),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['artifacts', 0, 'data'],
              message: `Artifact data must have at most ${MAX_ARTIFACT_DATA_FIELDS} fields.`,
            }),
          ])
        );
      }
    });

    it('rejects a field name longer than the limit', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { ['a'.repeat(MAX_FIELD_NAME_LENGTH + 1)]: 'value' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an empty field name', () => {
      const result = parseWithArtifact({ id: 'artifact-1', type: 'host', data: { '': 'value' } });

      expect(result.success).toBe(false);
    });

    it('rejects duplicate artifact ids within the array', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        artifacts: [
          { id: 'same', type: 'host', data: { value: 'a' } },
          { id: 'same', type: 'runbook', data: { content: 'b' } },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['artifacts', 1, 'id'],
              message: 'Artifact id "same" must be unique within the rule.',
            }),
          ])
        );
      }
    });
  });

  describe('required fields', () => {
    it.each(['kind', 'metadata', 'schedule', 'query'] as const)(
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

  it('accepts a non-empty tags update', () => {
    const result = updateRuleDataSchema.parse({ metadata: { tags: ['prod', 'infra'] } });
    expect(result.metadata?.tags).toEqual(['prod', 'infra']);
  });

  it('accepts metadata.tags set to null (clear all tags)', () => {
    const result = updateRuleDataSchema.parse({ metadata: { tags: null } });
    expect(result.metadata?.tags).toBeNull();
  });

  it('rejects metadata.tags as an empty array (use null to clear)', () => {
    const result = updateRuleDataSchema.safeParse({ metadata: { tags: [] } });
    expect(result.success).toBe(false);
  });

  it('accepts artifacts in update payload and supports null removal', () => {
    const withArtifacts = updateRuleDataSchema.parse({
      artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
    });
    expect(withArtifacts).toMatchObject({
      artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
    });

    const nullArtifacts = updateRuleDataSchema.parse({ artifacts: null });
    expect(nullArtifacts).toMatchObject({ artifacts: null });
  });

  it('rejects enabled: true (enabled is not writable via update)', () => {
    const result = updateRuleDataSchema.safeParse({ enabled: true });
    expect(result.success).toBe(false);
  });

  it('rejects enabled: false (enabled is not writable via update)', () => {
    const result = updateRuleDataSchema.safeParse({ enabled: false });
    expect(result.success).toBe(false);
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

  it('accepts a settable no_data_strategy', () => {
    const result = updateRuleDataSchema.parse({ no_data_strategy: 'recover' });
    expect(result.no_data_strategy).toBe('recover');
  });

  it('rejects no_data_strategy "emit"', () => {
    const result = updateRuleDataSchema.safeParse({ no_data_strategy: 'emit' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() => updateRuleDataSchema.parse({ unknownProp: 'rejected' })).toThrow();
  });

  it('rejects unknown keys inside metadata (strict)', () => {
    const result = updateRuleDataSchema.safeParse({
      metadata: { name: 'updated', unknownField: 'x' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys inside schedule (strict)', () => {
    const result = updateRuleDataSchema.safeParse({
      schedule: { every: '5m', extra: true },
    });
    expect(result.success).toBe(false);
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
        query: { format: 'standalone', breach: { query: 'FROM |' } },
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

  describe('artifacts envelope', () => {
    const parseWithArtifact = (artifact: Record<string, unknown>) =>
      updateRuleDataSchema.safeParse({ artifacts: [artifact] });

    it('does not bound the size of a data value', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { value: 'a'.repeat(100_000) },
      });

      expect(result.success).toBe(true);
    });

    it('accepts runbook-sized content, since per-type limits are registry-enforced', () => {
      const result = parseWithArtifact({
        id: 'runbook-1',
        type: RUNBOOK_ARTIFACT_TYPE,
        data: { content: 'a'.repeat(RUNBOOK_CONTENT_LIMIT) },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('artifacts null clearing', () => {
    it('clears artifacts with an explicit null rather than an emptied artifact', () => {
      const result = updateRuleDataSchema.safeParse({ artifacts: null });

      expect(result.success).toBe(true);
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

describe('getBreachEsqlQuery', () => {
  it('returns the breach query verbatim for standalone format', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
    };
    expect(getBreachEsqlQuery(query)).toBe('FROM logs-* | LIMIT 1');
  });

  it('composes base and breach segment for composed format', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9' },
    };
    expect(getBreachEsqlQuery(query)).toBe('FROM metrics-* | WHERE cpu > 0.9');
  });

  it('returns base verbatim when the breach block is omitted', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
    };
    expect(getBreachEsqlQuery(query)).toBe('FROM metrics-*');
  });

  // Storage persists a conditionless composed rule as an empty segment, so
  // both shapes reach this helper and must not append a trailing pipe.
  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('returns base verbatim for a %s stored breach segment', (_label, segment) => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment },
    };
    expect(getBreachEsqlQuery(query)).toBe('FROM metrics-*');
  });

  it('handles a trailing comment in base without corrupting the composed query', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM logs-* // my query',
      breach: { segment: 'WHERE status == "error"' },
    };
    expect(getBreachEsqlQuery(query)).toBe('FROM logs-* | WHERE status == "error"');
  });

  it('handles a segment with multiple pipeline commands', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9 | STATS count = COUNT(*)' },
    };
    expect(getBreachEsqlQuery(query)).toBe(
      'FROM metrics-* | WHERE cpu > 0.9 | STATS count = COUNT(*)'
    );
  });
});

describe('getRecoverEsqlQuery', () => {
  it('returns the recovery query verbatim for standalone format with strategy "query"', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
      recovery: { query: 'FROM logs-* | WHERE status == "ok"' },
    };
    expect(getRecoverEsqlQuery(query, 'query')).toBe('FROM logs-* | WHERE status == "ok"');
  });

  it('returns undefined when standalone has no recovery block', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
    };
    expect(getRecoverEsqlQuery(query, 'query')).toBeUndefined();
  });

  it('returns undefined when recovery_strategy is "no_breach"', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
    };
    expect(getRecoverEsqlQuery(query, 'no_breach')).toBeUndefined();
  });

  it('returns undefined when recovery_strategy is "none"', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
      recovery: { query: 'FROM logs-* | WHERE status == "ok"' },
    };
    expect(getRecoverEsqlQuery(query, 'none')).toBeUndefined();
  });

  it('returns undefined when recovery_strategy is undefined', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
      recovery: { query: 'FROM logs-* | WHERE status == "ok"' },
    };
    expect(getRecoverEsqlQuery(query, undefined)).toBeUndefined();
  });

  it('composes base and recovery segment for composed format with strategy "query"', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9' },
      recovery: { segment: 'WHERE cpu <= 0.9' },
    };
    expect(getRecoverEsqlQuery(query, 'query')).toBe('FROM metrics-* | WHERE cpu <= 0.9');
  });

  it('returns undefined when composed has no recovery block', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9' },
    };
    expect(getRecoverEsqlQuery(query, 'query')).toBeUndefined();
  });

  it('returns undefined when composed recovery_strategy is "no_breach"', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9' },
    };
    expect(getRecoverEsqlQuery(query, 'no_breach')).toBeUndefined();
  });
});

describe('getNoDataEsqlQuery', () => {
  it('returns the no_data query verbatim for standalone format when no_data_strategy is set', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
      no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
    };
    expect(getNoDataEsqlQuery(query, 'emit')).toBe('FROM heartbeat-* | LIMIT 1');
  });

  it('returns base for composed format (base is the data-presence query)', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9' },
    };
    expect(getNoDataEsqlQuery(query, 'emit')).toBe('FROM metrics-*');
  });

  it('returns undefined for composed format when no_data_strategy is "none"', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9' },
    };
    expect(getNoDataEsqlQuery(query, 'none')).toBeUndefined();
  });

  it('returns undefined when no_data_strategy is "none"', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
      no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
    };
    expect(getNoDataEsqlQuery(query, 'none')).toBeUndefined();
  });

  it('returns undefined when no_data_strategy is undefined', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
      no_data: { query: 'FROM heartbeat-* | LIMIT 1' },
    };
    expect(getNoDataEsqlQuery(query, undefined)).toBeUndefined();
  });

  it('returns undefined when no_data block is absent even with active strategy', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
    };
    expect(getNoDataEsqlQuery(query, 'emit')).toBeUndefined();
  });
});

describe('getRootEsqlQuery', () => {
  it('returns base for composed format', () => {
    const query = {
      format: 'composed' as const,
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 0.9' },
    };
    expect(getRootEsqlQuery(query)).toBe('FROM metrics-*');
  });

  it('returns breach.query for standalone format', () => {
    const query = {
      format: 'standalone' as const,
      breach: { query: 'FROM logs-* | LIMIT 1' },
    };
    expect(getRootEsqlQuery(query)).toBe('FROM logs-* | LIMIT 1');
  });
});

describe('updateRuleBodySchema', () => {
  it('accepts a payload without version', () => {
    const result = updateRuleBodySchema.parse({});
    expect(result).toEqual({});
  });

  it('accepts a payload with version', () => {
    const result = updateRuleBodySchema.parse({ version: 'WzEsMV0=' });
    expect(result.version).toBe('WzEsMV0=');
  });

  it('accepts version alongside data fields', () => {
    const result = updateRuleBodySchema.parse({
      version: 'WzEsMV0=',
      metadata: { name: 'updated name' },
    });
    expect(result).toEqual({
      version: 'WzEsMV0=',
      metadata: { name: 'updated name' },
    });
  });

  it('rejects an empty string version', () => {
    expect(() => updateRuleBodySchema.parse({ version: '' })).toThrow();
  });

  it('rejects a version longer than 256 characters', () => {
    expect(() => updateRuleBodySchema.parse({ version: 'x'.repeat(257) })).toThrow();
  });
});

/**
 * These tests are the safety net for {@link IMMUTABLE_RULE_FIELDS}. They keep
 * `upsertRule` (PUT — rejects mutation) and `buildUpdateRuleAttributes`
 * (PATCH — silently preserves) honest as the rule schema evolves.
 */
describe('rule field immutability classification', () => {
  it('IMMUTABLE_RULE_FIELDS only references real top-level schema keys', () => {
    const schemaKeys = new Set<string>(Object.keys(createRuleDataBaseSchema.shape));
    const orphans = IMMUTABLE_RULE_FIELDS.filter((field) => !schemaKeys.has(field));

    expect(orphans).toEqual([]);
  });

  // Tripwire: when a new top-level field is added to the create-rule schema,
  // this snapshot fails. Update the snapshot if the field is meant to be
  // mutable, or add it to IMMUTABLE_RULE_FIELDS if it is meant to be
  // immutable. Either way, the change is visible in the PR diff so reviewers
  // can confirm the classification.
  it('matches the snapshot of mutable top-level rule fields', () => {
    const immutable = new Set<string>(IMMUTABLE_RULE_FIELDS);
    const mutable = Object.keys(createRuleDataBaseSchema.shape)
      .filter((key) => !immutable.has(key))
      .sort();

    expect(mutable).toMatchInlineSnapshot(`
      Array [
        "artifacts",
        "grouping",
        "metadata",
        "no_data_strategy",
        "query",
        "recovery_strategy",
        "schedule",
        "state_transition",
        "time_field",
      ]
    `);
  });
});

describe('bulkGetRulesParamsSchema', () => {
  it('accepts a single id', () => {
    const result = bulkGetRulesParamsSchema.parse({ ids: ['rule-1'] });
    expect(result).toEqual({ ids: ['rule-1'] });
  });

  it('accepts up to MAX_BULK_ITEMS ids', () => {
    const ids = Array.from({ length: MAX_BULK_ITEMS }, (_, i) => `rule-${i}`);
    expect(() => bulkGetRulesParamsSchema.parse({ ids })).not.toThrow();
  });

  it('preserves caller-provided id order (no sorting)', () => {
    const ids = ['rule-z', 'rule-a', 'rule-m'];
    const result = bulkGetRulesParamsSchema.parse({ ids });
    expect(result.ids).toEqual(ids);
  });

  it('trims whitespace around ids', () => {
    const result = bulkGetRulesParamsSchema.parse({ ids: ['  rule-1  '] });
    expect(result.ids).toEqual(['rule-1']);
  });

  it('rejects a missing ids field', () => {
    expect(() => bulkGetRulesParamsSchema.parse({})).toThrow();
  });

  it('rejects an empty ids array', () => {
    expect(() => bulkGetRulesParamsSchema.parse({ ids: [] })).toThrow();
  });

  it('rejects more than MAX_BULK_ITEMS ids', () => {
    const ids = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `rule-${i}`);
    expect(() => bulkGetRulesParamsSchema.parse({ ids })).toThrow();
  });

  it('rejects an id longer than ID_MAX_LENGTH', () => {
    const tooLong = 'a'.repeat(ID_MAX_LENGTH + 1);
    expect(() => bulkGetRulesParamsSchema.parse({ ids: [tooLong] })).toThrow();
  });

  it('rejects an empty-string id', () => {
    expect(() => bulkGetRulesParamsSchema.parse({ ids: [''] })).toThrow();
  });

  it('rejects a whitespace-only id (after trim it is empty)', () => {
    expect(() => bulkGetRulesParamsSchema.parse({ ids: ['   '] })).toThrow();
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() => bulkGetRulesParamsSchema.parse({ ids: ['rule-1'], foo: 'bar' })).toThrow();
  });
});

describe('bulkGetRulesResponseSchema', () => {
  const sampleRule = {
    id: 'rule-1',
    kind: 'alert' as const,
    metadata: { name: 'r', version: 1 },
    time_field: '@timestamp',
    schedule: { every: '5m' },
    query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
    enabled: true,
    created_by: 'user-a',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'user-a',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('accepts an empty rules array', () => {
    const result = bulkGetRulesResponseSchema.parse({ rules: [] });
    expect(result).toEqual({ rules: [] });
  });

  it('accepts a populated rules array', () => {
    const result = bulkGetRulesResponseSchema.parse({ rules: [sampleRule] });
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]).toEqual(expect.objectContaining({ id: 'rule-1' }));
  });

  it('rejects a missing rules field', () => {
    expect(() => bulkGetRulesResponseSchema.parse({})).toThrow();
  });
});

describe('ruleTagsParamsSchema', () => {
  it('accepts an empty object', () => {
    expect(ruleTagsParamsSchema.parse({})).toEqual({});
  });

  it('accepts valid search and kind', () => {
    expect(ruleTagsParamsSchema.parse({ search: 'cpu', kind: 'alert' })).toEqual({
      search: 'cpu',
      kind: 'alert',
    });
  });

  it('accepts kind: signal', () => {
    expect(ruleTagsParamsSchema.parse({ kind: 'signal' })).toEqual({ kind: 'signal' });
  });

  it('rejects search longer than 256 characters', () => {
    expect(() => ruleTagsParamsSchema.parse({ search: 'a'.repeat(257) })).toThrow();
  });

  it('rejects invalid kind', () => {
    expect(() => ruleTagsParamsSchema.parse({ kind: 'unknown' })).toThrow();
  });

  it('rejects the removed filter key', () => {
    expect(() => ruleTagsParamsSchema.parse({ filter: 'kind:alert' })).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => ruleTagsParamsSchema.parse({ foo: 'bar' })).toThrow();
  });
});

describe('tagsResponseSchema', () => {
  it('accepts a tags array', () => {
    expect(tagsResponseSchema.parse({ tags: ['a', 'b'] })).toEqual({ tags: ['a', 'b'] });
  });

  it('accepts an empty tags array', () => {
    expect(tagsResponseSchema.parse({ tags: [] })).toEqual({ tags: [] });
  });

  it('rejects a missing tags field', () => {
    expect(() => tagsResponseSchema.parse({})).toThrow();
  });
});

describe('isRecoveryDelayAllowed', () => {
  it('returns true when recovery is enabled, regardless of recovering delay', () => {
    expect(
      isRecoveryDelayAllowed({
        recovery_strategy: 'no_breach',
        state_transition: { recovering_count: 3, recovering_timeframe: '5m' },
      })
    ).toBe(true);
    expect(
      isRecoveryDelayAllowed({
        recovery_strategy: 'query',
        state_transition: { recovering_count: 3 },
      })
    ).toBe(true);
  });

  it('returns true when recovery is disabled but no recovering delay is set', () => {
    expect(isRecoveryDelayAllowed({ recovery_strategy: 'none' })).toBe(true);
    expect(isRecoveryDelayAllowed({ recovery_strategy: null })).toBe(true);
    expect(isRecoveryDelayAllowed({})).toBe(true);
    expect(isRecoveryDelayAllowed({ recovery_strategy: 'none', state_transition: {} })).toBe(true);
  });

  it('treats recovering_count 0 as no delay even when recovery is disabled', () => {
    expect(
      isRecoveryDelayAllowed({
        recovery_strategy: 'none',
        state_transition: { recovering_count: 0 },
      })
    ).toBe(true);
  });

  it('returns false for a positive recovering delay when recovery is disabled', () => {
    expect(
      isRecoveryDelayAllowed({
        recovery_strategy: 'none',
        state_transition: { recovering_count: 1 },
      })
    ).toBe(false);
    expect(
      isRecoveryDelayAllowed({
        recovery_strategy: null,
        state_transition: { recovering_timeframe: '5m' },
      })
    ).toBe(false);
    expect(isRecoveryDelayAllowed({ state_transition: { recovering_count: 2 } })).toBe(false);
  });
});
