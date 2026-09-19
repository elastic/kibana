/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { RUNBOOK_ARTIFACT_TYPE, RUNBOOK_CONTENT_LIMIT } from '@kbn/alerting-v2-constants';
import { z } from '@kbn/zod/v4';
import {
  createRuleDataBaseSchema,
  createRuleDataSchema,
  isLifecycleConfigAllowedForKind,
  isRecoveryConditionUsableWithBreach,
  isRecoveryTransitionConsistentWithStrategy,
  isStateTransitionAllowed,
  updateRuleDataSchema,
  IMMUTABLE_RULE_FIELDS,
  getBreachEsqlQuery,
  getRecoverEsqlQuery,
  getNoDataEsqlQuery,
  getRootEsqlQuery,
  bulkGetRulesResponseSchema,
  bulkGetRulesParamsSchema,
  bulkCreateRulesRequestSchema,
  bulkCreateRulesResponseSchema,
  updateRuleBodySchema,
  ruleTagsParamsSchema,
  findRulesRequestSchema,
} from './rule_data_schema';
import { tagsResponseSchema } from './common';
import {
  FIND_MAX_RESULT_WINDOW,
  ID_MAX_LENGTH,
  MAX_ARTIFACT_DATA_FIELDS,
  MAX_ARTIFACT_DATA_LENGTH,
  MAX_BULK_ITEMS,
  MAX_ESQL_QUERY_LENGTH,
  MAX_FIELD_NAME_LENGTH,
} from './constants';

const validRuleFields = {
  metadata: { name: 'test rule' },
  schedule: { every: '5m' },
  query: { base: 'FROM logs-* | LIMIT 1' },
};

const validCreateData = {
  kind: 'alert',
  ...validRuleFields,
  recovery: { strategy: 'no_breach' },
  no_data: { strategy: 'ignore' },
};

const validSignalCreateData = {
  kind: 'signal',
  ...validRuleFields,
};

const composedQuery = {
  base: 'FROM metrics-*',
  breach: { segment: 'WHERE cpu > 0.9' },
};

// Parses as a string but not as ES|QL, so it reaches the parser and fails there.
const UNPARSEABLE_ESQL = 'WHERE (';

describe('createRuleDataSchema', () => {
  describe('valid payloads', () => {
    it('accepts a minimal valid payload and applies defaults', () => {
      const result = createRuleDataSchema.parse(validCreateData);

      expect(result).toEqual({
        kind: 'alert',
        metadata: { name: 'test rule' },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        query: { base: 'FROM logs-* | LIMIT 1' },
        recovery: { strategy: 'no_breach' },
        no_data: { strategy: 'ignore' },
      });
    });

    it('accepts a full payload with all optional fields', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        metadata: { name: 'test rule', owner: 'team-a', tags: ['label-1', 'label-2'] },
        time_field: 'event.created',
        schedule: { every: '5m', lookback: '10m' },
        query: composedQuery,
        recovery: { strategy: 'condition', segment: 'WHERE cpu < 0.6' },
        no_data: { strategy: 'keep_last', query: 'FROM heartbeat-* | LIMIT 1' },
        grouping: { fields: ['host.name'] },
        state_transition: {
          pending: { operator: 'AND', count: 3, timeframe: '10m' },
          recovering: { operator: 'OR', count: 5, timeframe: '15m' },
        },
        artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
      });

      expect(result).toEqual(
        expect.objectContaining({
          metadata: { name: 'test rule', owner: 'team-a', tags: ['label-1', 'label-2'] },
          time_field: 'event.created',
          schedule: { every: '5m', lookback: '10m' },
          query: composedQuery,
          recovery: { strategy: 'condition', segment: 'WHERE cpu < 0.6' },
          no_data: { strategy: 'keep_last', query: 'FROM heartbeat-* | LIMIT 1' },
          grouping: { fields: ['host.name'] },
          state_transition: {
            pending: { operator: 'AND', count: 3, timeframe: '10m' },
            recovering: { operator: 'OR', count: 5, timeframe: '15m' },
          },
          artifacts: [{ id: 'artifact-1', type: 'host', data: { value: 'host-a' } }],
        })
      );
    });

    it('accepts kind "signal" without lifecycle configuration', () => {
      const result = createRuleDataSchema.parse(validSignalCreateData);
      expect(result.kind).toBe('signal');
    });

    it.each(['recovery', 'no_data'] as const)(
      'rejects an alert rule that omits %s',
      (lifecycleField) => {
        const { [lifecycleField]: _omitted, ...withoutField } = validCreateData;
        const result = createRuleDataSchema.safeParse(withoutField);

        expect(result.success).toBe(false);
      }
    );

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
    it('rejects a missing base', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { breach: { segment: 'WHERE cpu > 0.9' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an empty base', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: '' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid ES|QL base', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM |' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts a base without a breach block', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM metrics-*' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a base with a breach segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: composedQuery,
      });
      expect(result.success).toBe(true);
    });

    it('rejects an empty breach segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM metrics-*', breach: { segment: '' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a whitespace-only breach segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM metrics-*', breach: { segment: ' ' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a breach segment that does not compose into valid ES|QL', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM metrics-*', breach: { segment: UNPARSEABLE_ESQL } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside query (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM metrics-*', unknownKey: 'x' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside query.breach (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM metrics-*', breach: { segment: 'WHERE cpu > 0.9', unknownKey: 'x' } },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('recovery', () => {
    it('accepts strategy "no_breach"', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        query: composedQuery,
        recovery: { strategy: 'no_breach' },
      });
      expect(result.recovery).toEqual({ strategy: 'no_breach' });
    });

    it('accepts strategy "condition" when the query has a breach segment', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        query: composedQuery,
        recovery: { strategy: 'condition', segment: 'WHERE cpu <= 0.5' },
      });
      expect(result.recovery).toEqual({ strategy: 'condition', segment: 'WHERE cpu <= 0.5' });
    });

    it('rejects strategy "condition" when the query has no breach segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: { base: 'FROM metrics-*' },
        recovery: { strategy: 'condition', segment: 'WHERE cpu <= 0.5' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects strategy "condition" without a segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: composedQuery,
        recovery: { strategy: 'condition' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a whitespace-only condition segment', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: composedQuery,
        recovery: { strategy: 'condition', segment: ' ' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a condition segment that does not compose into valid ES|QL', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        query: composedQuery,
        recovery: { strategy: 'condition', segment: UNPARSEABLE_ESQL },
      });
      expect(result.success).toBe(false);
    });

    it('accepts strategy "query" with an independent recovery query', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        recovery: { strategy: 'query', query: 'FROM logs-* | WHERE status == "ok"' },
      });
      expect(result.recovery).toEqual({
        strategy: 'query',
        query: 'FROM logs-* | WHERE status == "ok"',
      });
    });

    it('rejects strategy "query" without a query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'query' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects strategy "query" with an invalid ES|QL query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'query', query: 'FROM |' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts strategy "manual"', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        recovery: { strategy: 'manual' },
      });
      expect(result.recovery).toEqual({ strategy: 'manual' });
    });

    it.each(['no_breach', 'manual'] as const)(
      'rejects extra keys alongside strategy "%s" (strict)',
      (strategy) => {
        const result = createRuleDataSchema.safeParse({
          ...validCreateData,
          recovery: { strategy, segment: 'WHERE cpu <= 0.5' },
        });
        expect(result.success).toBe(false);
      }
    );

    it('rejects an unknown strategy', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'none' },
      });
      expect(result.success).toBe(false);
    });

    it.each([
      ['no_breach', { strategy: 'no_breach' }],
      ['condition', { strategy: 'condition', segment: 'WHERE cpu <= 0.5' }],
      ['query', { strategy: 'query', query: 'FROM logs-* | WHERE status == "ok"' }],
      ['manual', { strategy: 'manual' }],
    ])('rejects a signal rule carrying recovery strategy "%s"', (_label, recovery) => {
      const result = createRuleDataSchema.safeParse({
        ...validSignalCreateData,
        query: composedQuery,
        recovery,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('no_data', () => {
    it('accepts strategy "ignore"', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        no_data: { strategy: 'ignore' },
      });
      expect(result.no_data).toEqual({ strategy: 'ignore' });
    });

    it('rejects a presence query alongside strategy "ignore" (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data: { strategy: 'ignore', query: 'FROM heartbeat-* | LIMIT 1' },
      });
      expect(result.success).toBe(false);
    });

    it.each(['keep_last', 'resolve', 'alert'] as const)(
      'accepts strategy "%s" without a presence query',
      (strategy) => {
        const result = createRuleDataSchema.parse({
          ...validCreateData,
          no_data: { strategy },
        });
        expect(result.no_data).toEqual({ strategy });
      }
    );

    it.each(['keep_last', 'resolve', 'alert'] as const)(
      'accepts strategy "%s" with a presence query',
      (strategy) => {
        const result = createRuleDataSchema.parse({
          ...validCreateData,
          no_data: { strategy, query: 'FROM heartbeat-* | LIMIT 1' },
        });
        expect(result.no_data).toEqual({ strategy, query: 'FROM heartbeat-* | LIMIT 1' });
      }
    );

    it('rejects an invalid ES|QL presence query', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data: { strategy: 'resolve', query: 'FROM |' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keys alongside a classifying strategy (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        no_data: { strategy: 'keep_last', unknownKey: 'x' },
      });
      expect(result.success).toBe(false);
    });

    it.each(['none', 'last_known_status', 'emit', 'recover'])(
      'rejects the removed strategy "%s"',
      (strategy) => {
        const result = createRuleDataSchema.safeParse({
          ...validCreateData,
          no_data: { strategy },
        });
        expect(result.success).toBe(false);
      }
    );

    it.each(['ignore', 'keep_last', 'resolve', 'alert'] as const)(
      'rejects a signal rule carrying no_data strategy "%s"',
      (strategy) => {
        const result = createRuleDataSchema.safeParse({
          ...validSignalCreateData,
          no_data: { strategy },
        });
        expect(result.success).toBe(false);
      }
    );
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

    it('accepts state_transition set to null', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: null,
      });

      expect(result.state_transition).toBeNull();
    });

    it('accepts state_transition with only a pending phase', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: { pending: { operator: 'AND', count: 2, timeframe: '10m' } },
      });

      expect(result.state_transition).toEqual({
        pending: { operator: 'AND', count: 2, timeframe: '10m' },
      });
    });

    it('accepts state_transition with only a recovering phase', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        recovery: { strategy: 'no_breach' },
        state_transition: { recovering: { operator: 'OR', count: 5, timeframe: '15m' } },
      });

      expect(result.state_transition).toEqual({
        recovering: { operator: 'OR', count: 5, timeframe: '15m' },
      });
    });

    it('accepts pending.count of 0', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        state_transition: { pending: { count: 0 } },
      });

      expect(result.state_transition?.pending?.count).toBe(0);
    });

    it('accepts recovering.count of 0', () => {
      const result = createRuleDataSchema.parse({
        ...validCreateData,
        recovery: { strategy: 'no_breach' },
        state_transition: { recovering: { count: 0 } },
      });

      expect(result.state_transition?.recovering?.count).toBe(0);
    });

    it.each(['pending', 'recovering'] as const)('rejects a negative %s.count', (phase) => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { [phase]: { count: -1 } },
      });

      expect(result.success).toBe(false);
    });

    it.each(['pending', 'recovering'] as const)('rejects a non-integer %s.count', (phase) => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { [phase]: { count: 1.5 } },
      });

      expect(result.success).toBe(false);
    });

    it.each(['pending', 'recovering'] as const)('rejects a %s.count greater than 1000', (phase) => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { [phase]: { count: 1001 } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid pending.operator', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending: { operator: 'XOR', count: 2, timeframe: '5m' } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid recovering.operator', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { recovering: { operator: 'NOT', count: 2, timeframe: '5m' } },
      });

      expect(result.success).toBe(false);
    });

    it.each(['pending', 'recovering'] as const)(
      'rejects a %s.operator set without a count',
      (phase) => {
        const result = createRuleDataSchema.safeParse({
          ...validCreateData,
          state_transition: { [phase]: { operator: 'AND', timeframe: '5m' } },
        });

        expect(result.success).toBe(false);
      }
    );

    it.each(['pending', 'recovering'] as const)(
      'rejects a %s.operator set without a timeframe',
      (phase) => {
        const result = createRuleDataSchema.safeParse({
          ...validCreateData,
          state_transition: { [phase]: { operator: 'AND', count: 2 } },
        });

        expect(result.success).toBe(false);
      }
    );

    it.each(['pending', 'recovering'] as const)(
      'rejects an invalid %s.timeframe duration',
      (phase) => {
        const result = createRuleDataSchema.safeParse({
          ...validCreateData,
          state_transition: { [phase]: { timeframe: 'bad' } },
        });

        expect(result.success).toBe(false);
      }
    );

    it.each(['pending', 'recovering'] as const)(
      'rejects a %s.timeframe exceeding 365d',
      (phase) => {
        const result = createRuleDataSchema.safeParse({
          ...validCreateData,
          state_transition: { [phase]: { timeframe: '366d' } },
        });

        expect(result.success).toBe(false);
      }
    );

    it('rejects unknown keys inside state_transition (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { unknownKey: true },
      });

      expect(result.success).toBe(false);
    });

    it('rejects the removed flat phase keys (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending_count: 3 },
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside a phase (strict)', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        state_transition: { pending: { count: 3, unknownKey: true } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects state_transition when kind is "signal"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validSignalCreateData,
        state_transition: { pending: { count: 1 } },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('recovery transition consistency', () => {
    it('rejects a recovering phase when recovery.strategy is "manual"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'manual' },
        state_transition: { recovering: { count: 2 } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a recovering timeframe when recovery.strategy is "manual"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'manual' },
        state_transition: { recovering: { timeframe: '5m' } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an empty recovering phase when recovery.strategy is "manual"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'manual' },
        state_transition: { pending: { count: 0 }, recovering: {} },
      });

      expect(result.success).toBe(false);
    });

    it('accepts a pending-only state_transition when recovery.strategy is "manual"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'manual' },
        state_transition: { pending: { count: 3 } },
      });

      expect(result.success).toBe(true);
    });

    it('accepts a recovering phase when recovery.strategy is "no_breach"', () => {
      const result = createRuleDataSchema.safeParse({
        ...validCreateData,
        recovery: { strategy: 'no_breach' },
        state_transition: { recovering: { count: 2, timeframe: '5m' } },
      });

      expect(result.success).toBe(true);
    });

    it('rejects a recovering phase when recovery is omitted', () => {
      const { recovery: _recovery, ...withoutRecovery } = validCreateData;
      const result = createRuleDataSchema.safeParse({
        ...withoutRecovery,
        state_transition: { recovering: { count: 2, timeframe: '5m' } },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('artifacts envelope', () => {
    const parseWithArtifact = (artifact: Record<string, unknown>) =>
      createRuleDataSchema.safeParse({ ...validCreateData, artifacts: [artifact] });

    // Per-type limits are registry-enforced server-side; the envelope only caps the
    // serialized size of `data`, which is the sole bound for unregistered types.
    it('accepts data up to the serialized size ceiling', () => {
      const wrapper = JSON.stringify({ value: '' }).length;
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { value: 'a'.repeat(MAX_ARTIFACT_DATA_LENGTH - wrapper) },
      });

      expect(result.success).toBe(true);
    });

    it('rejects data above the serialized size ceiling', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { value: 'a'.repeat(MAX_ARTIFACT_DATA_LENGTH) },
      });

      expect(result.success).toBe(false);
    });

    it('measures structured values against the ceiling, not just strings', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { list: new Array(MAX_ARTIFACT_DATA_LENGTH).fill(1) },
      });

      expect(result.success).toBe(false);
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

  it('accepts a nested state_transition object', () => {
    const result = updateRuleDataSchema.parse({
      state_transition: { pending: { count: 3 }, recovering: { count: 5 } },
    });

    expect(result.state_transition).toEqual({
      pending: { count: 3 },
      recovering: { count: 5 },
    });
  });

  it('accepts state_transition set to null (removal)', () => {
    const result = updateRuleDataSchema.parse({ state_transition: null });
    expect(result.state_transition).toBeNull();
  });

  it.each(['no_breach', 'manual'] as const)('accepts a recovery update to "%s"', (strategy) => {
    const result = updateRuleDataSchema.parse({ recovery: { strategy } });
    expect(result.recovery).toEqual({ strategy });
  });

  it('accepts a recovery update to "condition"', () => {
    const result = updateRuleDataSchema.parse({
      recovery: { strategy: 'condition', segment: 'WHERE cpu < 0.5' },
    });
    expect(result.recovery).toEqual({ strategy: 'condition', segment: 'WHERE cpu < 0.5' });
  });

  it('rejects unknown recovery strategy', () => {
    const result = updateRuleDataSchema.safeParse({ recovery: { strategy: 'unknown' } });
    expect(result.success).toBe(false);
  });

  it.each(['ignore', 'keep_last', 'resolve', 'alert'] as const)(
    'accepts a no_data update to "%s"',
    (strategy) => {
      const result = updateRuleDataSchema.parse({ no_data: { strategy } });
      expect(result.no_data).toEqual({ strategy });
    }
  );

  it('rejects recovery set to null (alert rules always store one)', () => {
    const result = updateRuleDataSchema.safeParse({ recovery: null });
    expect(result.success).toBe(false);
  });

  it('rejects no_data set to null (alert rules always store one)', () => {
    const result = updateRuleDataSchema.safeParse({ no_data: null });
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

    it('rejects an invalid ES|QL base query', () => {
      const result = updateRuleDataSchema.safeParse({ query: { base: 'FROM |' } });
      expect(result.success).toBe(false);
    });

    it('rejects a breach segment that does not compose into valid ES|QL', () => {
      const result = updateRuleDataSchema.safeParse({
        query: { base: 'FROM metrics-*', breach: { segment: UNPARSEABLE_ESQL } },
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

    it('rejects data above the serialized size ceiling', () => {
      const result = parseWithArtifact({
        id: 'artifact-1',
        type: 'host',
        data: { value: 'a'.repeat(MAX_ARTIFACT_DATA_LENGTH) },
      });

      expect(result.success).toBe(false);
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
    it('rejects an invalid pending.operator', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending: { operator: 'XOR', count: 2, timeframe: '5m' } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a pending.operator without both count and timeframe', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending: { operator: 'AND', count: 2 } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a non-integer pending.count', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending: { count: 1.5 } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a pending.count greater than 1000', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending: { count: 1001 } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a recovering.count greater than 1000', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { recovering: { count: 1001 } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects an invalid pending.timeframe duration', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending: { timeframe: 'bad' } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a pending.timeframe exceeding 365d', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { pending: { timeframe: '366d' } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a recovering.timeframe exceeding 365d', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { recovering: { timeframe: '366d' } },
      });

      expect(result.success).toBe(false);
    });

    it('rejects unknown keys inside state_transition (strict)', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { unknownKey: true },
      });

      expect(result.success).toBe(false);
    });

    it('rejects the removed flat phase keys (strict)', () => {
      const result = updateRuleDataSchema.safeParse({
        state_transition: { recovering_count: 5 },
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('getBreachEsqlQuery', () => {
  it('returns base verbatim when the breach block is omitted', () => {
    expect(getBreachEsqlQuery({ base: 'FROM metrics-*' })).toBe('FROM metrics-*');
  });

  it('composes base and breach segment', () => {
    expect(getBreachEsqlQuery(composedQuery)).toBe('FROM metrics-* | WHERE cpu > 0.9');
  });

  // The schema rejects blank segments, but stored rules predate that guard, so
  // the helper must not append a trailing pipe for them.
  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('returns base verbatim for a %s stored breach segment', (_label, segment) => {
    expect(getBreachEsqlQuery({ base: 'FROM metrics-*', breach: { segment } })).toBe(
      'FROM metrics-*'
    );
  });

  it('handles a trailing comment in base without corrupting the composed query', () => {
    expect(
      getBreachEsqlQuery({
        base: 'FROM logs-* // my query',
        breach: { segment: 'WHERE status == "error"' },
      })
    ).toBe('FROM logs-* | WHERE status == "error"');
  });

  it('handles a segment with multiple pipeline commands', () => {
    expect(
      getBreachEsqlQuery({
        base: 'FROM metrics-*',
        breach: { segment: 'WHERE cpu > 0.9 | STATS count = COUNT(*)' },
      })
    ).toBe('FROM metrics-* | WHERE cpu > 0.9 | STATS count = COUNT(*)');
  });
});

describe('getRecoverEsqlQuery', () => {
  it('composes base and segment for strategy "condition"', () => {
    expect(
      getRecoverEsqlQuery(composedQuery, { strategy: 'condition', segment: 'WHERE cpu <= 0.9' })
    ).toBe('FROM metrics-* | WHERE cpu <= 0.9');
  });

  it('returns the query verbatim for strategy "query"', () => {
    expect(
      getRecoverEsqlQuery(composedQuery, {
        strategy: 'query',
        query: 'FROM logs-* | WHERE status == "ok"',
      })
    ).toBe('FROM logs-* | WHERE status == "ok"');
  });

  it('returns undefined for strategy "no_breach"', () => {
    expect(getRecoverEsqlQuery(composedQuery, { strategy: 'no_breach' })).toBeUndefined();
  });

  it('returns undefined for strategy "manual"', () => {
    expect(getRecoverEsqlQuery(composedQuery, { strategy: 'manual' })).toBeUndefined();
  });

  it('returns undefined when recovery is omitted', () => {
    expect(getRecoverEsqlQuery(composedQuery, undefined)).toBeUndefined();
  });
});

describe('getNoDataEsqlQuery', () => {
  it('returns the presence query verbatim when one is configured', () => {
    expect(
      getNoDataEsqlQuery(composedQuery, {
        strategy: 'alert',
        query: 'FROM heartbeat-* | LIMIT 1',
      })
    ).toBe('FROM heartbeat-* | LIMIT 1');
  });

  it.each(['keep_last', 'resolve', 'alert'] as const)(
    'falls back to base for strategy "%s" without a presence query',
    (strategy) => {
      expect(getNoDataEsqlQuery(composedQuery, { strategy })).toBe('FROM metrics-*');
    }
  );

  it('returns undefined for strategy "ignore"', () => {
    expect(getNoDataEsqlQuery(composedQuery, { strategy: 'ignore' })).toBeUndefined();
  });

  it('returns undefined when no_data is omitted', () => {
    expect(getNoDataEsqlQuery(composedQuery, undefined)).toBeUndefined();
  });
});

describe('getRootEsqlQuery', () => {
  it('returns base', () => {
    expect(getRootEsqlQuery(composedQuery)).toBe('FROM metrics-*');
  });

  it('returns base when there is no breach segment', () => {
    expect(getRootEsqlQuery({ base: 'FROM logs-* | LIMIT 1' })).toBe('FROM logs-* | LIMIT 1');
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

  it('documents PATCH omission for time_field and the recovery/no_data contracts', () => {
    const json = z.toJSONSchema(updateRuleBodySchema, {
      target: 'draft-7',
      unrepresentable: 'any',
    }) as {
      properties?: Record<string, { description?: string }>;
      definitions?: Record<string, { description?: string }>;
    };

    expect({
      time_field: json.properties?.time_field?.description,
      recovery: json.definitions?.alerting_rule_recovery?.description,
      no_data: json.definitions?.alerting_rule_no_data?.description,
    }).toMatchInlineSnapshot(`
      Object {
        "no_data": "What the rule does when it finds no data for a group. Required when \`kind\` is \`alert\`, and not allowed when \`kind\` is \`signal\`.",
        "recovery": "How an alert recovers. Required when \`kind\` is \`alert\`, and not allowed when \`kind\` is \`signal\`.",
        "time_field": "Document field used as the event time when applying the lookback window. If omitted, the existing value is kept.",
      }
    `);
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
        "no_data",
        "query",
        "recovery",
        "schedule",
        "state_transition",
        "time_field",
      ]
    `);
  });
});

describe('ES|QL query length cap', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const oversized = `FROM logs-* | WHERE ${'a'.repeat(MAX_ESQL_QUERY_LENGTH)}`;

  it('rejects an oversized base on length alone, without invoking the parser', () => {
    const parseErrors = jest.spyOn(Parser, 'parseErrors');

    const result = createRuleDataSchema.safeParse({
      ...validCreateData,
      query: { base: oversized },
    });

    expect(result.success).toBe(false);
    expect(parseErrors).not.toHaveBeenCalled();
  });

  it('rejects an oversized base without composing the breach segment', () => {
    const parseErrors = jest.spyOn(Parser, 'parseErrors');
    const parse = jest.spyOn(Parser, 'parse');

    const result = createRuleDataSchema.safeParse({
      ...validCreateData,
      query: { base: oversized, breach: { segment: 'WHERE cpu > 0.9' } },
    });

    expect(result.success).toBe(false);
    expect(parseErrors).not.toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();
  });

  it('does not compose or parse an oversized segment', () => {
    const parseErrors = jest.spyOn(Parser, 'parseErrors');
    const parse = jest.spyOn(Parser, 'parse');

    const result = createRuleDataSchema.safeParse({
      ...validCreateData,
      query: {
        base: 'FROM logs-*',
        breach: { segment: `WHERE ${'a'.repeat(MAX_ESQL_QUERY_LENGTH)}` },
      },
    });

    expect(result.success).toBe(false);
    expect(parse).not.toHaveBeenCalled();
    for (const [query] of parseErrors.mock.calls) {
      expect(query.length).toBeLessThanOrEqual(MAX_ESQL_QUERY_LENGTH);
    }
  });

  it('rejects an oversized recovery query without invoking the parser', () => {
    const parseErrors = jest.spyOn(Parser, 'parseErrors');

    const result = createRuleDataSchema.safeParse({
      ...validCreateData,
      recovery: { strategy: 'query', query: oversized },
    });

    expect(result.success).toBe(false);
    for (const [query] of parseErrors.mock.calls) {
      expect(query.length).toBeLessThanOrEqual(MAX_ESQL_QUERY_LENGTH);
    }
  });

  it('still parses queries within the limit', () => {
    const parseErrors = jest.spyOn(Parser, 'parseErrors');

    const result = createRuleDataSchema.safeParse(validCreateData);

    expect(result.success).toBe(true);
    expect(parseErrors).toHaveBeenCalled();
  });
});

describe('findRulesRequestSchema', () => {
  it('accepts an empty query', () => {
    expect(findRulesRequestSchema.parse({})).toEqual({});
  });

  it('accepts valid query params', () => {
    expect(
      findRulesRequestSchema.parse({
        page: 2,
        per_page: 50,
        filter: 'kind: alert',
        sort_field: 'name',
        sort_order: 'asc',
        search: 'cpu',
      })
    ).toEqual({
      page: 2,
      per_page: 50,
      filter: 'kind: alert',
      sort_field: 'name',
      sort_order: 'asc',
      search: 'cpu',
    });
  });

  it('coerces numeric strings for page and per_page', () => {
    expect(findRulesRequestSchema.parse({ page: '2', per_page: '50' })).toEqual({
      page: 2,
      per_page: 50,
    });
  });

  it.each([0, -1, 1.5, 'abc', FIND_MAX_RESULT_WINDOW + 1, 1e9])('rejects page %p', (page) => {
    expect(findRulesRequestSchema.safeParse({ page }).success).toBe(false);
  });

  it.each([0, 1.5, 1001])('rejects per_page %p', (perPage) => {
    expect(findRulesRequestSchema.safeParse({ per_page: perPage }).success).toBe(false);
  });

  it('accepts the last page inside the max result window', () => {
    expect(findRulesRequestSchema.safeParse({ page: 10, per_page: 1000 }).success).toBe(true);
  });

  it('rejects a page beyond the max result window', () => {
    const result = findRulesRequestSchema.safeParse({ page: 11, per_page: 1000 });

    expect(result.success).toBe(false);
  });

  it('applies the default page size to the result window check when per_page is omitted', () => {
    expect(findRulesRequestSchema.safeParse({ page: 500 }).success).toBe(true);
    expect(findRulesRequestSchema.safeParse({ page: 501 }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(() => findRulesRequestSchema.parse({ unknown_key: 'kind: alert' })).toThrow();
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
    query: { base: 'FROM logs-* | LIMIT 1' },
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

describe('bulkCreateRulesRequestSchema', () => {
  const validItem = validCreateData;

  it('accepts a single item and defaults enabled to true', () => {
    const result = bulkCreateRulesRequestSchema.parse({ rules: [validItem] });
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].enabled).toBe(true);
    expect(result.rules[0].id).toBeUndefined();
  });

  it('accepts client-supplied id and enabled: false', () => {
    const result = bulkCreateRulesRequestSchema.parse({
      rules: [{ ...validItem, id: 'rule-1', enabled: false }],
    });
    expect(result.rules[0].id).toBe('rule-1');
    expect(result.rules[0].enabled).toBe(false);
  });

  it('accepts up to MAX_BULK_ITEMS items', () => {
    const rules = Array.from({ length: MAX_BULK_ITEMS }, (_, i) => ({
      ...validItem,
      metadata: { name: `rule-${i}` },
    }));
    expect(() => bulkCreateRulesRequestSchema.parse({ rules })).not.toThrow();
  });

  it('rejects an empty rules array', () => {
    expect(() => bulkCreateRulesRequestSchema.parse({ rules: [] })).toThrow();
  });

  it('rejects more than MAX_BULK_ITEMS items', () => {
    const rules = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => ({
      ...validItem,
      metadata: { name: `rule-${i}` },
    }));
    expect(() => bulkCreateRulesRequestSchema.parse({ rules })).toThrow();
  });

  it('rejects duplicate client-supplied ids', () => {
    expect(() =>
      bulkCreateRulesRequestSchema.parse({
        rules: [
          { ...validItem, id: 'same-id' },
          { ...validItem, metadata: { name: 'other' }, id: 'same-id' },
        ],
      })
    ).toThrow();
  });

  it('rejects a missing rules field', () => {
    expect(() => bulkCreateRulesRequestSchema.parse({})).toThrow();
  });

  it('rejects unknown top-level fields (strict)', () => {
    expect(() => bulkCreateRulesRequestSchema.parse({ rules: [validItem], foo: 'bar' })).toThrow();
  });

  it('rejects an item that fails create-rule refinements', () => {
    expect(() =>
      bulkCreateRulesRequestSchema.parse({
        rules: [{ ...validSignalCreateData, recovery: { strategy: 'no_breach' } }],
      })
    ).toThrow();
  });
});

describe('bulkCreateRulesResponseSchema', () => {
  const sampleRule = {
    id: 'rule-1',
    kind: 'alert' as const,
    metadata: { name: 'r', version: 1 },
    time_field: '@timestamp',
    schedule: { every: '5m' },
    query: { base: 'FROM logs-* | LIMIT 1' },
    enabled: true,
    created_by: 'user-a',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'user-a',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  it('accepts created rules and an empty errors array', () => {
    const result = bulkCreateRulesResponseSchema.parse({ rules: [sampleRule], errors: [] });
    expect(result.rules).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  it('accepts per-item errors without created rules', () => {
    const result = bulkCreateRulesResponseSchema.parse({
      rules: [],
      errors: [
        {
          id: 'rule-1',
          error: { code: 'RULE_ALREADY_EXISTS', message: 'already exists' },
        },
      ],
    });
    expect(result.rules).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it('rejects a missing rules field', () => {
    expect(() => bulkCreateRulesResponseSchema.parse({ errors: [] })).toThrow();
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

describe('isStateTransitionAllowed', () => {
  it('allows state_transition on alert rules', () => {
    expect(
      isStateTransitionAllowed({ kind: 'alert', state_transition: { pending: { count: 1 } } })
    ).toBe(true);
  });

  it('allows an absent state_transition on signal rules', () => {
    expect(isStateTransitionAllowed({ kind: 'signal' })).toBe(true);
    expect(isStateTransitionAllowed({ kind: 'signal', state_transition: null })).toBe(true);
  });

  it('rejects state_transition on signal rules', () => {
    expect(
      isStateTransitionAllowed({ kind: 'signal', state_transition: { pending: { count: 1 } } })
    ).toBe(false);
  });
});

describe('isLifecycleConfigAllowedForKind', () => {
  it('allows recovery and no_data on alert rules', () => {
    expect(
      isLifecycleConfigAllowedForKind({
        kind: 'alert',
        recovery: { strategy: 'no_breach' },
        no_data: { strategy: 'resolve' },
      })
    ).toBe(true);
  });

  it('allows signal rules without lifecycle configuration', () => {
    expect(isLifecycleConfigAllowedForKind({ kind: 'signal' })).toBe(true);
    expect(isLifecycleConfigAllowedForKind({ kind: 'signal', recovery: null, no_data: null })).toBe(
      true
    );
  });

  it('rejects recovery on signal rules', () => {
    expect(
      isLifecycleConfigAllowedForKind({ kind: 'signal', recovery: { strategy: 'no_breach' } })
    ).toBe(false);
  });

  it('rejects no_data on signal rules', () => {
    expect(
      isLifecycleConfigAllowedForKind({ kind: 'signal', no_data: { strategy: 'keep_last' } })
    ).toBe(false);
  });
});

describe('isRecoveryConditionUsableWithBreach', () => {
  it('returns true for strategy "condition" when a breach block is present', () => {
    expect(
      isRecoveryConditionUsableWithBreach({
        query: { breach: { segment: 'WHERE cpu > 0.9' } },
        recovery: { strategy: 'condition' },
      })
    ).toBe(true);
  });

  it('returns false for strategy "condition" without a breach block', () => {
    expect(
      isRecoveryConditionUsableWithBreach({ query: {}, recovery: { strategy: 'condition' } })
    ).toBe(false);

    expect(isRecoveryConditionUsableWithBreach({ recovery: { strategy: 'condition' } })).toBe(
      false
    );
  });

  it.each(['no_breach', 'query', 'manual'])(
    'returns true for strategy "%s" regardless of the breach block',
    (strategy) => {
      expect(isRecoveryConditionUsableWithBreach({ query: {}, recovery: { strategy } })).toBe(true);
    }
  );

  it('returns true when recovery is absent', () => {
    expect(isRecoveryConditionUsableWithBreach({ query: {} })).toBe(true);
  });
});

describe('isRecoveryTransitionConsistentWithStrategy', () => {
  it.each(['no_breach', 'condition', 'query'])(
    'returns true for strategy "%s", regardless of the recovering phase',
    (strategy) => {
      expect(
        isRecoveryTransitionConsistentWithStrategy({
          recovery: { strategy },
          state_transition: { recovering: { count: 3, timeframe: '5m' } },
        })
      ).toBe(true);
    }
  );

  it('returns true when recovery is omitted', () => {
    expect(
      isRecoveryTransitionConsistentWithStrategy({
        state_transition: { recovering: { count: 2 } },
      })
    ).toBe(true);
    expect(isRecoveryTransitionConsistentWithStrategy({})).toBe(true);
  });

  it('returns true for strategy "manual" when no recovering phase is set', () => {
    expect(isRecoveryTransitionConsistentWithStrategy({ recovery: { strategy: 'manual' } })).toBe(
      true
    );

    expect(
      isRecoveryTransitionConsistentWithStrategy({
        recovery: { strategy: 'manual' },
        state_transition: {},
      })
    ).toBe(true);

    expect(
      isRecoveryTransitionConsistentWithStrategy({
        recovery: { strategy: 'manual' },
        state_transition: null,
      })
    ).toBe(true);
  });

  it('returns false for an empty recovering phase under strategy "manual"', () => {
    expect(
      isRecoveryTransitionConsistentWithStrategy({
        recovery: { strategy: 'manual' },
        state_transition: { recovering: {} },
      })
    ).toBe(false);
  });

  it('returns false for a recovering phase under strategy "manual"', () => {
    expect(
      isRecoveryTransitionConsistentWithStrategy({
        recovery: { strategy: 'manual' },
        state_transition: { recovering: { count: 1 } },
      })
    ).toBe(false);

    expect(
      isRecoveryTransitionConsistentWithStrategy({
        recovery: { strategy: 'manual' },
        state_transition: { recovering: { timeframe: '5m' } },
      })
    ).toBe(false);
  });
});
