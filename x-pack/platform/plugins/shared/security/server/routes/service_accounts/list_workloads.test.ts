/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';

import { defineListServiceAccountWorkloadsRoute } from './list_workloads';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const SERVICE_ACCOUNT_ID = 'service-account-id';

describe('List service account workloads route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  function setup(options: { serviceAccounts?: ServiceAccountsServiceStart | null } = {}) {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create(
      { serviceAccounts: { enabled: true } },
      { serverless: true }
    );

    const serviceAccountsMock =
      'serviceAccounts' in options
        ? options.serviceAccounts ?? null
        : serviceAccountsServiceMock.createStart();
    mockRouteDefinitionParams.getServiceAccountsService.mockReturnValue(serviceAccountsMock);

    defineListServiceAccountWorkloadsRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account/{id}/workloads'
    )!;

    return {
      routeConfig: routeConfig as RouteConfig<any, any, any, 'get'>,
      routeHandler: handler as RequestHandler<any, any, any, any>,
      serviceAccounts: serviceAccountsMock as jest.MockedObjectDeep<ServiceAccountsServiceStart>,
    };
  }

  const callRoute = (
    routeHandler: RequestHandler<any, any, any, any>,
    context = getMockContext()
  ) =>
    routeHandler(
      context,
      httpServerMock.createKibanaRequest({ params: { id: SERVICE_ACCOUNT_ID } }),
      kibanaResponseFactory
    );

  it('registers an internal route that delegates authorization to the backend', () => {
    const { routeConfig } = setup();

    expect(routeConfig.path).toBe('/internal/security/service_account/{id}/workloads');
    expect(routeConfig.options?.access).toBe('internal');
    expect(routeConfig.security?.authz).toEqual({
      enabled: false,
      reason:
        'This route delegates authorization to the service accounts backend, which requires the `read_security` cluster privilege',
    });
  });

  it('returns result of license checker', async () => {
    const { routeHandler } = setup();

    const response = await callRoute(
      routeHandler,
      getMockContext({ state: 'invalid', message: 'test forbidden message' })
    );

    expect(response.status).toBe(403);
    expect(response.payload).toEqual({ message: 'test forbidden message' });
  });

  it('returns the workloads bound to the account', async () => {
    const { routeHandler, serviceAccounts } = setup();
    const workloads = [
      {
        pluginId: 'workflows',
        workloadType: 'workflow',
        workloadId: 'w-1',
        spaceId: 'default',
        displayName: 'w-1',
      },
    ];
    serviceAccounts.management.listWorkloads.mockResolvedValue(workloads);

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ workloads });
    expect(serviceAccounts.management.listWorkloads).toHaveBeenCalledWith(
      expect.anything(),
      SERVICE_ACCOUNT_ID
    );
  });

  it('reproduces a 403 for a caller who may not read service accounts', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.management.listWorkloads.mockRejectedValue(Boom.forbidden('nope'));

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(403);
  });

  it('returns 404 when the feature is disabled', async () => {
    const { routeHandler } = setup({ serviceAccounts: null });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Service accounts are not available: the feature is disabled',
    });
  });
});
