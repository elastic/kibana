/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { FIXTURE_POLICY } from '@kbn/ols/src/__fixtures__';

import type { OlsService } from '../../../authorization/ols/ols_service';
import { scopedOlsServiceMock } from '../../../authorization/ols/scoped_ols_service.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../../types';
import { routeDefinitionParamsMock } from '../../index.mock';

/**
 * Route definition params whose OLS service is scoped to a mock, with
 * `FIXTURE_POLICY` registered for every type and OLS enabled.
 */
export const olsRoutesMock = {
  create: () => {
    const routeParams = routeDefinitionParamsMock.create();
    const olsService = scopedOlsServiceMock.create();
    olsService.getPolicy.mockReturnValue(FIXTURE_POLICY);
    olsService.getLevelPrivilegeActions.mockImplementation((_, level) => [`level:${level}`]);
    routeParams.getOlsService.mockReturnValue({
      asScoped: jest.fn().mockReturnValue(olsService),
    } as unknown as OlsService);
    routeParams.getSpaceId.mockReturnValue('space-a');

    const savedObjectsClient = savedObjectsClientMock.create();
    const core = coreMock.createRequestHandlerContext();
    const getSavedObjectsClient = jest.fn().mockReturnValue(savedObjectsClient);
    core.savedObjects.getClient = getSavedObjectsClient;
    const context = coreMock.createCustomRequestHandlerContext({
      core,
      licensing: licensingMock.createRequestHandlerContext(),
    }) as unknown as SecurityRequestHandlerContext;

    return { routeParams, olsService, savedObjectsClient, getSavedObjectsClient, context };
  },

  getHandler: (
    router: jest.Mocked<SecurityRouter>,
    method: Extract<RouteMethod, 'get' | 'post' | 'put'>,
    path: string
  ) => {
    const [, handler] = router[method].mock.calls.find(([config]) => config.path === path)!;
    return handler as RequestHandler<any, any, any, SecurityRequestHandlerContext>;
  },
};
