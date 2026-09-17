/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { hasBreachCondition } from '@kbn/alerting-v2-schemas';
import { RULE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import type {
  RuleSavedObjectAttributes,
  RuleSavedObjectAttributesV3,
} from '../schemas/rule_saved_object_attributes';
import { ruleSavedObjectAttributesSchemaV4 } from '../schemas/rule_saved_object_attributes';
import { migrateRuleQueryShape } from './migrate_rule_query_shape';

type LegacyAttributes = RuleSavedObjectAttributesV3;
type TransformArgs = Parameters<typeof migrateRuleQueryShape>;

const STANDALONE_QUERY = 'FROM logs-* | STATS errors = COUNT(*) BY host.name';
const COMPOSED_BASE = 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name';

const legacyAttributes = (overrides: Partial<LegacyAttributes> = {}): LegacyAttributes => ({
  kind: 'alert',
  metadata: { name: 'My rule', version: 3 },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: STANDALONE_QUERY } },
  enabled: true,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const migrate = (overrides: Partial<LegacyAttributes> = {}): RuleSavedObjectAttributes =>
  migrateRuleQueryShape(
    {
      id: 'rule-1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: legacyAttributes(overrides),
      references: [],
    },
    {} as TransformArgs[1]
  ).document.attributes;

describe('migrateRuleQueryShape', () => {
  describe('query', () => {
    it('keeps a composed base and breach segment', () => {
      const { query } = migrate({
        query: {
          format: 'composed',
          base: COMPOSED_BASE,
          breach: { segment: 'WHERE avg_cpu > 0.9' },
        },
      });

      expect(query).toMatchObject({
        base: COMPOSED_BASE,
        breach: { segment: 'WHERE avg_cpu > 0.9' },
      });
    });

    it.each([
      ['an empty', ''],
      ['a whitespace-only', '   '],
    ])(
      'leaves %s composed breach segment, which reads as no breach condition',
      (_label, segment) => {
        const { query } = migrate({
          query: { format: 'composed', base: COMPOSED_BASE, breach: { segment } },
        });

        expect(query.base).toBe(COMPOSED_BASE);
        expect(hasBreachCondition(query.breach)).toBe(false);
      }
    );

    it('promotes a standalone breach query to the base query', () => {
      expect(migrate().query.base).toBe(STANDALONE_QUERY);
    });
  });

  describe('recovery', () => {
    it('maps `no_breach` to the no_breach strategy', () => {
      expect(migrate({ recovery_strategy: 'no_breach' }).recovery).toEqual({
        strategy: 'no_breach',
      });
    });

    it('maps `query` on a composed rule to the condition strategy', () => {
      const { recovery } = migrate({
        query: {
          format: 'composed',
          base: COMPOSED_BASE,
          breach: { segment: 'WHERE avg_cpu > 0.9' },
          recovery: { segment: 'WHERE avg_cpu < 0.6' },
        },
        recovery_strategy: 'query',
      });

      expect(recovery).toEqual({ strategy: 'condition', segment: 'WHERE avg_cpu < 0.6' });
    });

    it('maps `query` on a standalone rule to the query strategy', () => {
      const { recovery } = migrate({
        query: {
          format: 'standalone',
          breach: { query: STANDALONE_QUERY },
          recovery: { query: 'FROM logs-* | WHERE errors == 0' },
        },
        recovery_strategy: 'query',
      });

      expect(recovery).toEqual({ strategy: 'query', query: 'FROM logs-* | WHERE errors == 0' });
    });

    it.each([
      ['none', 'none' as const],
      ['an absent strategy', undefined],
    ])('maps %s to the manual strategy', (_label, recoveryStrategy) => {
      expect(migrate({ recovery_strategy: recoveryStrategy }).recovery).toEqual({
        strategy: 'manual',
      });
    });

    it('falls back to manual when `query` has no recovery block left to run', () => {
      expect(migrate({ recovery_strategy: 'query' }).recovery).toEqual({ strategy: 'manual' });
    });
  });

  describe('no_data', () => {
    it.each([
      { label: 'none', strategy: 'none' as const, expected: 'ignore' },
      { label: 'an absent strategy', strategy: undefined, expected: 'ignore' },
      { label: 'last_known_status', strategy: 'last_known_status' as const, expected: 'keep_last' },
      { label: 'recover', strategy: 'recover' as const, expected: 'resolve' },
      { label: 'emit', strategy: 'emit' as const, expected: 'alert' },
    ])('maps $label to $expected', ({ strategy, expected }) => {
      expect(migrate({ no_data_strategy: strategy }).no_data).toEqual({ strategy: expected });
    });

    it('carries a standalone presence query onto the no_data object', () => {
      const { no_data: noData } = migrate({
        query: {
          format: 'standalone',
          breach: { query: STANDALONE_QUERY },
          no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name' },
        },
        no_data_strategy: 'recover',
      });

      expect(noData).toEqual({
        strategy: 'resolve',
        query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name',
      });
    });

    it('leaves a composed rule without a presence query, so the base query decides', () => {
      const { no_data: noData } = migrate({
        query: {
          format: 'composed',
          base: COMPOSED_BASE,
          breach: { segment: 'WHERE avg_cpu > 0.9' },
        },
        no_data_strategy: 'last_known_status',
      });

      expect(noData).toEqual({ strategy: 'keep_last' });
    });

    it('drops a standalone presence query that `ignore` would never run', () => {
      const { no_data: noData } = migrate({
        query: {
          format: 'standalone',
          breach: { query: STANDALONE_QUERY },
          no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name' },
        },
        no_data_strategy: 'none',
      });

      expect(noData).toEqual({ strategy: 'ignore' });
    });
  });

  describe('signal rules', () => {
    it('drops the stored strategies rather than translating them', () => {
      const attributes = migrate({
        kind: 'signal',
        recovery_strategy: 'no_breach',
        no_data_strategy: 'recover',
      });

      expect(attributes).not.toHaveProperty('recovery');
      expect(attributes).not.toHaveProperty('no_data');
    });

    it('still migrates the query shape', () => {
      expect(migrate({ kind: 'signal' }).query.base).toBe(STANDALONE_QUERY);
    });
  });

  describe('state_transition', () => {
    it('nests the flat scalars under their phase', () => {
      const { state_transition: stateTransition } = migrate({
        state_transition: {
          pending_count: 3,
          pending_timeframe: '5m',
          pending_operator: 'AND',
          recovering_count: 2,
          recovering_timeframe: '10m',
          recovering_operator: 'OR',
        },
      });

      expect(stateTransition).toMatchObject({
        pending: { count: 3, timeframe: '5m', operator: 'AND' },
        recovering: { count: 2, timeframe: '10m', operator: 'OR' },
      });
    });

    it('omits a phase that had no scalars', () => {
      const { state_transition: stateTransition } = migrate({
        state_transition: { pending_count: 3 },
      });

      expect(stateTransition).toMatchObject({ pending: { count: 3 } });
      expect(stateTransition).not.toHaveProperty('recovering');
    });

    it('keeps a zero count, which skips the phase rather than disabling gating', () => {
      const { state_transition: stateTransition } = migrate({
        state_transition: { pending_count: 0, recovering_count: 0 },
      });

      expect(stateTransition).toMatchObject({
        pending: { count: 0 },
        recovering: { count: 0 },
      });
    });

    it.each([
      ['null', null],
      ['absent', undefined],
    ])('normalises %s state_transition to absent', (_label, stateTransition) => {
      expect(migrate({ state_transition: stateTransition })).not.toHaveProperty('state_transition');
    });

    it('leaves an empty object without phases, which gates nothing', () => {
      expect(migrate({ state_transition: {} }).state_transition).toEqual({});
    });
  });

  describe('pre-collapse keys, kept on disk for rollback', () => {
    it('keeps the top-level strategy scalars', () => {
      expect(
        migrate({ recovery_strategy: 'no_breach', no_data_strategy: 'recover' })
      ).toMatchObject({ recovery_strategy: 'no_breach', no_data_strategy: 'recover' });
    });

    it('keeps `format` and the per-format query blocks', () => {
      const { query } = migrate({
        query: {
          format: 'standalone',
          breach: { query: STANDALONE_QUERY },
          recovery: { query: 'FROM logs-* | WHERE errors == 0' },
          no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name' },
        },
        recovery_strategy: 'query',
        no_data_strategy: 'last_known_status',
      });

      expect(query).toMatchObject({
        format: 'standalone',
        breach: { query: STANDALONE_QUERY },
        recovery: { query: 'FROM logs-* | WHERE errors == 0' },
        no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name' },
      });
    });

    it('keeps a composed recovery segment alongside the recovery object', () => {
      const { query, recovery } = migrate({
        query: {
          format: 'composed',
          base: COMPOSED_BASE,
          breach: { segment: 'WHERE avg_cpu > 0.9' },
          recovery: { segment: 'WHERE avg_cpu < 0.6' },
        },
        recovery_strategy: 'query',
      });

      expect(query).toMatchObject({ recovery: { segment: 'WHERE avg_cpu < 0.6' } });
      expect(recovery).toEqual({ strategy: 'condition', segment: 'WHERE avg_cpu < 0.6' });
    });

    it('keeps the flat state_transition scalars alongside the phases', () => {
      const { state_transition: stateTransition } = migrate({
        state_transition: { pending_count: 3, pending_timeframe: '5m', pending_operator: 'AND' },
      });

      expect(stateTransition).toEqual({
        pending_count: 3,
        pending_timeframe: '5m',
        pending_operator: 'AND',
        pending: { count: 3, timeframe: '5m', operator: 'AND' },
      });
    });
  });

  it('preserves every attribute the migration does not own', () => {
    const untouched = {
      metadata: { name: 'My rule', description: 'CPU watch', tags: ['prod'], version: 7 },
      time_field: 'event.ingested',
      schedule: { every: '1m', lookback: '5m' },
      grouping: { fields: ['host.name'] },
      artifacts: [{ id: 'runbook-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'steps' } }],
    };

    expect(migrate(untouched)).toMatchObject({
      ...untouched,
      kind: 'alert',
      enabled: true,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  describe('model version 6 read schema', () => {
    it('accepts a migrated alert rule', () => {
      const attributes = migrate({
        query: {
          format: 'composed',
          base: COMPOSED_BASE,
          breach: { segment: 'WHERE avg_cpu > 0.9' },
          recovery: { segment: 'WHERE avg_cpu < 0.6' },
        },
        recovery_strategy: 'query',
        no_data_strategy: 'emit',
        state_transition: { pending_count: 3, pending_timeframe: '5m', pending_operator: 'AND' },
      });

      expect(() => ruleSavedObjectAttributesSchemaV4.validate(attributes)).not.toThrow();
    });

    it('accepts a migrated signal rule, which has no lifecycle objects', () => {
      const attributes = migrate({ kind: 'signal', recovery_strategy: 'no_breach' });

      expect(() => ruleSavedObjectAttributesSchemaV4.validate(attributes)).not.toThrow();
    });

    it.each([
      ['none', 'none' as const],
      ['last_known_status', 'last_known_status' as const],
      ['recover', 'recover' as const],
      ['emit', 'emit' as const],
      ['an absent strategy', undefined],
    ])('accepts an alert rule migrated from no_data_strategy %s', (_label, noDataStrategy) => {
      const attributes = migrate({
        query: {
          format: 'standalone',
          breach: { query: STANDALONE_QUERY },
          no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name' },
        },
        no_data_strategy: noDataStrategy,
      });

      expect(() => ruleSavedObjectAttributesSchemaV4.validate(attributes)).not.toThrow();
    });
  });
});
