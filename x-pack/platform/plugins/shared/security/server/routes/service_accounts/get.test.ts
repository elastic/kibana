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

import { defineGetServiceAccountRoute } from './get';
import { getServiceAccountParamsSchema } from './schemas';
import { SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH } from '../../../common/service_accounts';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const enabledConfig = { serviceAccounts: { enabled: true } };

const serviceAccount = {
  id: 'service-account-id',
  name: 'nightshift-relay',
  roles: [],
  enabled: true,
  hasCredential: true,
  createdBy: { type: 'user' as const, username: 'user-id' },
};

describe('Get service account route', () => {
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

    defineGetServiceAccountRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account/{id}'
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
      httpServerMock.createKibanaRequest({ params: { id: serviceAccount.id } }),
      kibanaResponseFactory
    );

  describe('route registration', () => {
    it('registers an internal route that delegates authorization to the backend', () => {
      const { routeConfig } = setup();

      expect(routeConfig.path).toBe('/internal/security/service_account/{id}');
      expect(routeConfig.options?.access).toBe('internal');
      expect(routeConfig.security?.authz).toEqual({
        enabled: false,
        reason:
          'This route delegates authorization to the service accounts backend, which requires the `read_security` cluster privilege',
      });
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

  it('returns the service account for the given id', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.get.mockResolvedValue(serviceAccount);

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(serviceAccount);
    expect(serviceAccounts.backend.get).toHaveBeenCalledWith(expect.anything(), serviceAccount.id);
  });

  it('returns 404 when the feature is disabled', async () => {
    const { routeHandler } = setup({ serviceAccounts: null });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Service accounts are not available: the feature is disabled',
    });
  });

  it('reproduces a 404 when UIAM has no such account', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.get.mockRejectedValue(Boom.notFound('Not found'));

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
  });

  describe('params schema', () => {
    it('accepts a bounded id', () => {
      expect(getServiceAccountParamsSchema.parse({ id: 'service-account-id' })).toEqual({
        id: 'service-account-id',
      });
    });

    it('rejects an empty id', () => {
      expect(getServiceAccountParamsSchema.safeParse({ id: '' }).success).toBe(false);
    });

    it('rejects an unbounded id', () => {
      expect(
        getServiceAccountParamsSchema.safeParse({
          id: 'x'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1),
        }).success
      ).toBe(false);
    });
  });
});
