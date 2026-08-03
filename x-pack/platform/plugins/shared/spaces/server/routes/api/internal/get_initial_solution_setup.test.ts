/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { InitialSolutionSetupRouteDeps } from '.';
import { initGetInitialSolutionSetupApi } from './get_initial_solution_setup';
import { InitialSolutionSetupService } from '../../../initial_solution_setup/initial_solution_setup_service';
import { spacesClientMock } from '../../../spaces_client/spaces_client.mock';
import { mockRouteContext, mockRouteContextWithInvalidLicense } from '../__fixtures__';

describe('GET /internal/spaces/_initial_solution_setup', () => {
  const setup = (isRequired: boolean | Error = true) => {
    const router = httpServiceMock.createRouter();
    const spacesClient = spacesClientMock.create();
    const getSpacesService = jest.fn().mockReturnValue({
      createSpacesClient: jest.fn().mockReturnValue(spacesClient),
    });
    const initialSolutionSetup = new InitialSolutionSetupService(true);
    jest
      .spyOn(initialSolutionSetup, 'isRequired')
      .mockImplementation(() =>
        isRequired instanceof Error ? Promise.reject(isRequired) : Promise.resolve(isRequired)
      );

    initGetInitialSolutionSetupApi({
      router,
      getSpacesService,
      initialSolutionSetup,
    } as InitialSolutionSetupRouteDeps);

    return {
      routeHandler: router.get.mock.calls[0][1],
      initialSolutionSetup,
      spacesClient,
      getSpacesService,
    };
  };

  it('returns http/200 with required true when setup is pending', async () => {
    const { routeHandler, initialSolutionSetup, spacesClient, getSpacesService } = setup(true);
    const request = httpServerMock.createKibanaRequest({ method: 'get' });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({ required: true });
    expect(getSpacesService().createSpacesClient).toHaveBeenCalledWith(request);
    expect(initialSolutionSetup.isRequired).toHaveBeenCalledWith(spacesClient);
  });

  it('returns http/200 with required false when setup is not pending', async () => {
    const { routeHandler, initialSolutionSetup, spacesClient } = setup(false);

    const response = await routeHandler(
      mockRouteContext,
      httpServerMock.createKibanaRequest({ method: 'get' }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({ required: false });
    expect(initialSolutionSetup.isRequired).toHaveBeenCalledWith(spacesClient);
  });

  it('returns http/403 when the license is invalid', async () => {
    const { routeHandler, initialSolutionSetup } = setup(true);

    const response = await routeHandler(
      mockRouteContextWithInvalidLicense,
      httpServerMock.createKibanaRequest({ method: 'get' }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
    expect(initialSolutionSetup.isRequired).not.toHaveBeenCalled();
  });

  it('propagates non-not-found errors from the service', async () => {
    const { routeHandler } = setup(new Error('setup check failed'));

    const response = await routeHandler(
      mockRouteContext,
      httpServerMock.createKibanaRequest({ method: 'get' }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(500);
  });

  it('returns http/200 with required false when service soft-fails not-found', async () => {
    // Service handles not-found; route should receive false from isRequired.
    const router = httpServiceMock.createRouter();
    const spacesClient = spacesClientMock.create();
    spacesClient.isInitialSolutionSetupRequired.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('space', DEFAULT_SPACE_ID)
    );
    const getSpacesService = jest.fn().mockReturnValue({
      createSpacesClient: jest.fn().mockReturnValue(spacesClient),
    });
    const initialSolutionSetup = new InitialSolutionSetupService(true);

    initGetInitialSolutionSetupApi({
      router,
      getSpacesService,
      initialSolutionSetup,
    } as InitialSolutionSetupRouteDeps);

    const routeHandler = router.get.mock.calls[0][1];
    const response = await routeHandler(
      mockRouteContext,
      httpServerMock.createKibanaRequest({ method: 'get' }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({ required: false });
  });
});
