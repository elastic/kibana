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

import { defineFindServiceAccountsByRolesRoute } from './find_by_roles';
import { findServiceAccountsByRolesBodySchema } from './schemas';
import {
  SERVICE_ACCOUNT_FIND_BY_ROLES_MAX_ROLES,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
} from '../../../common/service_accounts';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const ROUTE_PATH = '/internal/security/service_account/_find_by_roles';

const serviceAccount = {
  id: 'kibana/nightshift-relay',
  name: 'nightshift-relay',
  roles: ['viewer'],
  enabled: true,
};

describe('Find service accounts by roles route', () => {
  function getMockContext(
    licenseCheckResult: { state: string; message?: string } = { state: 'valid' }
  ) {
    return coreMock.createCustomRequestHandlerContext({
      core: coreMock.createRequestHandlerContext(),
      licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
    });
  }

  function setup(options: { serviceAccounts?: ServiceAccountsServiceStart | null } = {}) {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create({
      serviceAccounts: { enabled: true },
    });

    const serviceAccountsMock =
      'serviceAccounts' in options
        ? options.serviceAccounts ?? null
        : serviceAccountsServiceMock.createStart();
    mockRouteDefinitionParams.getServiceAccountsService.mockReturnValue(serviceAccountsMock);

    defineFindServiceAccountsByRolesRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === ROUTE_PATH
    )!;

    return {
      logger: mockRouteDefinitionParams.logger,
      routeConfig: routeConfig as RouteConfig<any, any, any, 'post'>,
      routeHandler: handler as RequestHandler<any, any, any, any>,
      serviceAccounts: serviceAccountsMock as jest.MockedObjectDeep<ServiceAccountsServiceStart>,
    };
  }

  const callRoute = (
    routeHandler: RequestHandler<any, any, any, any>,
    roles: string[] = ['viewer'],
    context = getMockContext()
  ) =>
    routeHandler(
      context,
      httpServerMock.createKibanaRequest({ method: 'post', body: { roles } }),
      kibanaResponseFactory
    );

  it('registers an internal route that delegates authorization to the backend', () => {
    const { routeConfig } = setup();

    expect(routeConfig.path).toBe(ROUTE_PATH);
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
      ['viewer'],
      getMockContext({ state: 'invalid', message: 'test forbidden message' })
    );

    expect(response.status).toBe(403);
    expect(response.payload).toEqual({ message: 'test forbidden message' });
  });

  it('returns the accounts holding the roles with their workload counts', async () => {
    const { routeHandler, serviceAccounts } = setup();
    const otherAccount = { ...serviceAccount, id: 'kibana/other', name: 'other', enabled: false };
    serviceAccounts.backend.findByRoles.mockResolvedValue({
      serviceAccounts: [serviceAccount, otherAccount],
      complete: false,
    });
    serviceAccounts.management.countBoundWorkloads.mockResolvedValue(
      new Map([[serviceAccount.id, 2]])
    );

    const response = await callRoute(routeHandler, ['viewer', 'editor']);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      serviceAccounts: [
        { ...serviceAccount, workloadCount: 2 },
        { ...otherAccount, workloadCount: 0 },
      ],
      complete: false,
    });
    expect(serviceAccounts.backend.findByRoles).toHaveBeenCalledWith(expect.anything(), [
      'viewer',
      'editor',
    ]);
    expect(serviceAccounts.management.countBoundWorkloads).toHaveBeenCalledWith([
      serviceAccount.id,
      otherAccount.id,
    ]);
  });

  it('returns the accounts without counts when counting fails', async () => {
    const { routeHandler, serviceAccounts, logger } = setup();
    serviceAccounts.backend.findByRoles.mockResolvedValue({
      serviceAccounts: [serviceAccount],
      complete: true,
    });
    serviceAccounts.management.countBoundWorkloads.mockRejectedValue(new Error('search failed'));

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ serviceAccounts: [serviceAccount], complete: true });
    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to count the workloads bound to 1 service account(s): search failed'
    );
  });

  it('passes through a refusal from the backend', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.findByRoles.mockRejectedValue(
      Boom.forbidden('missing manage_security')
    );

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(403);
    expect(serviceAccounts.management.countBoundWorkloads).not.toHaveBeenCalled();
  });

  it('returns 404 when the feature is disabled', async () => {
    const { routeHandler } = setup({ serviceAccounts: null });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Service accounts are not available: the feature is disabled',
    });
  });

  describe('body schema', () => {
    it('accepts a list of roles', () => {
      expect(findServiceAccountsByRolesBodySchema.parse({ roles: ['viewer'] })).toEqual({
        roles: ['viewer'],
      });
    });

    it('rejects an empty list of roles', () => {
      expect(findServiceAccountsByRolesBodySchema.safeParse({ roles: [] }).success).toBe(false);
    });

    it('rejects an empty role name', () => {
      expect(findServiceAccountsByRolesBodySchema.safeParse({ roles: [''] }).success).toBe(false);
    });

    it('rejects an unbounded role name', () => {
      expect(
        findServiceAccountsByRolesBodySchema.safeParse({
          roles: ['a'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1)],
        }).success
      ).toBe(false);
    });

    it('rejects more roles than the cap', () => {
      expect(
        findServiceAccountsByRolesBodySchema.safeParse({
          roles: Array.from(
            { length: SERVICE_ACCOUNT_FIND_BY_ROLES_MAX_ROLES + 1 },
            (_, index) => `role-${index}`
          ),
        }).success
      ).toBe(false);
    });

    it('rejects unknown keys', () => {
      expect(
        findServiceAccountsByRolesBodySchema.safeParse({ roles: ['viewer'], limit: 5 }).success
      ).toBe(false);
    });
  });
});
