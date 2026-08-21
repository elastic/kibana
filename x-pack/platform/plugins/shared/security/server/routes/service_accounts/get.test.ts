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

import { defineGetServiceAccountRoute } from './get';
import { getServiceAccountParamsSchema } from './schemas';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const enabledConfig = { serviceAccounts: { enabled: true } };

const userCreator = {
  type: 'user' as const,
  id: 'user-id',
  first_name: 'Ada',
  last_name: 'Lovelace',
};

const serviceAccount = {
  id: 'service-account-id',
  type: 'project' as const,
  name: 'nightshift-relay',
  organization_id: 'mock-organization-id',
  role_assignments: {},
  assumable_by: [],
  creator: userCreator,
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

    defineGetServiceAccountRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.get.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account/{id}'
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
  ) =>
    routeHandler(
      context,
      httpServerMock.createKibanaRequest({ params: { id: serviceAccount.id } }),
      kibanaResponseFactory
    );

  describe('route registration', () => {
    it('registers an internal route authorized by manage_security and Kibana client auth', () => {
      const { routeConfig } = setup();

      expect(routeConfig.path).toBe('/internal/security/service_account/{id}');
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

  it('returns the service account for the given id', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.get.mockResolvedValue(serviceAccount);

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(serviceAccount);
    expect(serviceAccounts.get).toHaveBeenCalledWith(expect.anything(), serviceAccount.id);
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

  it('reproduces a 404 when UIAM has no such account', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.get.mockRejectedValue(Boom.notFound('Not found'));

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
      expect(getServiceAccountParamsSchema.safeParse({ id: 'x'.repeat(1025) }).success).toBe(false);
    });
  });
});
