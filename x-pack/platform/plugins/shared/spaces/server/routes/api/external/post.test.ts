/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { ObjectType } from '@kbn/config-schema';
import type { RouteValidatorConfig } from '@kbn/core/server';
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

import { initPostSpacesApi } from './post';
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

describe('Spaces Public API', () => {
  const spacesSavedObjects = createSpaces();

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

    initPostSpacesApi({
      router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
      isServerless: false,
    });

    const { handler, config } = versionedRouterMock.getRoute('post', '/api/spaces/space').versions[
      API_VERSIONS.public.v1
    ];

    return {
      routeValidation: (config.validate as any).request as RouteValidatorConfig<{}, {}, {}>,
      routeHandler: handler,
      savedObjectsRepositoryMock,
      mockCpsStart: options?.cpsStart,
    };
  };

  const setupWithCps = async (options: { cpsEnabled: boolean; canPut?: boolean }) => {
    const npreClient: INpreClient = {
      getNpre: jest.fn().mockResolvedValue(undefined),
      canGetNpre: jest.fn().mockResolvedValue(false),
      putNpre: jest.fn().mockResolvedValue(undefined),
      deleteNpre: jest.fn().mockResolvedValue(undefined),
      canPutNpre: jest.fn().mockResolvedValue(options.canPut),
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

  it('should create a new space with the provided ID', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
      disabledFeatures: ['foo'],
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description', disabledFeatures: ['foo'] },
      { id: 'my-space-id' }
    );
  });

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
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

  it('should not allow a space to be updated', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
      disabledFeatures: [],
    };

    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status, payload: responsePayload } = response;

    expect(status).toEqual(409);
    expect(responsePayload.message).toEqual('A space with the identifier a-space already exists.');
  });

  it('should not require disabledFeatures to be specified', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
      disabledFeatures: [],
    };

    const { routeValidation, routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      body: (routeValidation.body as ObjectType).validate(payload),
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description', disabledFeatures: [] },
      { id: 'my-space-id' }
    );
  });

  describe('Cross-project search', () => {
    it('creates the space with projectRouting when CPS is enabled and user has permission', async () => {
      const payload = {
        id: 'my-space-id',
        name: 'my new space',
        description: 'with a description',
        disabledFeatures: ['foo'],
        projectRouting: 'project:test-project',
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canPut: true,
      });

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
      expect(npreClient.canPutNpre).toHaveBeenCalled();
      expect(npreClient.putNpre).toHaveBeenCalledWith(
        'kibana_space_my-space-id_default',
        'project:test-project'
      );
    });

    it('creates the space without projectRouting when CPS is enabled and user does not submit projectRouting NPRE', async () => {
      const payload = {
        id: 'my-space-id',
        name: 'my new space',
        description: 'with a description',
        disabledFeatures: ['foo'],
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canPut: false,
      });

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
      expect(npreClient.canPutNpre).not.toHaveBeenCalled();
      expect(npreClient.putNpre).not.toHaveBeenCalled();
    });

    it('returns 403 when CPS is enabled and user does not have permission to create NPRE', async () => {
      const payload = {
        id: 'my-space-id',
        name: 'my new space',
        description: 'with a description',
        disabledFeatures: ['foo'],
        projectRouting: 'project:test-project',
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canPut: false,
      });

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(403);
      expect(savedObjectsRepositoryMock.create).not.toHaveBeenCalled();
      expect(npreClient.canPutNpre).toHaveBeenCalled();
      expect(npreClient.putNpre).not.toHaveBeenCalled();
    });

    it('creates the space without projectRouting when CPS is disabled', async () => {
      const payload = {
        id: 'my-space-id',
        name: 'my new space',
        description: 'with a description',
        disabledFeatures: ['foo'],
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: false,
      });

      const request = httpServerMock.createKibanaRequest({
        body: payload,
        method: 'post',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
      expect(savedObjectsRepositoryMock.create).toHaveBeenCalledWith(
        'space',
        { name: 'my new space', description: 'with a description', disabledFeatures: ['foo'] },
        { id: 'my-space-id' }
      );
      expect(npreClient.canPutNpre).not.toHaveBeenCalled();
      expect(npreClient.putNpre).not.toHaveBeenCalled();
    });
  });
});
