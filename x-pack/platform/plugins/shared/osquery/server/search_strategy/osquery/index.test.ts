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
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OSQUERY_SEARCH_STRATEGY_AUTHZ_ERROR } from '../constants';
import { osquerySearchStrategyProvider } from '.';

jest.mock('@kbn/data-plugin/server', () => ({
  shimHitsTotal: (rawResponse: unknown) => rawResponse,
}));

jest.mock('../../utils/ccs_utils', () => ({
  hasConnectedRemoteClusters: jest.fn().mockResolvedValue(false),
  prefixIndexPatternsWithCcs: (index: string) => index,
}));

const emptyRawResponse = {
  rawResponse: { hits: { total: 0, hits: [] } },
};

describe('osquerySearchStrategyProvider space scoping', () => {
  const setup = ({
    hasAllRequested = true,
    useRbac = true,
    activeSpaceId = 'default',
  }: {
    hasAllRequested?: boolean;
    useRbac?: boolean;
    activeSpaceId?: string | null;
  } = {}) => {
    const searchMock = jest.fn().mockReturnValue(of(emptyRawResponse));
    const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested });
    const checkPrivilegesDynamicallyWithRequest = jest.fn().mockReturnValue(checkPrivileges);
    const getApiAction = jest.fn((privilege: string) => `api:${privilege}`);
    const getActiveSpace = jest
      .fn()
      .mockResolvedValue(activeSpaceId === null ? undefined : { id: activeSpaceId });

    const data = {
      search: {
        searchAsInternalUser: { search: searchMock, cancel: jest.fn() },
        getSearchStrategy: jest.fn(),
      },
    } as any;

    const esClient = {
      asInternalUser: {
        indices: { exists: jest.fn().mockResolvedValue(false) },
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

  it('handles requests without Osquery read access', async () => {
    const { checkPrivileges, getActiveSpace, getApiAction, provider, searchMock } = setup({
      hasAllRequested: false,
    });

    await expect(search(provider)).rejects.toMatchObject({
      message: OSQUERY_SEARCH_STRATEGY_AUTHZ_ERROR,
      statusCode: 403,
    });

    expect(getApiAction).toHaveBeenCalledWith('osquery-read');
    expect(checkPrivileges).toHaveBeenCalledWith({ kibana: ['api:osquery-read'] });
    expect(getActiveSpace).not.toHaveBeenCalled();
    expect(searchMock).not.toHaveBeenCalled();
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
});
