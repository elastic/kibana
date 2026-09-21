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

import { defineListServiceAccountsRoute } from './list';
import { listServiceAccountsQuerySchema } from './schemas';
import {
  SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
} from '../../../common/service_accounts';
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

describe('List service accounts route', () => {
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

    defineListServiceAccountsRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account'
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
  ) => routeHandler(context, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

  describe('route registration', () => {
    it('registers an internal route that delegates authorization to the backend', () => {
      const { routeConfig } = setup();

      expect(routeConfig.path).toBe('/internal/security/service_account');
      expect(routeConfig.options?.access).toBe('internal');
      expect(routeConfig.security?.authz).toEqual({
        enabled: false,
        reason:
          'This route delegates authorization to the service accounts backend, which requires the `manage_security` cluster privilege',
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

  it('lists service accounts assumable by this Kibana', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.list.mockResolvedValue({ service_accounts: [serviceAccount] });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ service_accounts: [serviceAccount] });
    expect(serviceAccounts.backend.list).toHaveBeenCalledTimes(1);
    expect(serviceAccounts.backend.list).toHaveBeenCalledWith(expect.anything(), {});
  });

  it('forwards limit and after to the backend and returns its next_page cursor', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.list.mockResolvedValue({
      service_accounts: [serviceAccount],
      next_page: 'next-page',
    });

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        query: { limit: 10, after: 'cursor' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      service_accounts: [serviceAccount],
      next_page: 'next-page',
    });
    expect(serviceAccounts.backend.list).toHaveBeenCalledWith(expect.anything(), {
      limit: 10,
      after: 'cursor',
    });
  });

  it('returns 404 when the feature is disabled', async () => {
    const { routeHandler } = setup({ serviceAccounts: null });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Service accounts are not available: the feature is disabled',
    });
  });

  it('reproduces the upstream status code when listing is unsupported', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.list.mockRejectedValue(
      Boom.notImplemented('Listing is not implemented')
    );

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(501);
  });

  it('reproduces a 404 when UIAM has no collection', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.list.mockRejectedValue(Boom.notFound('Not found'));

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
  });

  describe('query schema', () => {
    it('accepts omitted pagination fields', () => {
      expect(listServiceAccountsQuerySchema.parse({})).toEqual({});
    });

    it('coerces limit from a query string', () => {
      expect(listServiceAccountsQuerySchema.parse({ limit: '25' })).toEqual({ limit: 25 });
    });

    it('rejects a limit above the page-size cap', () => {
      expect(
        listServiceAccountsQuerySchema.safeParse({ limit: SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE + 1 })
          .success
      ).toBe(false);
    });

    it('rejects an unbounded after cursor', () => {
      const tooLong = 'x'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1);
      expect(listServiceAccountsQuerySchema.safeParse({ after: tooLong }).success).toBe(false);
    });

    it('drops unknown query parameters such as q', () => {
      expect(listServiceAccountsQuerySchema.parse({ q: 'name:nightshift' })).toEqual({});
    });
  });
});
