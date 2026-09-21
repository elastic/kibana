/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { Direction } from '../../../common/search_strategy';
import { OsqueryQueries } from '../../../common/search_strategy/osquery';
import type {
  FactoryQueryTypes,
  StrategyRequestType,
} from '../../../common/search_strategy/osquery';
import { osqueryFactory } from './factory';
import { enforceSpaceScope } from './enforce_space_scope';
import { ID_BOUND_FACTORY_QUERY_TYPES } from '.';

// Minimal-but-valid request options per factory type. Only the fields each
// `buildDsl` reads are required.
const baseRequest = (
  factoryQueryType: FactoryQueryTypes
): StrategyRequestType<FactoryQueryTypes> => {
  const common = {
    factoryQueryType,
    componentTemplateExists: false,
    ccsEnabled: false,
  };

  switch (factoryQueryType) {
    case OsqueryQueries.actions:
      return {
        ...common,
        kuery: '',
        pagination: { activePage: 0, cursorStart: 0, querySize: 10 },
        sort: { field: '@timestamp', direction: Direction.desc },
      } as unknown as StrategyRequestType<FactoryQueryTypes>;
    case OsqueryQueries.actionDetails:
      return {
        ...common,
        actionId: 'action-1',
        kuery: '',
      } as unknown as StrategyRequestType<FactoryQueryTypes>;
    case OsqueryQueries.actionResults:
      return {
        ...common,
        actionId: 'action-1',
        pagination: { activePage: 0, cursorStart: 0, querySize: 10 },
        sort: { field: 'started_at', direction: Direction.desc },
        useNewDataStream: false,
      } as unknown as StrategyRequestType<FactoryQueryTypes>;
    case OsqueryQueries.results:
      return {
        ...common,
        actionId: 'action-1',
        kuery: '',
        pagination: { activePage: 0, cursorStart: 0, querySize: 10 },
        sort: [{ field: '@timestamp', direction: Direction.desc }],
      } as unknown as StrategyRequestType<FactoryQueryTypes>;
    case OsqueryQueries.scheduledActionResults:
      return {
        ...common,
        scheduleId: 'schedule-1',
        executionCount: 1,
        pagination: { activePage: 0, cursorStart: 0, querySize: 10 },
        sort: { field: '@timestamp', direction: Direction.desc },
      } as unknown as StrategyRequestType<FactoryQueryTypes>;
    case OsqueryQueries.exportResults:
      return {
        ...common,
        baseFilter: 'action_id: "action-1"',
        size: 1000,
      } as unknown as StrategyRequestType<FactoryQueryTypes>;
    default:
      // Force a compile-time error if a new factory type is added without a
      // request fixture here — the invariant test must cover every type.
      return ((_exhaustive: never) => {
        throw new Error(`Unhandled factory query type: ${factoryQueryType}`);
      })(factoryQueryType);
  }
};

const namedSpaceActionDataFilter = {
  bool: {
    should: [{ term: { space_id: 'my-space' } }, { term: { 'action_data.space_id': 'my-space' } }],
  },
};

const getFilterClauses = (dsl: ISearchRequestParams): unknown[] => {
  const filter = (dsl.query as { bool?: { filter?: unknown } } | undefined)?.bool?.filter;

  return Array.isArray(filter) ? filter : filter != null ? [filter] : [];
};

const filterContainsSpaceId = (dsl: ISearchRequestParams): boolean =>
  JSON.stringify(getFilterClauses(dsl)).includes('space_id');

const hasTermOn = (node: unknown, fields: readonly string[]): boolean => {
  if (node == null || typeof node !== 'object') {
    return false;
  }

  if (Array.isArray(node)) {
    return node.some((item) => hasTermOn(item, fields));
  }

  const record = node as Record<string, unknown>;
  if ('term' in record && record.term != null && typeof record.term === 'object') {
    return fields.some((field) => field in (record.term as Record<string, unknown>));
  }

  return Object.values(record).some((value) => hasTermOn(value, fields));
};

const collectGlobalAggs = (node: unknown, found: Array<Record<string, unknown>> = []) => {
  if (node == null || typeof node !== 'object') {
    return found;
  }

  const record = node as Record<string, unknown>;
  if ('global' in record) {
    found.push(record);
  }

  for (const value of Object.values(record)) {
    collectGlobalAggs(value, found);
  }

  return found;
};

const globalAggMustClauses = (globalAgg: Record<string, unknown>): unknown[] => {
  const innerAggs = globalAgg.aggs;
  if (innerAggs == null || typeof innerAggs !== 'object') {
    return [];
  }

  return Object.values(innerAggs as Record<string, unknown>).flatMap((agg) => {
    if (agg == null || typeof agg !== 'object') {
      return [];
    }

    const must = (agg as { filter?: { bool?: { must?: unknown } } }).filter?.bool?.must;

    return Array.isArray(must) ? must : must != null ? [must] : [];
  });
};

describe('osquery search strategy space scoping invariant', () => {
  // Every registered factory type, derived from the live registry so new types
  // are picked up automatically.
  const factoryTypes = Object.keys(osqueryFactory) as FactoryQueryTypes[];

  it('covers every registered factory type', () => {
    // Sanity check that we are actually iterating the registry.
    expect(factoryTypes.length).toBeGreaterThanOrEqual(Object.keys(OsqueryQueries).length);
  });

  it.each(factoryTypes)(
    'enforces a space_id filter for factory type "%s" after central scoping',
    (factoryQueryType) => {
      const dsl = osqueryFactory[factoryQueryType].buildDsl(baseRequest(factoryQueryType));

      // Before central scoping, the builder itself must NOT be relied on for
      // hit-level isolation.
      const scoped = enforceSpaceScope(dsl, 'my-space');

      expect(filterContainsSpaceId(scoped)).toBe(true);
    }
  );

  it('fails closed: scoping a named space never falls back to missing-field match', () => {
    for (const factoryQueryType of factoryTypes) {
      const dsl = osqueryFactory[factoryQueryType].buildDsl(baseRequest(factoryQueryType));
      const scoped = enforceSpaceScope(dsl, 'my-space');
      const filter = (scoped.query as { bool: { filter: unknown } }).bool.filter;

      expect(JSON.stringify(filter)).toContain('"space_id":"my-space"');
    }
  });

  // Second-level invariant: enforceSpaceScope only scopes the hit query, not
  // `global` aggregations (which ignore the query filter). Any builder that
  // emits a `global` aggregation must therefore scope it itself, or its counts
  // would aggregate across all spaces while the hits are space-scoped. Driven
  // off the live registry so a future `global`-agg builder that forgets to
  // scope its aggregation fails this test.
  it.each(factoryTypes)(
    'scopes every `global` aggregation by space_id for factory type "%s"',
    (factoryQueryType) => {
      const request = {
        ...baseRequest(factoryQueryType),
        spaceId: 'my-space',
        ...(ID_BOUND_FACTORY_QUERY_TYPES.includes(factoryQueryType)
          ? { matchActionDataSpaceId: true }
          : {}),
      } as StrategyRequestType<FactoryQueryTypes>;

      const dsl = osqueryFactory[factoryQueryType].buildDsl(request);
      const globalAggs = collectGlobalAggs(dsl.aggs);

      // Builders that do not use a `global` aggregation rely solely on
      // enforceSpaceScope (covered above) — nothing to assert here.
      for (const globalAgg of globalAggs) {
        const mustClauses = globalAggMustClauses(globalAgg);

        expect(mustClauses.length).toBeGreaterThan(0);
        if (ID_BOUND_FACTORY_QUERY_TYPES.includes(factoryQueryType)) {
          expect(mustClauses).toContainEqual(namedSpaceActionDataFilter);
        } else {
          expect(mustClauses).toContainEqual({ term: { space_id: 'my-space' } });
          expect(mustClauses).not.toContainEqual(namedSpaceActionDataFilter);
        }
      }
    }
  );

  // Third-level invariant, and the regression guard for the cross-space leak.
  //
  // `action_data.space_id` is the query payload round-tripped through the agent,
  // so it is less trustworthy than the Kibana-written top-level `space_id`. It is
  // only safe on reads already constrained by an `action_id`/`schedule_id`, which
  // the caller can only have learned from a space-stamped action document.
  // Hit-level enablement is asserted through osquerySearchStrategyProvider in
  // index.test.ts so this file does not re-implement the allowlist decision.
  describe('action_data.space_id fallback is confined to id-bound reads', () => {
    it('pins ID_BOUND_FACTORY_QUERY_TYPES to the three id-bound agent-doc factory types', () => {
      expect([...ID_BOUND_FACTORY_QUERY_TYPES]).toEqual([
        OsqueryQueries.results,
        OsqueryQueries.actionResults,
        OsqueryQueries.scheduledActionResults,
      ]);
    });

    it('only allowlists factory types whose builder always filters on an action or schedule id', () => {
      expect(ID_BOUND_FACTORY_QUERY_TYPES.length).toBeGreaterThan(0);

      for (const factoryQueryType of ID_BOUND_FACTORY_QUERY_TYPES) {
        const dsl = osqueryFactory[factoryQueryType].buildDsl(baseRequest(factoryQueryType));

        expect(hasTermOn(dsl.query, ['action_id', 'schedule_id'])).toBe(true);
      }
    });

    it('never emits the fallback for factory types that are not allowlisted for action_data.space_id', () => {
      const typesNotAllowlistedForActionData = factoryTypes.filter(
        (type) => !ID_BOUND_FACTORY_QUERY_TYPES.includes(type)
      );

      // Guards against the allowlist silently swallowing every type.
      expect(typesNotAllowlistedForActionData.length).toBeGreaterThan(0);

      for (const factoryQueryType of typesNotAllowlistedForActionData) {
        const dsl = osqueryFactory[factoryQueryType].buildDsl(baseRequest(factoryQueryType));
        const scoped = enforceSpaceScope(dsl, 'my-space');

        expect(getFilterClauses(scoped)).toContainEqual({ term: { space_id: 'my-space' } });
        expect(getFilterClauses(scoped)).not.toContainEqual(namedSpaceActionDataFilter);

        for (const globalAgg of collectGlobalAggs(dsl.aggs)) {
          expect(globalAggMustClauses(globalAgg)).not.toContainEqual(namedSpaceActionDataFilter);
        }
      }
    });

    it('keeps the fallback independent of matchMissingSpaceId (CPS path)', () => {
      const dsl = osqueryFactory[OsqueryQueries.results].buildDsl(
        baseRequest(OsqueryQueries.results)
      );
      const scoped = enforceSpaceScope(dsl, 'default', {
        matchMissingSpaceId: false,
        matchActionDataSpaceId: true,
      });

      expect(getFilterClauses(scoped)).toContainEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { term: { 'action_data.space_id': 'default' } },
          ],
        },
      });
    });
  });
});
