/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { PREBUILT_PACK_RESOLVE_REASON } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { resolvePrebuiltPackRoute } from './resolve_prebuilt_pack_route';
import { PREBUILT_PACK_LOOKUP_PAGE_SIZE } from './find_prebuilt_pack_asset';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

describe('resolvePrebuiltPackRoute', () => {
  const PATH = '/internal/osquery/packs/_resolve_prebuilt/{assetId}';
  let routeHandler: RequestHandler;
  let find: jest.Mock;

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
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue({ find });
  });

  it('is an internal route that requires the read packs privilege', () => {
    const route = setupRoute();

    expect(route.config.access).toBe('internal');
    expect(route.config.security).toEqual({
      authz: { requiredPrivileges: ['osquery-readPacks'] },
    });
  });

  const assetsNamed = (...names: string[]) => ({
    total: names.length,
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

    expect(find).toHaveBeenNthCalledWith(1, {
      type: 'osquery-pack-asset',
      perPage: PREBUILT_PACK_LOOKUP_PAGE_SIZE,
      fields: ['name'],
    });
    expect(find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'osquery-pack',
        hasReference: { type: 'osquery-pack-asset', id: 'osquery_manager-0' },
        fields: ['name'],
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { pack_id: 'random-so-id' } });
  });

  it('accepts an asset id directly', async () => {
    find
      .mockResolvedValueOnce({
        total: 1,
        saved_objects: [{ id: 'osquery_manager-abc', attributes: { name: 'some-pack' } }],
      })
      .mockResolvedValueOnce({ total: 1, saved_objects: [{ id: 'copy' }] });
    setupRoute();

    const response = await run('osquery_manager-abc');

    expect(find).toHaveBeenCalledTimes(2);
    expect(find.mock.calls[1][0].hasReference).toEqual({
      type: 'osquery-pack-asset',
      id: 'osquery_manager-abc',
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { pack_id: 'copy' } });
  });

  it('resolves an asset id even when another asset shares its name', async () => {
    find
      .mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          { id: 'osquery_manager-abc', attributes: { name: 'forensic-persistence' } },
          { id: 'osquery_manager-other', attributes: { name: 'forensic-persistence' } },
        ],
      })
      .mockResolvedValueOnce({ total: 1, saved_objects: [{ id: 'copy' }] });
    setupRoute();

    const response = await run('osquery_manager-abc');

    expect(response.ok).toHaveBeenCalledWith({ body: { pack_id: 'copy' } });
    expect(response.conflict).not.toHaveBeenCalled();
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

  it('returns 404 with an unknown-asset reason when no asset has exactly that name', async () => {
    find.mockResolvedValueOnce(assetsNamed('forensic-persistence-v2'));
    setupRoute();

    const response = await run();

    expect(response.notFound).toHaveBeenCalledWith({
      body: {
        message: 'No prebuilt pack matches forensic-persistence',
        attributes: { reason: PREBUILT_PACK_RESOLVE_REASON.unknownAsset },
      },
    });
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('matches the exact name and ignores a longer name that contains it', async () => {
    find
      .mockResolvedValueOnce({
        total: 2,
        saved_objects: [
          { id: 'osquery_manager-longer', attributes: { name: 'forensic-persistence-extra' } },
          { id: 'osquery_manager-exact', attributes: { name: 'forensic-persistence' } },
        ],
      })
      .mockResolvedValueOnce({ total: 1, saved_objects: [{ id: 'copy' }] });
    setupRoute();

    const response = await run();

    expect(find.mock.calls[1][0].hasReference).toEqual({
      type: 'osquery-pack-asset',
      id: 'osquery_manager-exact',
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { pack_id: 'copy' } });
  });

  it('returns 500 when the asset page is truncated', async () => {
    find.mockResolvedValueOnce({
      total: PREBUILT_PACK_LOOKUP_PAGE_SIZE + 1,
      saved_objects: [
        { id: 'osquery_manager-exact', attributes: { name: 'forensic-persistence' } },
      ],
    });
    setupRoute();

    const response = await run();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: expect.stringContaining('truncated') },
    });
    expect(response.ok).not.toHaveBeenCalled();
    expect(find).toHaveBeenCalledTimes(1);
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

    expect(response.notFound).toHaveBeenCalledWith({
      body: {
        message: 'Prebuilt pack forensic-persistence is not loaded in this space',
        attributes: { reason: PREBUILT_PACK_RESOLVE_REASON.notLoaded },
      },
    });
    expect(response.ok).not.toHaveBeenCalled();
  });
});
