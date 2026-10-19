/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { resolvePrebuiltPackRoute } from './resolve_prebuilt_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('resolvePrebuiltPackRoute', () => {
  const PATH = '/internal/osquery/packs/_resolve_prebuilt/{assetId}';
  let routeHandler: RequestHandler;
  let find: jest.Mock;
  let get: jest.Mock;

  const setupRoute = () => {
    const mockRouter = httpServiceMock.createSetupContract().createRouter();
    resolvePrebuiltPackRoute(mockRouter, {
      logFactory: { get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()) },
    } as unknown as OsqueryAppContext);

    const route = mockRouter.versioned.getRoute('get', PATH);
    routeHandler = route.versions[API_VERSIONS.internal.v1].handler;

    return route;
  };

  const run = async (assetId = 'forensic-persistence') => {
    const request = httpServerMock.createKibanaRequest({ params: { assetId } });
    const response = httpServerMock.createResponseFactory();
    await routeHandler({} as any, request, response);

    return response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    find = jest.fn();
    get = jest.fn().mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue({ find, get });
  });

  it('is an internal route that requires the read packs privilege', () => {
    const route = setupRoute();

    expect(route.config.access).toBe('internal');
    expect(route.config.security).toEqual({
      authz: { requiredPrivileges: ['osquery-readPacks'] },
    });
  });

  const assetsNamed = (...names: string[]) => ({
    saved_objects: names.map((name, index) => ({
      id: `osquery_manager-${index}`,
      attributes: { name },
    })),
  });

  it('resolves a package name to the asset id, then to the space copy by reference', async () => {
    find
      .mockResolvedValueOnce(assetsNamed('forensic-persistence', 'forensic-persistence-extra'))
      .mockResolvedValueOnce({ total: 1, saved_objects: [{ id: 'random-so-id' }] });
    setupRoute();

    const response = await run();

    expect(find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'osquery-pack',
        hasReference: { type: 'osquery-pack-asset', id: 'osquery_manager-0' },
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { pack_id: 'random-so-id' } });
  });

  it('accepts an asset id directly', async () => {
    get.mockResolvedValue({ id: 'osquery_manager-abc' });
    find.mockResolvedValue({ total: 1, saved_objects: [{ id: 'copy' }] });
    setupRoute();

    const response = await run('osquery_manager-abc');

    expect(find).toHaveBeenCalledTimes(1);
    expect(find.mock.calls[0][0].hasReference).toEqual({
      type: 'osquery-pack-asset',
      id: 'osquery_manager-abc',
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { pack_id: 'copy' } });
  });

  it('does not filter on enabled, so a disabled copy resolves', async () => {
    find
      .mockResolvedValueOnce(assetsNamed('forensic-persistence'))
      .mockResolvedValueOnce({ total: 1, saved_objects: [{ id: 'disabled-copy' }] });
    setupRoute();

    await run();

    expect(find.mock.calls[1][0]).not.toHaveProperty('filter');
  });

  it('returns 409 when two assets have the name', async () => {
    find.mockResolvedValueOnce(assetsNamed('forensic-persistence', 'forensic-persistence'));
    setupRoute();

    const response = await run();

    expect(response.conflict).toHaveBeenCalled();
  });

  it('returns 404 when no asset has exactly that name', async () => {
    find.mockResolvedValueOnce(assetsNamed('forensic-persistence-v2'));
    setupRoute();

    const response = await run();

    expect(response.notFound).toHaveBeenCalled();
  });

  it('reads past the first page of phrase matches to find the exact name', async () => {
    const longer = Array.from({ length: 100 }, (_, i) => ({
      id: `osquery_manager-longer-${i}`,
      attributes: { name: `forensic-persistence-${i}` },
    }));
    find
      .mockResolvedValueOnce({ total: 101, saved_objects: longer })
      .mockResolvedValueOnce({
        total: 101,
        saved_objects: [
          { id: 'osquery_manager-exact', attributes: { name: 'forensic-persistence' } },
        ],
      })
      .mockResolvedValueOnce({ total: 1, saved_objects: [{ id: 'copy' }] });
    setupRoute();

    const response = await run();

    expect(find.mock.calls[1][0]).toMatchObject({ type: 'osquery-pack-asset', page: 2 });
    expect(find.mock.calls[2][0].hasReference).toEqual({
      type: 'osquery-pack-asset',
      id: 'osquery_manager-exact',
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { pack_id: 'copy' } });
  });

  it('returns 409 when two packs in the space copy the same asset', async () => {
    find
      .mockResolvedValueOnce(assetsNamed('forensic-persistence'))
      .mockResolvedValueOnce({ total: 2, saved_objects: [{ id: 'copy-1' }] });
    setupRoute();

    const response = await run();

    expect(response.conflict).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('returns 404 when the pack is not loaded in the space', async () => {
    find
      .mockResolvedValueOnce(assetsNamed('forensic-persistence'))
      .mockResolvedValueOnce({ total: 0, saved_objects: [] });
    setupRoute();

    const response = await run();

    expect(response.notFound).toHaveBeenCalled();
    expect(response.ok).not.toHaveBeenCalled();
  });
});
