/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { InitialSolutionSetupRouteDeps, InternalRouteDeps } from '.';
import { initCompleteInitialSolutionSetupApi } from './complete_initial_solution_setup';
import { SOLUTION_VIEW_CLASSIC } from '../../../../common/constants';
import type { InitialSolutionSetupService } from '../../../initial_solution_setup/initial_solution_setup_service';
import { spacesClientMock } from '../../../spaces_client/spaces_client.mock';
import { mockRouteContext, mockRouteContextWithInvalidLicense } from '../__fixtures__';

describe('POST /internal/spaces/_complete_initial_solution_setup', () => {
  const setup = (completeImpl?: InitialSolutionSetupService['complete']) => {
    const router = httpServiceMock.createRouter();
    const spacesClient = spacesClientMock.create();
    const getSpacesService = jest.fn().mockReturnValue({
      createSpacesClient: jest.fn().mockReturnValue(spacesClient),
    });
    const initialSolutionSetup = {
      isRequired: jest.fn(),
      complete: jest.fn(completeImpl ?? jest.fn().mockResolvedValue(undefined)),
    } as unknown as InitialSolutionSetupService;

    initCompleteInitialSolutionSetupApi({
      router,
      getSpacesService,
      initialSolutionSetup,
    } as InternalRouteDeps & InitialSolutionSetupRouteDeps);

    return {
      routeHandler: router.post.mock.calls[0][1],
      initialSolutionSetup,
      spacesClient,
      getSpacesService,
    };
  };

  it.each([
    ['classic', SOLUTION_VIEW_CLASSIC],
    ['es', 'es'],
    ['oblt', 'oblt'],
    ['security', 'security'],
  ] as const)('returns http/200 with the selected %s solution', async (_label, solution) => {
    const { routeHandler, initialSolutionSetup, spacesClient, getSpacesService } = setup();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      body: { solution },
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(200);
    expect(response.payload).toEqual({ solution });
    expect(getSpacesService().createSpacesClient).toHaveBeenCalledWith(request);
    expect(initialSolutionSetup.complete).toHaveBeenCalledWith(spacesClient, solution);
  });

  it('returns http/403 when the license is invalid', async () => {
    const { routeHandler, initialSolutionSetup } = setup();

    const response = await routeHandler(
      mockRouteContextWithInvalidLicense,
      httpServerMock.createKibanaRequest({
        method: 'post',
        body: { solution: 'es' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
    expect(initialSolutionSetup.complete).not.toHaveBeenCalled();
  });

  it('returns http/404 when the default space is missing', async () => {
    const { routeHandler } = setup(async () => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('space', DEFAULT_SPACE_ID);
    });

    const response = await routeHandler(
      mockRouteContext,
      httpServerMock.createKibanaRequest({
        method: 'post',
        body: { solution: 'es' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(404);
  });

  it('returns http/409 when setup is already complete', async () => {
    const { routeHandler } = setup(async () => {
      throw Boom.conflict('Initial solution setup is already complete');
    });

    const response = await routeHandler(
      mockRouteContext,
      httpServerMock.createKibanaRequest({
        method: 'post',
        body: { solution: 'es' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(409);
    expect(response.payload.message).toEqual('Initial solution setup is already complete');
  });

  it('returns http/403 when initial solution setup is disabled', async () => {
    const { routeHandler } = setup(async () => {
      throw Boom.forbidden('Initial solution setup is disabled');
    });

    const response = await routeHandler(
      mockRouteContext,
      httpServerMock.createKibanaRequest({
        method: 'post',
        body: { solution: 'es' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload.message).toEqual('Initial solution setup is disabled');
  });
});
