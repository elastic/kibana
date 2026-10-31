/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIXTURE_POLICY } from '@kbn/access-control';
import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

import type { AclService } from '../../access_control/acl_service';
import { scopedAclServiceMock } from '../../access_control/scoped_acl_service.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';

/**
 * Route definition params whose access control service is scoped to a mock, with
 * `FIXTURE_POLICY` registered for every type and access control enabled.
 */
export const accessControlRoutesMock = {
  create: () => {
    const routeParams = routeDefinitionParamsMock.create();
    const aclService = scopedAclServiceMock.create();
    aclService.getPolicy.mockReturnValue(FIXTURE_POLICY);
    aclService.getLevelPrivilegeActions.mockImplementation((_, level) => [`level:${level}`]);
    routeParams.getAclService.mockReturnValue({
      asScoped: jest.fn().mockReturnValue(aclService),
    } as unknown as AclService);
    routeParams.getSpaceId.mockReturnValue('space-a');

    const savedObjectsClient = savedObjectsClientMock.create();
    const core = coreMock.createRequestHandlerContext();
    const getSavedObjectsClient = jest.fn().mockReturnValue(savedObjectsClient);
    core.savedObjects.getClient = getSavedObjectsClient;
    const context = coreMock.createCustomRequestHandlerContext({
      core,
      licensing: licensingMock.createRequestHandlerContext(),
    }) as unknown as SecurityRequestHandlerContext;

    return { routeParams, aclService, savedObjectsClient, getSavedObjectsClient, context };
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
