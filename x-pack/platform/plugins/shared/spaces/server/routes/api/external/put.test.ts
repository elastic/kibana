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

import { initPutSpacesApi } from './put';
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

describe('PUT /api/spaces/space', () => {
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

    initPutSpacesApi({
      router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
      isServerless: false,
    });

    const { handler, config } = versionedRouterMock.getRoute('put', '/api/spaces/space/{id}')
      .versions[API_VERSIONS.public.v1];

    return {
      routeValidation: (config.validate as any).request as RouteValidatorConfig<{}, {}, {}>,
      routeHandler: handler,
      savedObjectsRepositoryMock,
      mockCpsStart: options?.cpsStart,
    };
  };

  const setupWithCps = async (options: {
    cpsEnabled: boolean;
    canPut?: boolean;
    expression?: string;
  }) => {
    const npreClient: INpreClient = {
      getNpre: jest.fn().mockResolvedValue(options.expression),
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

  it('should update an existing space with the provided ID', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
      disabledFeatures: [],
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      name: 'my updated space',
      description: 'with a description',
      disabledFeatures: [],
    });
  });

  it('should allow an empty description', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: '',
      disabledFeatures: ['foo'],
    };

    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      name: 'my updated space',
      description: '',
      disabledFeatures: ['foo'],
    });
  });

  it('should not require disabledFeatures', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: '',
    };

    const { routeHandler, routeValidation, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: (routeValidation.body as ObjectType).validate(payload),
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
      name: 'my updated space',
      description: '',
      disabledFeatures: [],
    });
  });

  it('should not allow a new space to be created', async () => {
    const payload = {
      id: 'a-new-space',
      name: 'my new space',
      description: 'with a description',
      disabledFeatures: [],
    };

    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: payload.id,
      },
      body: payload,
      method: 'post',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(404);
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

  describe('Cross-project search', () => {
    it('updates the space with projectRouting when CPS is enabled and user has permission', async () => {
      const payload = {
        id: 'a-space',
        name: 'my updated space',
        description: 'with a description',
        disabledFeatures: ['foo'],
        projectRouting: 'project:test-project',
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canPut: true,
        expression: 'project:old-project',
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: payload.id,
        },
        body: payload,
        method: 'put',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
      expect(npreClient.canPutNpre).toHaveBeenCalled();
      expect(npreClient.putNpre).toHaveBeenCalledWith(
        'kibana_space_a-space_default',
        'project:test-project'
      );
    });

    it('does not update NPRE when CPS is enabled and user does not have permission to update NPRE', async () => {
      const payload = {
        id: 'a-space',
        name: 'my updated space',
        description: 'with a description',
        disabledFeatures: ['foo'],
        projectRouting: 'project:test-project',
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canPut: false,
        expression: 'project:old-project',
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: payload.id,
        },
        body: payload,
        method: 'put',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsRepositoryMock.update).toHaveBeenCalled();
      expect(npreClient.canPutNpre).toHaveBeenCalled();
      expect(npreClient.putNpre).not.toHaveBeenCalled();
    });

    it('updates the space without projectRouting when CPS is enabled and user does not submit projectRouting', async () => {
      const payload = {
        id: 'a-space',
        name: 'my updated space',
        description: 'with a description',
        disabledFeatures: ['foo'],
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canPut: false,
        expression: 'project:old-project',
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: payload.id,
        },
        body: payload,
        method: 'put',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
      expect(npreClient.canPutNpre).not.toHaveBeenCalled();
      expect(npreClient.putNpre).not.toHaveBeenCalled();
    });

    it('updates the space without projectRouting when CPS is disabled', async () => {
      const payload = {
        id: 'a-space',
        name: 'my updated space',
        description: 'with a description',
        disabledFeatures: ['foo'],
      };

      const { routeHandler, savedObjectsRepositoryMock, npreClient } = await setupWithCps({
        cpsEnabled: false,
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: payload.id,
        },
        body: payload,
        method: 'put',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(200);
      expect(savedObjectsRepositoryMock.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsRepositoryMock.update).toHaveBeenCalledWith('space', 'a-space', {
        name: 'my updated space',
        description: 'with a description',
        disabledFeatures: ['foo'],
      });
      expect(npreClient.canPutNpre).not.toHaveBeenCalled();
      expect(npreClient.putNpre).not.toHaveBeenCalled();
    });
  });
});
