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
import { deleteServiceAccountQuerySchema, getServiceAccountParamsSchema } from './schemas';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const SERVICE_ACCOUNT_ID = 'service-account-id';

const workload = {
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId: 'workflow-1',
  displayName: 'workflow-1',
};

describe('Delete service account route', () => {
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
    { force = false, context = getMockContext() } = {}
  ) =>
    routeHandler(
      context,
      httpServerMock.createKibanaRequest({
        method: 'delete',
        params: { id: SERVICE_ACCOUNT_ID },
        query: { force },
      }),
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
    expect(routeConfig.validate).toEqual({
      params: getServiceAccountParamsSchema,
      query: deleteServiceAccountQuerySchema,
    });
  });

  it('returns result of license checker', async () => {
    const { routeHandler, serviceAccounts } = setup();

    const response = await callRoute(routeHandler, {
      context: getMockContext({ state: 'invalid', message: 'test forbidden message' }),
    });

    expect(response.status).toBe(403);
    expect(response.payload).toEqual({ message: 'test forbidden message' });
    expect(serviceAccounts.management.delete).not.toHaveBeenCalled();
  });

  it('returns 200 when an unbound account is deleted', async () => {
    const { routeHandler, serviceAccounts } = setup();

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ warnings: [] });
    expect(serviceAccounts.management.delete).toHaveBeenCalledWith(
      expect.anything(),
      SERVICE_ACCOUNT_ID,
      { force: false }
    );
  });

  it('returns 409 listing the workloads when a bound account is not forced', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.management.delete.mockResolvedValue({ deleted: false, workloads: [workload] });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(409);
    expect(response.payload).toEqual({
      message:
        'Service account [service-account-id] is still bound to 1 workload. Unbind them first.',
      attributes: { workloads: [workload] },
    });
  });

  it('passes `force` through to delete a bound account anyway', async () => {
    const { routeHandler, serviceAccounts } = setup();

    const response = await callRoute(routeHandler, { force: true });

    expect(response.status).toBe(200);
    expect(serviceAccounts.management.delete).toHaveBeenCalledWith(
      expect.anything(),
      SERVICE_ACCOUNT_ID,
      { force: true }
    );
  });

  it('reports what the delete left behind', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.management.delete.mockResolvedValue({
      deleted: true,
      warnings: ['a token could not be deleted'],
    });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ warnings: ['a token could not be deleted'] });
  });

  it('reproduces a 403 for a caller who may not delete the account', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.management.delete.mockRejectedValue(
      Boom.forbidden('Cannot delete a service account: missing `manage_security` cluster privilege')
    );

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(403);
  });

  it('reproduces a 404 for an unknown id', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.management.delete.mockRejectedValue(
      Boom.notFound('Service account [service-account-id] was not found')
    );

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
  });

  it('returns 404 when the feature is disabled', async () => {
    const { routeHandler } = setup({ serviceAccounts: null });

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Service accounts are not available: the feature is disabled',
    });
  });

  describe('query schema', () => {
    it('defaults `force` to false', () => {
      expect(deleteServiceAccountQuerySchema.parse({})).toEqual({ force: false });
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('reads `force=%s` as %s', (force, expected) => {
      expect(deleteServiceAccountQuerySchema.parse({ force })).toEqual({ force: expected });
    });

    it('rejects anything other than `true` or `false`', () => {
      expect(deleteServiceAccountQuerySchema.safeParse({ force: 'yes' }).success).toBe(false);
    });
  });
});
