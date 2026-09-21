/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, lastValueFrom } from 'rxjs';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { OsqueryQueries } from '../../../common/search_strategy/osquery';
import type {
  FactoryQueryTypes,
  StrategyRequestType,
} from '../../../common/search_strategy/osquery';
import { Direction } from '../../../common/search_strategy';
import type { ActionResultsStrategyResponse } from '../../../common/search_strategy';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import {
  ACTIONS_INDEX,
  ACTION_RESPONSES_DATA_STREAM_INDEX,
  OSQUERY_INTEGRATION_NAME,
} from '../../../common/constants';
import { OSQUERY_SEARCH_STRATEGY_AUTHZ_ERROR } from '../constants';
import { hasConnectedRemoteClusters } from '../../utils/ccs_utils';
import { ID_BOUND_FACTORY_QUERY_TYPES, osquerySearchStrategyProvider } from '.';

jest.mock('@kbn/data-plugin/server', () => ({
  shimHitsTotal: (rawResponse: unknown) => rawResponse,
}));

// Keep the real CCS prefixing so index-shape assertions exercise production
// behaviour; only the remote-cluster probe (a network call) is stubbed.
jest.mock('../../utils/ccs_utils', () => {
  const actual = jest.requireActual('../../utils/ccs_utils');

  return {
    ...actual,
    hasConnectedRemoteClusters: jest.fn().mockResolvedValue(false),
  };
});

const emptyRawResponse = {
  rawResponse: { hits: { total: 0, hits: [] } },
};

describe('osquerySearchStrategyProvider space scoping', () => {
  const setup = ({
    authorizedPrivileges = ['osquery-read', 'osquery-readLiveQueries'],
    useRbac = true,
    activeSpaceId = 'default',
    actionsIndexExists = false,
    newDataStreamIndexExists = false,
    cpsActive = false,
  }: {
    authorizedPrivileges?: string[];
    useRbac?: boolean;
    activeSpaceId?: string | null;
    actionsIndexExists?: boolean;
    newDataStreamIndexExists?: boolean;
    cpsActive?: boolean;
  } = {}) => {
    const searchMock = jest.fn().mockReturnValue(of(emptyRawResponse));
    const authorizedActions = new Set(authorizedPrivileges.map((privilege) => `api:${privilege}`));
    const checkPrivileges = jest.fn(({ kibana }: { kibana: string[] }) =>
      Promise.resolve({
        privileges: {
          kibana: kibana.map((privilege) => ({
            privilege,
            authorized: authorizedActions.has(privilege),
          })),
        },
      })
    );
    const checkPrivilegesDynamicallyWithRequest = jest.fn().mockReturnValue(checkPrivileges);
    const getApiAction = jest.fn((privilege: string) => `api:${privilege}`);
    const getActiveSpace = jest
      .fn()
      .mockResolvedValue(activeSpaceId === null ? undefined : { id: activeSpaceId });

    const getSearchStrategy = jest.fn();

    const data = {
      search: {
        searchAsInternalUser: { search: searchMock, cancel: jest.fn() },
        getSearchStrategy,
      },
    } as any;

    const indicesExists = jest.fn(({ index }: { index: string }) =>
      Promise.resolve(
        index.startsWith(ACTION_RESPONSES_DATA_STREAM_INDEX)
          ? newDataStreamIndexExists
          : actionsIndexExists
      )
    );

    const esClient = {
      asInternalUser: {
        indices: { exists: indicesExists },
      },
    } as any;

    const osqueryContext = {
      security: {
        authz: {
          actions: { api: { get: getApiAction } },
          checkPrivilegesDynamicallyWithRequest,
          mode: { useRbacForRequest: jest.fn().mockReturnValue(useRbac) },
        },
      },
      service: { getActiveSpace },
      isCpsActive: jest.fn().mockResolvedValue(cpsActive),
    } as unknown as Pick<OsqueryAppContext, 'security' | 'service' | 'isCpsActive'>;

    const provider = osquerySearchStrategyProvider(data, esClient, osqueryContext);

    return {
      checkPrivileges,
      checkPrivilegesDynamicallyWithRequest,
      getActiveSpace,
      getApiAction,
      getSearchStrategy,
      provider,
      searchMock,
    };
  };

  const resultsRequest = {
    factoryQueryType: OsqueryQueries.results,
    actionId: 'action-1',
    scheduleId: 'sched-1',
    executionCount: 1,
    kuery: '',
    pagination: { activePage: 0, cursorStart: 0, querySize: 10 },
    sort: [{ field: '@timestamp', direction: Direction.desc }],
  } as StrategyRequestType<OsqueryQueries.results>;

  const search = (provider: ReturnType<typeof osquerySearchStrategyProvider>) =>
    lastValueFrom(provider.search(resultsRequest, {} as never, { request: {} } as never));

  const runResultsSearch = async (activeSpaceId: string | null, requestedSpaceId?: string) => {
    const { provider, searchMock } = setup({ activeSpaceId });

    await lastValueFrom(
      provider.search(
        {
          ...resultsRequest,
          ...(requestedSpaceId !== undefined ? { spaceId: requestedSpaceId } : {}),
        },
        {} as never,
        { request: {} } as never
      )
    );

    const params = searchMock.mock.calls[0][0].params;

    return params.query.bool.filter as Array<Record<string, unknown>>;
  };

  it('handles requests without any Osquery read access', async () => {
    const { checkPrivileges, getActiveSpace, getApiAction, provider, searchMock } = setup({
      authorizedPrivileges: [],
    });

    await expect(search(provider)).rejects.toMatchObject({
      message: OSQUERY_SEARCH_STRATEGY_AUTHZ_ERROR,
      statusCode: 403,
    });

    expect(getApiAction).toHaveBeenCalledWith('osquery-read');
    expect(getApiAction).toHaveBeenCalledWith('osquery-readLiveQueries');
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: ['api:osquery-read', 'api:osquery-readLiveQueries'],
    });
    expect(getActiveSpace).not.toHaveBeenCalled();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('authorizes requests granted only osquery-read', async () => {
    const { provider, searchMock } = setup({ authorizedPrivileges: ['osquery-read'] });

    await search(provider);

    expect(searchMock).toHaveBeenCalled();
  });

  it('authorizes requests granted only osquery-readLiveQueries', async () => {
    // A role with only the Live queries sub-feature has `osquery-readLiveQueries`
    // (not `osquery-read`) and should still read through the strategy.
    const { provider, searchMock } = setup({
      authorizedPrivileges: ['osquery-readLiveQueries'],
    });

    await search(provider);

    expect(searchMock).toHaveBeenCalled();
  });

  it('supports requests when RBAC is disabled', async () => {
    const { checkPrivilegesDynamicallyWithRequest, provider, searchMock } = setup({
      useRbac: false,
    });

    await search(provider);

    expect(checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
    expect(searchMock).toHaveBeenCalled();
  });

  it('resolves the active space from the strategy request dependencies', async () => {
    const { getActiveSpace, provider } = setup();
    const depsRequest = {} as never;

    await lastValueFrom(
      provider.search(resultsRequest, {} as never, { request: depsRequest } as never)
    );

    expect(getActiveSpace).toHaveBeenCalledWith(depsRequest);
  });

  it('injects a named-space term filter into the ES params', async () => {
    const filter = await runResultsSearch('my-space');

    // `results` is id-bound, so it also matches the agent-carried
    // action_data.space_id (see ID_BOUND_FACTORY_QUERY_TYPES).
    expect(filter).toContainEqual({
      bool: {
        should: [
          { term: { space_id: 'my-space' } },
          { term: { 'action_data.space_id': 'my-space' } },
        ],
      },
    });
    // Named space must NOT include the default-space missing-field fallback.
    expect(JSON.stringify(filter)).not.toContain('exists');
  });

  it('injects the default-space clause (term OR missing field) when spaceId is "default"', async () => {
    const filter = await runResultsSearch('default');

    expect(filter).toContainEqual({
      bool: {
        should: [
          { term: { space_id: 'default' } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
          { term: { 'action_data.space_id': 'default' } },
        ],
      },
    });
  });

  it('uses the active space when the request includes a spaceId', async () => {
    const filter = await runResultsSearch('active-space', 'request-space');

    expect(filter).toContainEqual({
      bool: {
        should: [
          { term: { space_id: 'active-space' } },
          { term: { 'action_data.space_id': 'active-space' } },
        ],
      },
    });
    expect(JSON.stringify(filter)).not.toContain('request-space');
  });

  it('defaults to the default space when no active space is available', async () => {
    const filter = await runResultsSearch(null);

    // No active space resolves to the default space, which still applies a space_id filter.
    expect(JSON.stringify(filter)).toContain('space_id');
    expect(filter).toContainEqual({
      bool: {
        should: [
          { term: { space_id: 'default' } },
          { bool: { must_not: { exists: { field: 'space_id' } } } },
          { term: { 'action_data.space_id': 'default' } },
        ],
      },
    });
  });

  describe('client selection and CCS-resolved index targets', () => {
    it('routes osquery result reads to the internal-user search client', async () => {
      const { provider, searchMock, getSearchStrategy } = setup();

      await search(provider);

      // Osquery result/action reads go through the internal-user search client
      // rather than the public enhanced-ES strategy.
      expect(searchMock).toHaveBeenCalled();
      expect(getSearchStrategy).not.toHaveBeenCalled();
      expect(searchMock.mock.calls[0][0].params.index).toEqual([
        `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
      ]);
    });

    it('routes osquery result reads to the enhanced strategy when CPS is enabled', async () => {
      const enhancedSearchMock = jest.fn().mockReturnValue(of(emptyRawResponse));
      const { provider, searchMock, getSearchStrategy } = setup({ cpsActive: true });
      getSearchStrategy.mockReturnValue({ search: enhancedSearchMock, cancel: jest.fn() });

      await search(provider);

      expect(getSearchStrategy).toHaveBeenCalled();
      expect(searchMock).not.toHaveBeenCalled();
      expect(enhancedSearchMock.mock.calls[0][0].params.index).toEqual([
        `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
      ]);
    });

    const actionsRequest = {
      factoryQueryType: OsqueryQueries.actions,
      kuery: '',
      pagination: { activePage: 0, cursorStart: 0, querySize: 20 },
      sort: { field: 'created_at', direction: Direction.desc },
      spaceId: 'default',
    } as StrategyRequestType<OsqueryQueries.actions>;

    it('routes actions metadata reads to the enhanced strategy when CPS is enabled', async () => {
      const enhancedSearchMock = jest.fn().mockReturnValue(of(emptyRawResponse));
      const { provider, searchMock, getSearchStrategy } = setup({
        cpsActive: true,
        actionsIndexExists: true,
      });
      getSearchStrategy.mockReturnValue({ search: enhancedSearchMock, cancel: jest.fn() });

      await lastValueFrom(provider.search(actionsRequest, {} as never, { request: {} } as never));

      expect(getSearchStrategy).toHaveBeenCalled();
      expect(searchMock).not.toHaveBeenCalled();
      expect(enhancedSearchMock.mock.calls[0][0].params.index).toEqual(`${ACTIONS_INDEX}*`);
    });

    it('keeps the Fleet actions fallback on the internal-user search client when CPS is enabled', async () => {
      const { provider, searchMock, getSearchStrategy } = setup({
        cpsActive: true,
        actionsIndexExists: false,
      });

      await lastValueFrom(provider.search(actionsRequest, {} as never, { request: {} } as never));

      expect(searchMock).toHaveBeenCalled();
      expect(getSearchStrategy).not.toHaveBeenCalled();
      expect(searchMock.mock.calls[0][0].params.index).toEqual(AGENT_ACTIONS_INDEX);
    });

    it('adds CCS-prefixed index targets when remote clusters are connected', async () => {
      (hasConnectedRemoteClusters as jest.Mock).mockResolvedValueOnce(true);
      const { provider, searchMock } = setup();

      await search(provider);

      expect(searchMock.mock.calls[0][0].params.index).toEqual([
        `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
        `*:logs-${OSQUERY_INTEGRATION_NAME}.result*`,
      ]);
    });
  });

  describe('point-in-time export requests', () => {
    const pit = { id: 'pit-abc', keep_alive: '30s' };
    const exportRequest = {
      factoryQueryType: OsqueryQueries.exportResults,
      baseFilter: 'action_id: action-1',
      pit,
      size: 100,
      kuery: '',
    } as StrategyRequestType<OsqueryQueries.exportResults>;

    it('strips index, allow_no_indices, and ignore_unavailable from ES params when a PIT is set', async () => {
      const { provider, searchMock } = setup();

      await lastValueFrom(provider.search(exportRequest, {} as never, { request: {} } as never));

      const { params } = searchMock.mock.calls[0][0];
      // The PIT already encodes the index scope; ES rejects requests that also
      // pass these fields, so the strategy must drop them.
      expect(params.pit).toEqual(pit);
      expect(params.index).toBeUndefined();
      expect(params.allow_no_indices).toBeUndefined();
      expect(params.ignore_unavailable).toBeUndefined();
    });
  });

  describe('action results dual-index read', () => {
    const actionResultsRequest = {
      factoryQueryType: OsqueryQueries.actionResults,
      actionId: 'action-1',
      kuery: '',
      startDate: '',
      agentIds: [],
      sort: { field: '@timestamp', direction: Direction.desc },
      pagination: { activePage: 0, cursorStart: 0, querySize: 20 },
      spaceId: 'default',
    } as StrategyRequestType<OsqueryQueries.actionResults>;

    const legacyResponse = { rawResponse: { hits: { total: 3, hits: [{ _id: 'legacy' }] } } };

    it('routes actionResults reads to the enhanced strategy when CPS is enabled', async () => {
      const enhancedSearchMock = jest.fn().mockReturnValue(of(emptyRawResponse));
      const { provider, searchMock, getSearchStrategy } = setup({
        cpsActive: true,
        actionsIndexExists: true,
        newDataStreamIndexExists: true,
      });
      getSearchStrategy.mockReturnValue({ search: enhancedSearchMock, cancel: jest.fn() });

      await lastValueFrom(
        provider.search(actionResultsRequest, {} as never, { request: {} } as never)
      );

      expect(getSearchStrategy).toHaveBeenCalled();
      expect(searchMock).not.toHaveBeenCalled();
    });

    it('prefers the new data-stream response when it returns hits', async () => {
      const { provider, searchMock } = setup({ newDataStreamIndexExists: true });
      searchMock
        .mockReturnValueOnce(of(legacyResponse))
        .mockReturnValueOnce(
          of({ rawResponse: { hits: { total: 5, hits: [{ _id: 'data-stream' }] } } })
        );

      const response = (await lastValueFrom(
        provider.search(actionResultsRequest, {} as never, { request: {} } as never)
      )) as ActionResultsStrategyResponse;

      expect(searchMock).toHaveBeenCalledTimes(2);
      expect(response.edges).toEqual([{ _id: 'data-stream' }]);
    });

    it('falls back to the legacy response when the new data stream is empty', async () => {
      const { provider, searchMock } = setup({ newDataStreamIndexExists: true });
      searchMock
        .mockReturnValueOnce(of(legacyResponse))
        .mockReturnValueOnce(of({ rawResponse: { hits: { total: 0, hits: [] } } }));

      const response = (await lastValueFrom(
        provider.search(actionResultsRequest, {} as never, { request: {} } as never)
      )) as ActionResultsStrategyResponse;

      expect(searchMock).toHaveBeenCalledTimes(2);
      expect(response.edges).toEqual([{ _id: 'legacy' }]);
    });

    it('queries the new data stream as the request user when CPS is enabled even if the origin index is absent', async () => {
      const enhancedSearchMock = jest
        .fn()
        .mockReturnValue(
          of({ rawResponse: { hits: { total: 5, hits: [{ _id: 'data-stream' }] } } })
        );
      const { provider, searchMock, getSearchStrategy } = setup({
        cpsActive: true,
        newDataStreamIndexExists: false,
      });
      getSearchStrategy.mockReturnValue({ search: enhancedSearchMock, cancel: jest.fn() });
      searchMock.mockReturnValue(of({ rawResponse: { hits: { total: 0, hits: [] } } }));

      const response = (await lastValueFrom(
        provider.search(actionResultsRequest, {} as never, { request: {} } as never)
      )) as ActionResultsStrategyResponse;

      // With no osquery actions index on the origin, the legacy read resolves to the Fleet
      // results index and is therefore pinned to the internal client. The data-stream read
      // must still be selected independently, or reusing the legacy client would cancel
      // fan-out for every result on a managing project.
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(String(searchMock.mock.calls[0][0].params.index)).toContain(
        AGENT_ACTIONS_RESULTS_INDEX
      );
      expect(enhancedSearchMock).toHaveBeenCalledTimes(1);
      expect(String(enhancedSearchMock.mock.calls[0][0].params.index)).toContain(
        ACTION_RESPONSES_DATA_STREAM_INDEX
      );
      expect(response.edges).toEqual([{ _id: 'data-stream' }]);
    });

    it('skips the new data stream when CPS is disabled and the origin index is absent', async () => {
      const { provider, searchMock } = setup({
        cpsActive: false,
        newDataStreamIndexExists: false,
      });
      searchMock.mockReturnValueOnce(of(legacyResponse));

      const response = (await lastValueFrom(
        provider.search(actionResultsRequest, {} as never, { request: {} } as never)
      )) as ActionResultsStrategyResponse;

      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(response.edges).toEqual([{ _id: 'legacy' }]);
    });
  });

  describe('action_data.space_id enablement is driven by the provider', () => {
    const namedSpaceActionDataFilter = {
      bool: {
        should: [
          { term: { space_id: 'my-space' } },
          { term: { 'action_data.space_id': 'my-space' } },
        ],
      },
    };

    const factoryRequest = (
      factoryQueryType: FactoryQueryTypes
    ): StrategyRequestType<FactoryQueryTypes> => {
      const common = { factoryQueryType };

      switch (factoryQueryType) {
        case OsqueryQueries.actions:
          return {
            ...common,
            kuery: '',
            pagination: { activePage: 0, cursorStart: 0, querySize: 10 },
            sort: { field: '@timestamp', direction: Direction.desc },
          } as StrategyRequestType<FactoryQueryTypes>;
        case OsqueryQueries.actionDetails:
          return {
            ...common,
            actionId: 'action-1',
            kuery: '',
          } as StrategyRequestType<FactoryQueryTypes>;
        case OsqueryQueries.actionResults:
          return {
            ...common,
            actionId: 'action-1',
            kuery: '',
            startDate: '',
            agentIds: [],
            sort: { field: '@timestamp', direction: Direction.desc },
            pagination: { activePage: 0, cursorStart: 0, querySize: 20 },
            spaceId: 'my-space',
          } as StrategyRequestType<FactoryQueryTypes>;
        case OsqueryQueries.results:
          return resultsRequest as StrategyRequestType<FactoryQueryTypes>;
        case OsqueryQueries.scheduledActionResults:
          return {
            ...common,
            scheduleId: 'schedule-1',
            executionCount: 1,
            pagination: { activePage: 0, cursorStart: 0, querySize: 10 },
            sort: { field: '@timestamp', direction: Direction.desc },
          } as StrategyRequestType<FactoryQueryTypes>;
        case OsqueryQueries.exportResults:
          return {
            ...common,
            baseFilter: 'action_id: "action-1"',
            size: 1000,
          } as StrategyRequestType<FactoryQueryTypes>;
        default:
          return ((_exhaustive: never) => {
            throw new Error(`Unhandled factory query type: ${factoryQueryType}`);
          })(factoryQueryType);
      }
    };

    const collectGlobalAggs = (
      node: unknown,
      found: Array<Record<string, unknown>> = []
    ): Array<Record<string, unknown>> => {
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

    const searchViaProvider = async (factoryQueryType: FactoryQueryTypes) => {
      const { provider, searchMock } = setup({ activeSpaceId: 'my-space' });

      await lastValueFrom(
        provider.search(factoryRequest(factoryQueryType), {} as never, { request: {} } as never)
      );

      return searchMock.mock.calls[0][0].params;
    };

    it.each(Object.values(OsqueryQueries))(
      'applies the action_data.space_id fallback to "%s" only when it is id-bound',
      async (factoryQueryType) => {
        const params = await searchViaProvider(factoryQueryType);
        const filter = params.query.bool.filter as unknown[];

        if (ID_BOUND_FACTORY_QUERY_TYPES.includes(factoryQueryType)) {
          expect(filter).toContainEqual(namedSpaceActionDataFilter);
        } else {
          expect(filter).toContainEqual({ term: { space_id: 'my-space' } });
          expect(filter).not.toContainEqual(namedSpaceActionDataFilter);
        }
      }
    );

    it.each([OsqueryQueries.actionResults, OsqueryQueries.scheduledActionResults])(
      'applies the same action_data.space_id decision to "%s" hits and global aggregations',
      async (factoryQueryType) => {
        const params = await searchViaProvider(factoryQueryType);
        const filter = params.query.bool.filter as unknown[];

        expect(filter).toContainEqual(namedSpaceActionDataFilter);

        const globalAggs = collectGlobalAggs(params.aggs);
        expect(globalAggs.length).toBeGreaterThan(0);

        for (const globalAgg of globalAggs) {
          expect(globalAggMustClauses(globalAgg)).toContainEqual(namedSpaceActionDataFilter);
        }
      }
    );

    it('applies action_data.space_id to both actionResults dual-index searches', async () => {
      // Dual-index selection runs a second enforceSpaceScope on the data-stream
      // DSL. Inspecting only calls[0] would miss a regression that omitted
      // spaceScopeOptions on that second search.
      const { provider, searchMock } = setup({
        activeSpaceId: 'my-space',
        newDataStreamIndexExists: true,
      });

      await lastValueFrom(
        provider.search(
          factoryRequest(OsqueryQueries.actionResults),
          {} as never,
          {
            request: {},
          } as never
        )
      );

      expect(searchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

      for (const [searchRequest] of searchMock.mock.calls) {
        const filter = searchRequest.params.query.bool.filter as unknown[];

        expect(filter).toContainEqual(namedSpaceActionDataFilter);
      }
    });

    it('still matches action_data.space_id on id-bound reads when matchMissingSpaceId is false', async () => {
      const { provider, searchMock } = setup({ activeSpaceId: 'default' });

      await lastValueFrom(
        provider.search(
          { ...resultsRequest, matchMissingSpaceId: false },
          {} as never,
          { request: {} } as never
        )
      );

      const filter = searchMock.mock.calls[0][0].params.query.bool.filter as unknown[];

      expect(filter).toContainEqual({
        bool: {
          should: [
            { term: { space_id: 'default' } },
            { term: { 'action_data.space_id': 'default' } },
          ],
        },
      });
    });

    it('ignores a client-supplied matchActionDataSpaceId on enumerating types', async () => {
      const { provider, searchMock } = setup({ activeSpaceId: 'my-space' });

      await lastValueFrom(
        provider.search(
          {
            ...factoryRequest(OsqueryQueries.actions),
            matchActionDataSpaceId: true,
          } as unknown as StrategyRequestType<FactoryQueryTypes>,
          {} as never,
          { request: {} } as never
        )
      );

      const filter = searchMock.mock.calls[0][0].params.query.bool.filter as unknown[];

      expect(filter).toContainEqual({ term: { space_id: 'my-space' } });
      expect(filter).not.toContainEqual(namedSpaceActionDataFilter);
    });

    it('ignores a client-supplied matchActionDataSpaceId: false on id-bound types', async () => {
      const { provider, searchMock } = setup({ activeSpaceId: 'my-space' });

      await lastValueFrom(
        provider.search(
          {
            ...factoryRequest(OsqueryQueries.results),
            matchActionDataSpaceId: false,
          } as unknown as StrategyRequestType<FactoryQueryTypes>,
          {} as never,
          { request: {} } as never
        )
      );

      const filter = searchMock.mock.calls[0][0].params.query.bool.filter as unknown[];

      expect(filter).toContainEqual(namedSpaceActionDataFilter);
    });
  });
});
