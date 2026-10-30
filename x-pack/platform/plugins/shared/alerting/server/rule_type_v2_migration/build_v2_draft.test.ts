/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { RuleTypeParams } from '../types';
import type { RuleToMigrate } from './build_v2_draft';
import { buildV2Draft } from './build_v2_draft';
import type { RuleTypeV2Migration } from './types';

const migration: RuleTypeV2Migration = {
  toV2Draft: jest.fn(() => ({
    query: { base: 'FROM logs-*' },
    time_field: '@timestamp',
    lookback: '5m',
  })),
};

const getRule = (overrides: Partial<RuleToMigrate<RuleTypeParams>> = {}) => ({
  name: 'High error count',
  tags: ['prod', 'web'],
  schedule: { interval: '1m' },
  params: { index: 'logs-*' },
  ...overrides,
});

describe('buildV2Draft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the framework fields to what the rule type converts from the params', () => {
    const draft = buildV2Draft(getRule(), migration);

    expect(migration.toV2Draft).toHaveBeenCalledWith({ index: 'logs-*' });
    expect(draft).toEqual({
      kind: 'alert',
      metadata: { name: 'High error count', tags: ['prod', 'web'] },
      time_field: '@timestamp',
      schedule: { every: '1m', lookback: '5m' },
      query: { base: 'FROM logs-*' },
      recovery: { strategy: 'no_breach' },
      no_data: { strategy: 'ignore' },
      state_transition: { pending: { count: 0 }, recovering: { count: 0 } },
    });
    expect(createRuleDataSchema.safeParse(draft).success).toBe(true);
  });

  it('takes the time field, lookback and grouping from the rule type', () => {
    const draft = buildV2Draft(getRule(), {
      toV2Draft: () => ({
        query: { base: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
        time_field: 'event.ingested',
        lookback: '10m',
        grouping: { fields: ['host.name'] },
      }),
    });

    expect(draft).toMatchObject({
      time_field: 'event.ingested',
      schedule: { every: '1m', lookback: '10m' },
      grouping: { fields: ['host.name'] },
    });
    expect(createRuleDataSchema.safeParse(draft).success).toBe(true);
  });

  it('omits tags when the rule has none', () => {
    expect(buildV2Draft(getRule({ tags: [] }), migration).metadata).toEqual({
      name: 'High error count',
    });
  });

  it.each([
    [undefined, 0],
    [null, 0],
    [{ active: 1 }, 0],
    [{ active: 3 }, 2],
  ])('maps alert delay %j to %d pending evaluations', (alertDelay, count) => {
    expect(buildV2Draft(getRule({ alertDelay }), migration).state_transition).toEqual({
      pending: { count },
      recovering: { count: 0 },
    });
  });

  describe('artifacts', () => {
    it('maps the investigation guide and dashboards', () => {
      const draft = buildV2Draft(
        getRule({
          artifacts: {
            investigation_guide: { blob: ' Check the deploy ' },
            dashboards: [{ id: 'dash-1' }, { id: 'dash-2' }],
          },
        }),
        migration
      );

      expect(draft.artifacts).toEqual([
        { id: expect.any(String), type: 'runbook', data: { content: 'Check the deploy' } },
        { id: expect.any(String), type: 'dashboard', data: { dashboard_id: 'dash-1' } },
        { id: expect.any(String), type: 'dashboard', data: { dashboard_id: 'dash-2' } },
      ]);
      expect(createRuleDataSchema.safeParse(draft).success).toBe(true);
    });

    it.each([[undefined], [null], [{}], [{ investigation_guide: { blob: '  ' }, dashboards: [] }]])(
      'omits artifacts for %j',
      (artifacts) => {
        expect(buildV2Draft(getRule({ artifacts }), migration).artifacts).toBeUndefined();
      }
    );
  });

  it('rethrows what the rule type throws', () => {
    expect(() =>
      buildV2Draft(getRule(), {
        toV2Draft: () => {
          throw new Error('cannot convert');
        },
      })
    ).toThrow('cannot convert');
  });
});
