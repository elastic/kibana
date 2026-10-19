/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { listPrebuiltPacksRoute } from './list_prebuilt_packs_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('listPrebuiltPacksRoute', () => {
  let routeHandler: RequestHandler;
  let find: jest.Mock;
  let bulkGet: jest.Mock;

  const setupRoute = () => {
    const mockRouter = httpServiceMock.createSetupContract().createRouter();
    listPrebuiltPacksRoute(mockRouter, {
      logFactory: { get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()) },
    } as unknown as OsqueryAppContext);
    const route = mockRouter.versioned.getRoute('get', '/internal/osquery/packs/_prebuilt');
    routeHandler = route.versions[API_VERSIONS.internal.v1].handler;

    return route;
  };

  const run = async () => {
    const response = httpServerMock.createResponseFactory();
    await routeHandler({} as any, httpServerMock.createKibanaRequest(), response);

    return response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    find = jest.fn();
    bulkGet = jest.fn(async (objects: Array<{ id: string }>) => ({
      saved_objects: objects.map(({ id }) => ({ id, attributes: { name: `name-of-${id}` } })),
    }));
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue({ find, bulkGet });
  });

  it('is an internal route that requires the read packs privilege', () => {
    const route = setupRoute();

    expect(route.config.access).toBe('internal');
    expect(route.config.security).toEqual({ authz: { requiredPrivileges: ['osquery-readPacks'] } });
  });

  it('returns only packs that reference a prebuilt pack asset, with the asset id', async () => {
    find.mockResolvedValue({
      saved_objects: [
        {
          id: 'random-1',
          attributes: {
            name: 'forensic-persistence-elastic',
            description: 'Persistence',
            queries: [{ id: 'a' }, { id: 'b' }],
          },
          references: [{ type: 'osquery-pack-asset', id: 'forensic-persistence', name: 'x' }],
        },
        {
          id: 'custom',
          attributes: { name: 'my pack', queries: [{ id: 'a' }] },
          references: [],
        },
      ],
    });
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        data: [
          {
            asset_id: 'forensic-persistence',
            asset_name: 'name-of-forensic-persistence',
            pack_id: 'random-1',
            name: 'forensic-persistence-elastic',
            description: 'Persistence',
            query_count: 2,
          },
        ],
      },
    });
  });

  it('does not sort on the text-mapped name field and returns packs sorted by name', async () => {
    find.mockResolvedValue({
      saved_objects: ['zeta', 'alpha'].map((name) => ({
        id: name,
        attributes: { name, queries: [] },
        references: [{ type: 'osquery-pack-asset', id: name, name: 'x' }],
      })),
    });
    setupRoute();

    const response = await run();

    expect(find.mock.calls[0][0]).not.toHaveProperty('sortField');
    const { data } = response.ok.mock.calls[0][0]?.body as { data: Array<{ name: string }> };
    expect(data.map(({ name }) => name)).toEqual(['alpha', 'zeta']);
  });

  it('returns an empty list when no prebuilt packs are loaded', async () => {
    find.mockResolvedValue({ saved_objects: [] });
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({ body: { data: [] } });
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it('skips a pack whose asset no longer exists', async () => {
    find.mockResolvedValue({
      saved_objects: [
        {
          id: 'orphan',
          attributes: { name: 'orphan', queries: [] },
          references: [{ type: 'osquery-pack-asset', id: 'gone', name: 'x' }],
        },
      ],
    });
    bulkGet.mockResolvedValue({ saved_objects: [{ id: 'gone', error: { statusCode: 404 } }] });
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({ body: { data: [] } });
  });
});
