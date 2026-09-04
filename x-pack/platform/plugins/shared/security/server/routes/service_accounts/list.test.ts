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
import type { KibanaSolution } from '@kbn/projects-solutions-groups';

import { defineListServiceAccountsRoute } from './list';
import { listServiceAccountsQuerySchema } from './schemas';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const enabledConfig = { serviceAccounts: { enabled: true } };

const serviceAccount = {
  id: 'service-account-id',
  type: 'project' as const,
  name: 'nightshift-relay',
  organization_id: 'mock-organization-id',
  role_assignments: {},
  assumable_by: [],
  creator: { type: 'user' as const, id: 'user-id', first_name: 'Ada', last_name: 'Lovelace' },
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
      serverlessOrganizationId?: string;
      serverlessProjectId?: string;
      serverlessProjectType?: KibanaSolution;
    } = {}
  ) {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create(enabledConfig, {
      serverless: true,
    });

    const serviceAccountsMock =
      'serviceAccounts' in options
        ? options.serviceAccounts ?? null
        : serviceAccountsServiceMock.createStart();
    mockRouteDefinitionParams.getServiceAccountsService.mockReturnValue(serviceAccountsMock);

    if ('serverlessOrganizationId' in options) {
      mockRouteDefinitionParams.serverlessOrganizationId = options.serverlessOrganizationId;
    }
    if ('serverlessProjectId' in options) {
      mockRouteDefinitionParams.serverlessProjectId = options.serverlessProjectId;
    }
    if ('serverlessProjectType' in options) {
      mockRouteDefinitionParams.serverlessProjectType = options.serverlessProjectType;
    }

    defineListServiceAccountsRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account'
    )!;

    return {
      routeConfig: routeConfig as RouteConfig<any, any, any, 'get'>,
      routeHandler: handler as RequestHandler<any, any, any, any>,
      serviceAccounts: serviceAccountsMock as jest.Mocked<ServiceAccountsServiceStart>,
    };
  }

  const callRoute = (
    routeHandler: RequestHandler<any, any, any, any>,
    context = getMockContext()
  ) => routeHandler(context, httpServerMock.createKibanaRequest(), kibanaResponseFactory);

  describe('route registration', () => {
    it('registers an internal route authorized by manage_security and Kibana client auth', () => {
      const { routeConfig } = setup();

      expect(routeConfig.path).toBe('/internal/security/service_account');
      expect(routeConfig.options?.access).toBe('internal');
      expect(routeConfig.security?.authz).toEqual({
        enabled: false,
        reason:
          "This route authorizes with Elasticsearch manage_security; UIAM authorizes Kibana's own client credential against assumable_by",
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
    serviceAccounts.list.mockResolvedValue({ service_accounts: [serviceAccount] });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ service_accounts: [serviceAccount] });
    expect(serviceAccounts.list).toHaveBeenCalledTimes(1);
    expect(serviceAccounts.list).toHaveBeenCalledWith(expect.anything(), {});
  });

  it('forwards limit, after, and q to the backend', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.list.mockResolvedValue({
      service_accounts: [serviceAccount],
      after: 'next-page',
    });

    const response = await routeHandler(
      getMockContext(),
      httpServerMock.createKibanaRequest({
        query: { limit: 10, after: 'cursor', q: 'name:nightshift' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      service_accounts: [serviceAccount],
      after: 'next-page',
    });
    expect(serviceAccounts.list).toHaveBeenCalledWith(expect.anything(), {
      limit: 10,
      after: 'cursor',
      q: 'name:nightshift',
    });
  });

  describe('availability guards', () => {
    it.each([
      ['the feature is disabled', { serviceAccounts: null }],
      ['the organization id is not configured', { serverlessOrganizationId: undefined }],
      ['the project id is not configured', { serverlessProjectId: undefined }],
      ['the project type is not configured', { serverlessProjectType: undefined }],
      ['the project type is not supported', { serverlessProjectType: 'chat' as KibanaSolution }],
    ])('returns 404 when %s', async (reason, options) => {
      const { routeHandler } = setup(options);

      const response = await callRoute(routeHandler);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({
        message: `Service accounts are not available: ${reason}`,
      });
    });
  });

  it('reproduces the upstream status code when listing is unsupported', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.list.mockRejectedValue(Boom.notImplemented('Listing is not implemented'));

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(501);
  });

  it('reproduces a 404 when UIAM has no collection', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.list.mockRejectedValue(Boom.notFound('Not found'));

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
      expect(listServiceAccountsQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('rejects unbounded after and q strings', () => {
      const tooLong = 'x'.repeat(1025);
      expect(listServiceAccountsQuerySchema.safeParse({ after: tooLong }).success).toBe(false);
      expect(listServiceAccountsQuerySchema.safeParse({ q: tooLong }).success).toBe(false);
    });
  });
});
