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

import { defineCreateServiceAccountRoute } from './create';
import { createServiceAccountBodySchema } from './schemas';
import { SERVICE_ACCOUNT_NAME_MAX_LENGTH } from '../../../common/service_accounts';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const enabledConfig = { serviceAccounts: { enabled: true } };

const requestBody = { name: 'nightshift-relay' };

const serviceAccount = {
  id: 'service-account-id',
  type: 'project' as const,
  name: 'nightshift-relay',
  organization_id: 'mock-organization-id',
  role_assignments: { limit: { access: ['application'], resource: ['project'] } },
  assumable_by: [],
};

describe('Create service account route', () => {
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

    defineCreateServiceAccountRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account'
    )!;

    return {
      routeConfig: routeConfig as RouteConfig<any, any, any, 'post'>,
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
      httpServerMock.createKibanaRequest({ body: requestBody }),
      kibanaResponseFactory
    );

  describe('route registration', () => {
    it('registers an internal route that delegates authorization to UIAM', () => {
      const { routeConfig } = setup();

      expect(routeConfig.path).toBe('/internal/security/service_account');
      expect(routeConfig.options?.access).toBe('internal');
      expect(routeConfig.security?.authz).toEqual({
        enabled: false,
        reason:
          'This route delegates authorization to the upstream UIAM service via the forwarded access token',
      });
    });

    it('bounds the request body size', () => {
      const { routeConfig } = setup();

      expect(routeConfig.options?.body?.maxBytes).toBeGreaterThan(0);
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

  it('creates the service account on behalf of the request and returns it', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.create.mockResolvedValue(serviceAccount);

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(serviceAccount);
    expect(serviceAccounts.create).toHaveBeenCalledTimes(1);
    expect(serviceAccounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ body: requestBody }),
      requestBody
    );
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

  it('reproduces the upstream status code when creation fails', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.create.mockRejectedValue(
      Boom.conflict('Project has reached its service account limit')
    );

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(409);
  });

  describe('body schema', () => {
    const issuesFor = (body: unknown) => {
      const result = createServiceAccountBodySchema.safeParse(body);
      expect(result.success).toBe(false);
      return result.error!.issues;
    };

    const issuePathsFor = (body: unknown) => issuesFor(body).map((issue) => issue.path.join('.'));

    it('accepts a name', () => {
      expect(createServiceAccountBodySchema.parse(requestBody)).toEqual(requestBody);
    });

    it('rejects unknown fields, so callers cannot smuggle in `assumable_by`', () => {
      expect(issuesFor({ ...requestBody, assumable_by: [{ type: 'kibana' }] })).toEqual([
        expect.objectContaining({ code: 'unrecognized_keys', keys: ['assumable_by'] }),
      ]);
    });

    // UIAM's first iteration takes a fixed payload, so callers do not get to choose privileges.
    it('rejects `role_assignments`, which Kibana supplies itself', () => {
      expect(
        issuesFor({ ...requestBody, role_assignments: { limit: { access: ['application'] } } })
      ).toEqual([
        expect.objectContaining({ code: 'unrecognized_keys', keys: ['role_assignments'] }),
      ]);
    });

    it('rejects an empty name', () => {
      expect(issuePathsFor({ ...requestBody, name: '' })).toContain('name');
    });

    it('rejects a name beyond the maximum length', () => {
      expect(
        issuePathsFor({
          ...requestBody,
          name: 'a'.repeat(SERVICE_ACCOUNT_NAME_MAX_LENGTH + 1),
        })
      ).toContain('name');
    });
  });
});
