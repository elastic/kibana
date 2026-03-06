/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { privilegesCheckRoute } from './privileges_check_route';

describe('privilegesCheckRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns privilege check result when RBAC is enabled', async () => {
    const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: false });
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    mockOsqueryContext = {
      security: {
        authz: {
          mode: {
            useRbacForRequest: jest.fn().mockReturnValue(true),
          },
          checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        },
      },
    } as unknown as OsqueryAppContext;

    const mockRouter = createMockRouter();
    privilegesCheckRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/internal/osquery/privileges_check');
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.internal.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: 'false' });
    expect(checkPrivileges).toHaveBeenCalled();
  });

  it('returns true when RBAC is disabled', async () => {
    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();

    mockOsqueryContext = {
      security: {
        authz: {
          mode: {
            useRbacForRequest: jest.fn().mockReturnValue(false),
          },
          checkPrivilegesDynamicallyWithRequest: jest.fn(),
        },
      },
    } as unknown as OsqueryAppContext;

    const mockRouter = createMockRouter();
    privilegesCheckRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/internal/osquery/privileges_check');
    const routeVersion = route.versions[API_VERSIONS.internal.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.internal.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({ body: 'true' });
    expect(
      mockOsqueryContext.security.authz.checkPrivilegesDynamicallyWithRequest
    ).not.toHaveBeenCalled();
  });
});
