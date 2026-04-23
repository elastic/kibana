/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import { kibanaResponseFactory } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import type { INpreClient } from '@kbn/cps/server/npre';
import type { CPSServerStart } from '@kbn/cps/server/types';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { initGetSpaceApi } from './get';
import { API_VERSIONS } from '../../../../common';
import { spacesConfig } from '../../../lib/__fixtures__';
import { SpacesClientService } from '../../../spaces_client';
import { SpacesService } from '../../../spaces_service';
import { usageStatsServiceMock } from '../../../usage_stats/usage_stats_service.mock';
import {
  createMockSavedObjectsRepository,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';

describe('GET space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map((s) => ({ id: s.id, ...s.attributes }));

  const setup = async (options?: { cpsStart?: CPSServerStart }) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();
    const versionedRouterMock = router.versioned as MockedVersionedRouter;

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

    const clientService = new SpacesClientService(jest.fn(), 'traditional');
    clientService
      .setup({ config$: Rx.of(spacesConfig) })
      .setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    const usageStatsServicePromise = Promise.resolve(usageStatsServiceMock.createSetupContract());

    const clientServiceStart = clientService.start(
      coreStart,
      featuresPluginMock.createStart(),
      options?.cpsStart
    );

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });

    initGetSpaceApi({
      router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
      isServerless: false,
    });

    const { handler } = versionedRouterMock.getRoute('get', '/api/spaces/space/{id}').versions[
      API_VERSIONS.public.v1
    ];

    return {
      routeHandler: handler,
      mockCpsStart: options?.cpsStart,
    };
  };

  const setupWithCps = async (options: {
    cpsEnabled: boolean;
    expression?: string;
    canGet?: boolean;
  }) => {
    const npreClient: INpreClient = {
      getNpre: jest.fn().mockResolvedValue(options.expression),
      canGetNpre: jest.fn().mockResolvedValue(!!options.canGet),
      putNpre: jest.fn().mockResolvedValue(undefined),
      deleteNpre: jest.fn().mockResolvedValue(undefined),
      canPutNpre: jest.fn().mockResolvedValue(true),
    };

    const mockCpsStart = options.cpsEnabled
      ? {
          createNpreClient: jest.fn().mockReturnValue(npreClient),
        }
      : undefined;

    return {
      ...(await setup({
        cpsStart: mockCpsStart,
      })),
      npreClient,
    };
  };

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
    });

    const response = await routeHandler(
      mockRouteContextWithInvalidLicense,
      request,
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
  });

  it(`returns the space with that id`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'default',
      },
      method: 'get',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(spaces.find((s) => s.id === 'default'));
  });

  it(`'GET spaces/{id}' returns 404 when retrieving a non-existent space`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'not-a-space',
      },
      method: 'get',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(404);
  });

  describe('Cross-project search', () => {
    it('returns the space with projectRouting when CPS is enabled', async () => {
      const { routeHandler, npreClient } = await setupWithCps({
        cpsEnabled: true,
        expression: 'project:test-project',
        canGet: true,
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: 'default',
        },
        method: 'get',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(response.status).toEqual(200);
      expect(response.payload).toMatchObject({
        id: 'default',
        projectRouting: 'project:test-project',
      });
      expect(npreClient.getNpre).toHaveBeenCalledWith('kibana_space_default_default');
    });

    it("returns the space without projectRouting when CPS is enabled but the user can't read NPRE", async () => {
      const { routeHandler, npreClient } = await setupWithCps({
        cpsEnabled: true,
        expression: 'project:test-project',
        canGet: false,
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: 'default',
        },
        method: 'get',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(response.status).toEqual(200);
      expect(response.payload).toEqual(spaces.find((s) => s.id === 'default'));
      expect(response.payload.projectRouting).toBeUndefined();
      expect(npreClient.canGetNpre).toHaveBeenCalled();
      expect(npreClient.getNpre).not.toHaveBeenCalled();
    });

    it('returns the space without projectRouting when CPS is disabled', async () => {
      const { routeHandler, npreClient } = await setupWithCps({
        cpsEnabled: false,
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: 'default',
        },
        method: 'get',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      expect(response.status).toEqual(200);
      expect(response.payload).toEqual(spaces.find((s) => s.id === 'default'));
      expect(response.payload.projectRouting).toBeUndefined();
      expect(npreClient.getNpre).not.toHaveBeenCalled();
    });
  });
});
