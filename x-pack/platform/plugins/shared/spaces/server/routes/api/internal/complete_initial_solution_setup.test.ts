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

import type { InitialSolutionSetupRouteDeps } from '.';
import { initCompleteInitialSolutionSetupApi } from './complete_initial_solution_setup';
import { SOLUTION_VIEW_CLASSIC } from '../../../../common/constants';
import { InitialSolutionSetupService } from '../../../initial_solution_setup/initial_solution_setup_service';
import { spacesClientMock } from '../../../spaces_client/spaces_client.mock';
import { mockRouteContext, mockRouteContextWithInvalidLicense } from '../__fixtures__';

describe('POST /internal/spaces/_complete_initial_solution_setup', () => {
  const setup = (options: { eligible?: boolean } = {}) => {
    const router = httpServiceMock.createRouter();
    const spacesClient = spacesClientMock.create();
    spacesClient.completeInitialSolutionSetup.mockResolvedValue(undefined);
    const getSpacesService = jest.fn().mockReturnValue({
      createSpacesClient: jest.fn().mockReturnValue(spacesClient),
    });
    const initialSolutionSetup = new InitialSolutionSetupService(options.eligible ?? true);
    jest.spyOn(initialSolutionSetup, 'markComplete');

    initCompleteInitialSolutionSetupApi({
      router,
      getSpacesService,
      initialSolutionSetup,
    } as InitialSolutionSetupRouteDeps);

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
    expect(spacesClient.completeInitialSolutionSetup).toHaveBeenCalledWith(solution);
    expect(initialSolutionSetup.markComplete).toHaveBeenCalled();
  });

  it('returns http/403 when the license is invalid', async () => {
    const { routeHandler, spacesClient } = setup();

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
    expect(spacesClient.completeInitialSolutionSetup).not.toHaveBeenCalled();
  });

  it('returns http/404 when the default space is missing', async () => {
    const { routeHandler, spacesClient } = setup();
    spacesClient.completeInitialSolutionSetup.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('space', DEFAULT_SPACE_ID)
    );

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
    const { routeHandler, spacesClient } = setup();
    spacesClient.completeInitialSolutionSetup.mockRejectedValue(
      Boom.conflict('Initial solution setup is already complete')
    );

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

  it('returns http/403 when initial solution setup is not eligible', async () => {
    const { routeHandler, spacesClient, initialSolutionSetup } = setup({ eligible: false });

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
    expect(spacesClient.completeInitialSolutionSetup).not.toHaveBeenCalled();
    expect(initialSolutionSetup.markComplete).not.toHaveBeenCalled();
  });
});
