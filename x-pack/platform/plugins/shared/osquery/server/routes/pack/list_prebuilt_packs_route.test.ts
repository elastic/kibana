/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { PREBUILT_PACK_UNAVAILABLE_REASON } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { listPrebuiltPacksRoute } from './list_prebuilt_packs_route';
import { PREBUILT_PACK_LOOKUP_PAGE_SIZE } from './find_prebuilt_pack_asset';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

interface FakePack {
  id: string;
  attributes: { name?: string; description?: string; queries: unknown };
  references: Array<{ type: string; id: string; name: string }>;
}

const assetRef = (id: string) => ({ type: 'osquery-pack-asset', id, name: 'x' });

describe('listPrebuiltPacksRoute', () => {
  let routeHandler: RequestHandler;
  let find: jest.Mock;
  let assets: Array<{ id: string; attributes: { name?: string } }>;
  let packs: FakePack[];

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

  const packFind = () => find.mock.calls.find(([options]) => options.type === 'osquery-pack')?.[0];

  beforeEach(() => {
    jest.clearAllMocks();
    assets = [];
    packs = [];
    // Behaves like the saved-objects client: the pack read honours the OR reference filter.
    find = jest.fn(async (options) => {
      if (options.type === 'osquery-pack-asset') {
        return { total: assets.length, saved_objects: assets };
      }

      const wanted = new Set(options.hasReference.map(({ id }: { id: string }) => id));
      const savedObjects = packs.filter((pack) => pack.references.some(({ id }) => wanted.has(id)));

      return { total: savedObjects.length, saved_objects: savedObjects };
    });
    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue({ find });
  });

  it('is an internal route that requires the read packs privilege', () => {
    const route = setupRoute();

    expect(route.config.access).toBe('internal');
    expect(route.config.security).toEqual({ authz: { requiredPrivileges: ['osquery-readPacks'] } });
  });

  it('returns the packs that reference a prebuilt pack asset, with the asset id and name', async () => {
    assets = [{ id: 'osquery_manager-1', attributes: { name: 'forensic-persistence' } }];
    packs = [
      {
        id: 'random-1',
        attributes: {
          name: 'forensic-persistence-elastic',
          description: 'Persistence',
          queries: [{ id: 'a' }, { id: 'b' }],
        },
        references: [assetRef('osquery_manager-1')],
      },
    ];
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        data: [
          {
            asset_id: 'osquery_manager-1',
            asset_name: 'forensic-persistence',
            pack_id: 'random-1',
            name: 'forensic-persistence-elastic',
            description: 'Persistence',
            query_count: 2,
            copies: 1,
          },
        ],
      },
    });
  });

  it('reads only the packs that reference an asset, so custom packs cannot crowd them out', async () => {
    assets = [
      { id: 'asset-a', attributes: { name: 'a' } },
      { id: 'asset-b', attributes: { name: 'b' } },
    ];
    packs = [
      ...Array.from({ length: 1500 }, (_, i) => ({
        id: `custom-${i}`,
        attributes: { name: `custom ${i}`, queries: [] },
        references: [],
      })),
      {
        id: 'copy-b',
        attributes: { name: 'b-elastic', queries: [] },
        references: [assetRef('asset-b')],
      },
    ];
    setupRoute();

    const response = await run();

    expect(packFind()).toMatchObject({
      hasReference: [
        { type: 'osquery-pack-asset', id: 'asset-a' },
        { type: 'osquery-pack-asset', id: 'asset-b' },
      ],
      hasReferenceOperator: 'OR',
    });
    const { data } = response.ok.mock.calls[0][0]?.body as { data: Array<{ pack_id: string }> };
    expect(data.map(({ pack_id: packId }) => packId)).toEqual(['copy-b']);
  });

  it('does not sort on the text-mapped name field and returns packs sorted by name', async () => {
    assets = ['zeta', 'alpha'].map((name) => ({ id: name, attributes: { name } }));
    packs = ['zeta', 'alpha'].map((name) => ({
      id: name,
      attributes: { name, queries: [] },
      references: [assetRef(name)],
    }));
    setupRoute();

    const response = await run();

    expect(packFind()).not.toHaveProperty('sortField');
    const { data } = response.ok.mock.calls[0][0]?.body as { data: Array<{ name: string }> };
    expect(data.map(({ name }) => name)).toEqual(['alpha', 'zeta']);
  });

  it('returns an empty list without reading packs when no asset is installed', async () => {
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({ body: { data: [] } });
    expect(packFind()).toBeUndefined();
  });

  it('returns an empty list when assets exist but none is loaded in the space', async () => {
    assets = [{ id: 'asset-a', attributes: { name: 'a' } }];
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({ body: { data: [] } });
  });

  it('uses the asset name when linked packs have no name', async () => {
    assets = [
      { id: 'asset-a', attributes: { name: 'alpha' } },
      { id: 'asset-b', attributes: { name: 'zeta' } },
    ];
    packs = [
      { id: 'copy-a', attributes: { queries: [] }, references: [assetRef('asset-a')] },
      { id: 'copy-b', attributes: { queries: [] }, references: [assetRef('asset-b')] },
    ];
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        data: [
          expect.objectContaining({ pack_id: 'copy-a', name: 'alpha', asset_name: 'alpha' }),
          expect.objectContaining({ pack_id: 'copy-b', name: 'zeta', asset_name: 'zeta' }),
        ],
      },
    });
  });

  it('keeps one row when an asset has more than one copy, marked so the picker can explain the 409', async () => {
    assets = [
      { id: 'asset-a', attributes: { name: 'alpha' } },
      { id: 'asset-b', attributes: { name: 'beta' } },
    ];
    packs = [
      {
        id: 'copy-a1',
        attributes: { name: 'alpha-elastic', queries: [] },
        references: [assetRef('asset-a')],
      },
      {
        id: 'copy-a2',
        attributes: { name: 'alpha-again', queries: [{ id: 'q' }] },
        references: [assetRef('asset-a')],
      },
      {
        id: 'copy-b',
        attributes: { name: 'beta-elastic', queries: [] },
        references: [assetRef('asset-b')],
      },
    ];
    setupRoute();

    const response = await run();

    const { data } = response.ok.mock.calls[0][0]?.body as {
      data: Array<{ pack_id: string; copies: number; unavailable_reason?: string }>;
    };
    expect(data).toEqual([
      expect.objectContaining({
        asset_id: 'asset-a',
        asset_name: 'alpha',
        pack_id: 'copy-a1',
        name: 'alpha-elastic',
        copies: 2,
        unavailable_reason: PREBUILT_PACK_UNAVAILABLE_REASON.duplicateCopies,
      }),
      expect.objectContaining({
        asset_id: 'asset-b',
        pack_id: 'copy-b',
        copies: 1,
      }),
    ]);
    expect(data[1]).not.toHaveProperty('unavailable_reason');
  });

  it('marks every asset that shares a package name', async () => {
    assets = [
      { id: 'asset-a', attributes: { name: 'alpha' } },
      { id: 'asset-b', attributes: { name: 'alpha' } },
      { id: 'asset-c', attributes: { name: 'beta' } },
    ];
    packs = [
      {
        id: 'copy-a',
        attributes: { name: 'alpha-a', queries: [] },
        references: [assetRef('asset-a')],
      },
      {
        id: 'copy-b',
        attributes: { name: 'alpha-b', queries: [] },
        references: [assetRef('asset-b')],
      },
      {
        id: 'copy-c',
        attributes: { name: 'beta', queries: [] },
        references: [assetRef('asset-c')],
      },
    ];
    setupRoute();

    const response = await run();

    const { data } = response.ok.mock.calls[0][0]?.body as {
      data: Array<{ asset_id: string; unavailable_reason?: string; copies: number }>;
    };
    expect(data).toEqual([
      expect.objectContaining({
        asset_id: 'asset-a',
        copies: 1,
        unavailable_reason: PREBUILT_PACK_UNAVAILABLE_REASON.duplicateAssetName,
      }),
      expect.objectContaining({
        asset_id: 'asset-b',
        copies: 1,
        unavailable_reason: PREBUILT_PACK_UNAVAILABLE_REASON.duplicateAssetName,
      }),
      expect.objectContaining({ asset_id: 'asset-c', copies: 1 }),
    ]);
  });

  it('returns 500 when the pack page is truncated', async () => {
    assets = [{ id: 'asset-a', attributes: { name: 'alpha' } }];
    find.mockImplementation(async (options) => {
      if (options.type === 'osquery-pack-asset') {
        return { total: assets.length, saved_objects: assets };
      }

      return {
        total: PREBUILT_PACK_LOOKUP_PAGE_SIZE + 1,
        saved_objects: [
          {
            id: 'copy-a',
            attributes: { name: 'alpha', queries: [] },
            references: [assetRef('asset-a')],
          },
        ],
      };
    });
    setupRoute();

    const response = await run();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: expect.stringContaining('osquery-pack results were truncated') },
    });
    expect(response.ok).not.toHaveBeenCalled();
  });

  it('skips an asset without a name', async () => {
    assets = [{ id: 'nameless', attributes: {} }];
    packs = [
      { id: 'p', attributes: { name: 'p', queries: [] }, references: [assetRef('nameless')] },
    ];
    setupRoute();

    const response = await run();

    expect(response.ok).toHaveBeenCalledWith({ body: { data: [] } });
  });
});
