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

const filterContainsSpaceId = (dsl: ISearchRequestParams): boolean => {
  const filter = (dsl.query as { bool?: { filter?: unknown } } | undefined)?.bool?.filter;

  return JSON.stringify(filter ?? []).includes('space_id');
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
});
