/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import type { ObjectType } from '@kbn/config-schema';
import type { RouteValidatorConfig } from '@kbn/core/server';
import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import type { INpreClient } from '@kbn/cps/server/npre';
import type { CPSServerSetup, CPSServerStart } from '@kbn/cps/server/types';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { initDeleteSpacesApi } from './delete';
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

  const setup = async (options?: { cpsSetup?: CPSServerSetup; cpsStart?: CPSServerStart }) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();
    const versionedRouterMock = router.versioned as MockedVersionedRouter;
    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const log = loggingSystemMock.create().get('spaces');

    const coreStart = coreMock.createStart();

    const clientService = new SpacesClientService(jest.fn(), 'traditional');
    clientService
      .setup({ config$: Rx.of(spacesConfig) }, options?.cpsSetup)
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

    initDeleteSpacesApi({
      router,
      getStartServices: async () => [coreStart, {}, {}],
      log,
      getSpacesService: () => spacesServiceStart,
      usageStatsServicePromise,
      isServerless: false,
    });

    const { handler: routeHandler, config } = versionedRouterMock.getRoute(
      'delete',
      '/api/spaces/space/{id}'
    ).versions[API_VERSIONS.public.v1];

    return {
      routeValidation: (config.validate as any).request as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
      savedObjectsRepositoryMock,
      mockCpsSetup: options?.cpsSetup,
      mockCpsStart: options?.cpsStart,
    };
  };

  const setupWithCps = async (options: {
    cpsEnabled: boolean;
    canDelete?: boolean;
    expression?: string;
  }) => {
    const mockCpsSetup = {
      getCpsEnabled: jest.fn().mockReturnValue(options.cpsEnabled),
    };

    const npreClient: INpreClient = {
      getNpre: jest.fn().mockResolvedValue(options.expression),
      putNpre: jest.fn().mockResolvedValue(undefined),
      deleteNpre: jest.fn().mockResolvedValue(undefined),
      canPutNpre: jest.fn().mockResolvedValue(true),
      canDeleteNpre: jest.fn().mockResolvedValue(options.canDelete),
    };

    const mockCpsStart = {
      createNpreClient: jest.fn().mockReturnValue(npreClient),
    };

    return {
      ...(await setup({
        cpsSetup: mockCpsSetup,
        cpsStart: mockCpsStart,
      })),
      npreClient,
    };
  };

  it('requires a space id as part of the path', async () => {
    const { routeValidation } = await setup();
    expect(() =>
      (routeValidation.params as ObjectType).validate({})
    ).toThrowErrorMatchingInlineSnapshot(
      `"[id]: expected value of type [string] but got [undefined]"`
    );
  });

  it(`deletes the space`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      method: 'delete',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(204);
  });

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      method: 'delete',
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

  it('throws when deleting a non-existent space', async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'not-a-space',
      },
      method: 'delete',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status } = response;

    expect(status).toEqual(404);
  });

  it(`returns http/400 when scripts cannot be executed in Elasticsearch`, async () => {
    const { routeHandler, savedObjectsRepositoryMock } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'a-space',
      },
      method: 'delete',
    });
    // @ts-ignore
    savedObjectsRepositoryMock.deleteByNamespace.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateEsCannotExecuteScriptError(new Error())
    );
    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status, payload } = response;

    expect(status).toEqual(400);
    expect(payload.message).toEqual('Cannot execute script in Elasticsearch query');
  });

  it(`DELETE spaces/{id}' cannot delete reserved spaces`, async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        id: 'default',
      },
      method: 'delete',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    const { status, payload } = response;

    expect(status).toEqual(400);
    expect(payload.message).toEqual('The default space cannot be deleted because it is reserved.');
  });

  describe('Cross-project search', () => {
    it('deletes the NPRE when CPS is enabled and user has permission', async () => {
      const { routeHandler, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canDelete: true,
        expression: 'some-expression',
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: 'a-space',
        },
        method: 'delete',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(204);
      expect(npreClient.canDeleteNpre).toHaveBeenCalled();
      expect(npreClient.deleteNpre).toHaveBeenCalledWith('kibana_space_a-space_default');
    });

    it('returns 403 if the user does not have permission to delete the NPRE', async () => {
      const { routeHandler, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canDelete: false,
        expression: 'some-expression',
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: 'a-space',
        },
        method: 'delete',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(403);
      expect(npreClient.canDeleteNpre).toHaveBeenCalled();
      expect(npreClient.deleteNpre).not.toHaveBeenCalled();
    });

    it('returns 204 when user does not have permission to delete the NPRE but it does not exist', async () => {
      const { routeHandler, npreClient } = await setupWithCps({
        cpsEnabled: true,
        canDelete: false,
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: 'a-space',
        },
        method: 'delete',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(204);
      expect(npreClient.canDeleteNpre).toHaveBeenCalled();
      expect(npreClient.getNpre).toHaveBeenCalledWith('kibana_space_a-space_default');
      expect(npreClient.deleteNpre).not.toHaveBeenCalled();
    });

    it('does not call delete NPRE when CPS is disabled', async () => {
      const { routeHandler, npreClient } = await setupWithCps({
        cpsEnabled: false,
      });

      const request = httpServerMock.createKibanaRequest({
        params: {
          id: 'a-space',
        },
        method: 'delete',
      });

      const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

      const { status } = response;

      expect(status).toEqual(204);
      expect(npreClient.canDeleteNpre).not.toHaveBeenCalled();
      expect(npreClient.deleteNpre).not.toHaveBeenCalled();
    });
  });
});
