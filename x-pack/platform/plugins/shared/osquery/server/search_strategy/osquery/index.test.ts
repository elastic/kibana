/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, lastValueFrom } from 'rxjs';
import { OsqueryQueries } from '../../../common/search_strategy/osquery';
import type { StrategyRequestType } from '../../../common/search_strategy/osquery';
import { Direction } from '../../../common/search_strategy';
import type { ActionResultsStrategyResponse } from '../../../common/search_strategy';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import {
  ACTION_RESPONSES_DATA_STREAM_INDEX,
  OSQUERY_INTEGRATION_NAME,
} from '../../../common/constants';
import { OSQUERY_SEARCH_STRATEGY_AUTHZ_ERROR } from '../constants';
import { hasConnectedRemoteClusters } from '../../utils/ccs_utils';
import { osquerySearchStrategyProvider } from '.';

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
  }: {
    authorizedPrivileges?: string[];
    useRbac?: boolean;
    activeSpaceId?: string | null;
    actionsIndexExists?: boolean;
    newDataStreamIndexExists?: boolean;
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
    } as unknown as Pick<OsqueryAppContext, 'security' | 'service'>;

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

    expect(filter).toContainEqual({ term: { space_id: 'my-space' } });
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
        ],
      },
    });
  });

  it('uses the active space when the request includes a spaceId', async () => {
    const filter = await runResultsSearch('active-space', 'request-space');

    expect(filter).toContainEqual({ term: { space_id: 'active-space' } });
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
  });
});
