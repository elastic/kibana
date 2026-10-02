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

import { defineDeleteServiceAccountRoute } from './delete';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const enabledConfig = { serviceAccounts: { enabled: true } };

describe('Delete service account route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  function setup(
    options: {
      serviceAccounts?: ServiceAccountsServiceStart | null;
      serverless?: boolean;
    } = {}
  ) {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create(
      options.serverless === false ? {} : enabledConfig,
      {
        serverless: options.serverless ?? true,
      }
    );

    const serviceAccountsMock =
      'serviceAccounts' in options
        ? options.serviceAccounts ?? null
        : serviceAccountsServiceMock.createStart();
    mockRouteDefinitionParams.getServiceAccountsService.mockReturnValue(serviceAccountsMock);

    defineDeleteServiceAccountRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.delete.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account/{id}'
    )!;

    return {
      routeConfig: routeConfig as RouteConfig<any, any, any, 'delete'>,
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
      httpServerMock.createKibanaRequest({ params: { id: 'service-account-id' } }),
      kibanaResponseFactory
    );

  it('registers an internal route that delegates authorization to the backend', () => {
    const { routeConfig } = setup();

    expect(routeConfig.path).toBe('/internal/security/service_account/{id}');
    expect(routeConfig.options?.access).toBe('internal');
    expect(routeConfig.security?.authz).toEqual({
      enabled: false,
      reason:
        'This route delegates authorization to the service accounts backend, which requires the `manage_security` cluster privilege',
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

  it('deletes the service account', async () => {
    const { routeHandler, serviceAccounts } = setup();

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(204);
    expect(serviceAccounts.backend.delete).toHaveBeenCalledWith(
      expect.anything(),
      'service-account-id'
    );
  });

  it('returns 404 when the feature is disabled', async () => {
    const { routeHandler } = setup({ serviceAccounts: null });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Service accounts are not available: the feature is disabled',
    });
  });

  it('reproduces a backend refusal', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.delete.mockRejectedValue(Boom.forbidden('not assumable'));

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(403);
  });
});
