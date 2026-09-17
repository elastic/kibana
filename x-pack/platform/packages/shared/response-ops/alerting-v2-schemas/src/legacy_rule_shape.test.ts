/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collapseLegacyRuleShape,
  dropLegacyRuleShape,
  toApiQuery,
  toApiStateTransition,
} from './legacy_rule_shape';

const COMPOSED_BASE = 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name';
const STANDALONE_QUERY = 'FROM logs-* | STATS errors = COUNT(*) BY host.name';

describe('collapseLegacyRuleShape', () => {
  describe('query', () => {
    it('keeps a composed base and breach segment', () => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: {
            format: 'composed',
            base: COMPOSED_BASE,
            breach: { segment: 'WHERE avg_cpu > 0.9' },
          },
        }).query
      ).toEqual({ base: COMPOSED_BASE, breach: { segment: 'WHERE avg_cpu > 0.9' } });
    });

    it.each([
      ['an empty', ''],
      ['a whitespace-only', '   '],
    ])('drops %s breach segment, which breached on every base row', (_label, segment) => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: { format: 'composed', base: COMPOSED_BASE, breach: { segment } },
        }).query
      ).toEqual({ base: COMPOSED_BASE });
    });

    it('promotes a standalone breach query to the base query', () => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: { format: 'standalone', breach: { query: STANDALONE_QUERY } },
        }).query
      ).toEqual({ base: STANDALONE_QUERY });
    });
  });

  describe('recovery', () => {
    it('maps a composed recovery segment to the condition strategy', () => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: {
            format: 'composed',
            base: COMPOSED_BASE,
            breach: { segment: 'WHERE avg_cpu > 0.9' },
            recovery: { segment: 'WHERE avg_cpu < 0.6' },
          },
          recovery_strategy: 'query',
        }).recovery
      ).toEqual({ strategy: 'condition', segment: 'WHERE avg_cpu < 0.6' });
    });

    // `condition` composes against `query.breach`, so without one the segment has
    // to become a standalone query to keep running what the rule ran before.
    it('composes a recovery segment into a full query when there is no breach condition', () => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: {
            format: 'composed',
            base: COMPOSED_BASE,
            breach: { segment: '' },
            recovery: { segment: 'WHERE avg_cpu < 0.6' },
          },
          recovery_strategy: 'query',
        }).recovery
      ).toEqual({ strategy: 'query', query: `${COMPOSED_BASE} | WHERE avg_cpu < 0.6` });
    });

    it('maps a standalone recovery query to the query strategy', () => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: {
            format: 'standalone',
            breach: { query: STANDALONE_QUERY },
            recovery: { query: 'FROM logs-* | WHERE errors == 0' },
          },
          recovery_strategy: 'query',
        }).recovery
      ).toEqual({ strategy: 'query', query: 'FROM logs-* | WHERE errors == 0' });
    });

    it.each([
      ['no_breach', 'no_breach' as const, { strategy: 'no_breach' }],
      ['none', 'none' as const, { strategy: 'manual' }],
      ['an absent strategy', undefined, { strategy: 'manual' }],
    ])('maps %s to %p', (_label, strategy, expected) => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: { format: 'standalone', breach: { query: STANDALONE_QUERY } },
          recovery_strategy: strategy,
        }).recovery
      ).toEqual(expected);
    });
  });

  describe('no_data', () => {
    it.each([
      ['last_known_status', 'last_known_status' as const, 'keep_last'],
      ['recover', 'recover' as const, 'resolve'],
      ['emit', 'emit' as const, 'alert'],
      ['none', 'none' as const, 'ignore'],
      ['an absent strategy', undefined, 'ignore'],
    ])('maps %s to %s', (_label, strategy, expected) => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: { format: 'standalone', breach: { query: STANDALONE_QUERY } },
          no_data_strategy: strategy,
        }).no_data
      ).toEqual({ strategy: expected });
    });

    it('carries a standalone presence query onto the no_data object', () => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: {
            format: 'standalone',
            breach: { query: STANDALONE_QUERY },
            no_data: { query: 'FROM heartbeat-* | STATS beats = COUNT(*) BY host.name' },
          },
          no_data_strategy: 'recover',
        }).no_data
      ).toEqual({
        strategy: 'resolve',
        query: 'FROM heartbeat-* | STATS beats = COUNT(*) BY host.name',
      });
    });
  });

  it('drops the strategies of a signal rule, which has no episodes', () => {
    const collapsed = collapseLegacyRuleShape({
      kind: 'signal',
      query: { format: 'standalone', breach: { query: STANDALONE_QUERY } },
      recovery_strategy: 'no_breach',
      no_data_strategy: 'recover',
    });

    expect(collapsed).not.toHaveProperty('recovery');
    expect(collapsed).not.toHaveProperty('no_data');
  });

  describe('state_transition', () => {
    it('nests the flat scalars under their phase', () => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: { format: 'standalone', breach: { query: STANDALONE_QUERY } },
          state_transition: {
            pending_count: 3,
            pending_timeframe: '5m',
            pending_operator: 'AND',
            recovering_count: 2,
          },
        }).state_transition
      ).toEqual({
        pending: { count: 3, timeframe: '5m', operator: 'AND' },
        recovering: { count: 2 },
      });
    });

    it.each([
      ['null', null],
      ['absent', undefined],
      ['an empty object', {}],
    ])('maps %s to no state_transition', (_label, stateTransition) => {
      expect(
        collapseLegacyRuleShape({
          kind: 'alert',
          query: { format: 'standalone', breach: { query: STANDALONE_QUERY } },
          state_transition: stateTransition,
        })
      ).not.toHaveProperty('state_transition');
    });
  });
});

describe('toApiQuery', () => {
  it('drops the pre-collapse keys a migrated rule still carries', () => {
    expect(
      toApiQuery({
        base: COMPOSED_BASE,
        breach: { segment: 'WHERE avg_cpu > 0.9' },
        format: 'composed',
        recovery: { segment: 'WHERE avg_cpu < 0.6' },
      } as Parameters<typeof toApiQuery>[0])
    ).toEqual({ base: COMPOSED_BASE, breach: { segment: 'WHERE avg_cpu > 0.9' } });
  });

  it.each([
    ['a blank segment', { segment: '   ' }],
    ['a standalone breach query', { query: STANDALONE_QUERY }],
    ['no breach', undefined],
  ])('omits breach for %s', (_label, breach) => {
    expect(toApiQuery({ base: COMPOSED_BASE, breach } as Parameters<typeof toApiQuery>[0])).toEqual(
      { base: COMPOSED_BASE }
    );
  });
});

describe('toApiStateTransition', () => {
  it('keeps only the nested phases', () => {
    expect(
      toApiStateTransition({
        pending: { count: 3 },
        pending_count: 3,
        recovering_count: 2,
      })
    ).toEqual({ pending: { count: 3 } });
  });

  it.each([
    ['null', null],
    ['absent', undefined],
  ])('maps %s to undefined', (_label, stateTransition) => {
    expect(toApiStateTransition(stateTransition)).toBeUndefined();
  });

  it('maps flat-only scalars to undefined, since they gate nothing', () => {
    expect(toApiStateTransition({ pending_count: 3 })).toBeUndefined();
  });
});

describe('dropLegacyRuleShape', () => {
  it('leaves an already collapsed rule untouched', () => {
    const rule = {
      kind: 'alert',
      query: { base: COMPOSED_BASE, breach: { segment: 'WHERE avg_cpu > 0.9' } },
      recovery: { strategy: 'no_breach' },
      no_data: { strategy: 'ignore' },
      state_transition: { pending: { count: 3 } },
    };

    expect(dropLegacyRuleShape(rule)).toEqual(rule);
  });

  it('strips every pre-collapse key from a migrated rule', () => {
    expect(
      dropLegacyRuleShape({
        kind: 'alert',
        metadata: { name: 'My rule' },
        query: {
          base: STANDALONE_QUERY,
          format: 'standalone',
          breach: { query: STANDALONE_QUERY },
          recovery: { query: 'FROM logs-* | WHERE errors == 0' },
          no_data: { query: 'FROM heartbeat-* | STATS beats = COUNT(*) BY host.name' },
        },
        recovery: { strategy: 'query', query: 'FROM logs-* | WHERE errors == 0' },
        no_data: { strategy: 'keep_last' },
        recovery_strategy: 'query',
        no_data_strategy: 'last_known_status',
        state_transition: { pending_count: 3, pending: { count: 3 } },
      })
    ).toEqual({
      kind: 'alert',
      metadata: { name: 'My rule' },
      query: { base: STANDALONE_QUERY },
      recovery: { strategy: 'query', query: 'FROM logs-* | WHERE errors == 0' },
      no_data: { strategy: 'keep_last' },
      state_transition: { pending: { count: 3 } },
    });
  });

  it('drops a state_transition left with no phases', () => {
    expect(dropLegacyRuleShape({ kind: 'alert', state_transition: { pending_count: 3 } })).toEqual({
      kind: 'alert',
    });
  });
});
