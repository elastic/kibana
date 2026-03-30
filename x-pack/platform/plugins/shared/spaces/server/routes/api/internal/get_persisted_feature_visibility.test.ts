/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { initGetPersistedFeatureVisibilityApi } from './get_persisted_feature_visibility';
import { spacesConfig } from '../../../lib/__fixtures__';
import { SpacesClientService } from '../../../spaces_client';
import { SpacesService } from '../../../spaces_service';
import {
  createMockSavedObjectsRepository,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';

describe('GET /internal/spaces/space/{id}/persisted_feature_visibility', () => {
  const setup = async (options?: { spacesSavedObjects?: any[] }) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(
      options?.spacesSavedObjects ?? createSpaces()
    );

    const clientService = new SpacesClientService(jest.fn(), 'traditional');
    clientService
      .setup({ config$: Rx.of(spacesConfig) })
      .setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    const clientServiceStart = clientService.start(
      coreStart,
      featuresPluginMock.createStart(),
      undefined
    );

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });

    initGetPersistedFeatureVisibilityApi({
      router,
      getSpacesService: () => spacesServiceStart,
    });

    const [routeDefinition, routeHandler] = router.get.mock.calls[0];

    return {
      routeDefinition,
      routeHandler,
      routeContext: mockRouteContext,
    };
  };

  it(`returns http/403 when the license is invalid`, async () => {
    const { routeHandler, routeContext } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      params: { id: 'mySpace' },
    });

    const response = await routeHandler(
      { ...routeContext, ...mockRouteContextWithInvalidLicense },
      request,
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
  });

  it('returns http/200 with stored disabledFeatures for classic solution', async () => {
    const { routeHandler, routeContext } = await setup({
      spacesSavedObjects: [
        {
          id: 'mySpace',
          attributes: {
            name: 'mySpace',
            disabledFeatures: ['feature_1', 'feature_2'],
          },
        },
      ],
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      params: { id: 'mySpace' },
    });

    const response = await routeHandler(routeContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({
      featureVisibility: { disabledFeatures: ['feature_1', 'feature_2'] },
    });
  });

  it('returns http/200 with empty disabledFeatures when missing from attributes', async () => {
    const { routeHandler, routeContext } = await setup({
      spacesSavedObjects: [{ id: 'mySpace', attributes: { name: 'mySpace' } }],
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      params: { id: 'mySpace' },
    });

    const response = await routeHandler(routeContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({
      featureVisibility: { disabledFeatures: [] },
    });
  });

  it('returns http/404 when retrieving a non-existent space', async () => {
    const { routeHandler, routeContext } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      params: { id: 'not-a-space' },
    });

    const response = await routeHandler(routeContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(404);
  });
});
