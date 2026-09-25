/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type {
  CheckPrivileges,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import { defineCreateServiceAccountRoute } from './create';
import { createServiceAccountBodySchema } from './schemas';
import { licenseMock } from '../../../common/licensing/index.mock';
import { SERVICE_ACCOUNT_NAME_MAX_LENGTH } from '../../../common/service_accounts';
import type { ServiceAccountsServiceStart } from '../../service_accounts';
import { serviceAccountsServiceMock } from '../../service_accounts/service_accounts_service.mock';
import { UiamServiceAccounts } from '../../service_accounts/uiam_service_accounts';
import { uiamServiceMock } from '../../uiam/uiam_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';

const enabledConfig = { serviceAccounts: { enabled: true } };

const requestBody = { name: 'nightshift-relay' };

const serviceAccount = { id: 'service-account-id', name: 'nightshift-relay' };

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

    defineCreateServiceAccountRoute(mockRouteDefinitionParams);

    const [routeConfig, handler] = mockRouteDefinitionParams.router.post.mock.calls.find(
      ([{ path }]) => path === '/internal/security/service_account'
    )!;

    return {
      routeConfig: routeConfig as RouteConfig<any, any, any, 'post'>,
      routeHandler: handler as RequestHandler<any, any, any, any>,
      serviceAccounts: serviceAccountsMock as jest.MockedObjectDeep<ServiceAccountsServiceStart>,
    };
  }

  const callRoute = (
    routeHandler: RequestHandler<any, any, any, any>,
    context = getMockContext(),
    request = httpServerMock.createKibanaRequest({ body: requestBody })
  ) => routeHandler(context, request, kibanaResponseFactory);

  describe('route registration', () => {
    it('registers an internal route that delegates authorization to UIAM', () => {
      const { routeConfig } = setup();

      expect(routeConfig.path).toBe('/internal/security/service_account');
      expect(routeConfig.options?.access).toBe('internal');
      expect(routeConfig.security?.authz).toEqual({
        enabled: false,
        reason:
          'This route delegates authorization to the service account provider: UIAM via the ' +
          "forwarded access token, or Elasticsearch via the caller's `manage_security` cluster privilege",
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
    serviceAccounts.backend.create.mockResolvedValue(serviceAccount);

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(serviceAccount);
    expect(serviceAccounts.backend.create).toHaveBeenCalledTimes(1);
    expect(serviceAccounts.backend.create).toHaveBeenCalledWith(
      expect.objectContaining({ body: requestBody }),
      requestBody
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

  it('delegates to whichever backend is selected outside serverless', async () => {
    const { routeHandler, serviceAccounts } = setup({ serverless: false });
    serviceAccounts.backend.create.mockResolvedValue(serviceAccount);

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(serviceAccount);
  });

  it.each([400, 401, 403, 501])('preserves backend status %s', async (statusCode) => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.create.mockRejectedValue(
      Boom.boomify(new Error('backend error'), { statusCode })
    );
    expect((await callRoute(routeHandler)).status).toBe(statusCode);
  });

  it('reproduces the upstream status code when creation fails', async () => {
    const { routeHandler, serviceAccounts } = setup();
    serviceAccounts.backend.create.mockRejectedValue(
      Boom.conflict('Project has reached its service account limit')
    );

    const response = await callRoute(routeHandler);

    expect(response.status).toBe(409);
  });

  describe('UIAM creation credentials', () => {
    const setupUiam = () => {
      const uiam = uiamServiceMock.create();
      uiam.createServiceAccount.mockResolvedValue({
        ...serviceAccount,
        type: 'project',
        organization_id: 'organization-id',
        role_assignments: {},
        assumable_by: [],
      });
      const license = licenseMock.create();
      license.isEnabled.mockReturnValue(true);
      const checkPrivileges: jest.Mocked<CheckPrivileges> = {
        atSpace: jest.fn(),
        atSpaces: jest.fn(),
        globally: jest.fn().mockResolvedValue({
          hasAllRequested: true,
          username: 'elastic',
          privileges: {
            kibana: [],
            elasticsearch: {
              cluster: [{ privilege: 'manage_security', authorized: true }],
              index: {},
            },
          },
        }),
      };
      const checkPrivilegesWithRequest: jest.MockedFunction<CheckPrivilegesWithRequest> = jest
        .fn()
        .mockReturnValue(checkPrivileges);
      const backend = new UiamServiceAccounts({
        logger: loggingSystemMock.createLogger(),
        requestLifetimeMs: 600_000,
        license,
        uiam,
        checkPrivilegesWithRequest,
        getCurrentUser: () => null,
        cloudProjectContext: {
          organizationId: 'organization-id',
          projectId: 'project-id',
          projectType: 'security',
        },
      });
      const { routeHandler } = setup({
        serviceAccounts: { ...serviceAccountsServiceMock.createStart(), backend },
      });

      return { routeHandler, uiam, checkPrivilegesWithRequest, checkPrivileges };
    };

    it.each(['Bearer essu_user_session', 'ApiKey essu_key'])(
      'creates an account with %s',
      async (authorization) => {
        const { routeHandler, uiam, checkPrivilegesWithRequest, checkPrivileges } = setupUiam();
        const request = httpServerMock.createKibanaRequest({
          body: requestBody,
          headers: { authorization },
        });

        const response = await callRoute(routeHandler, undefined, request);

        expect(response.status).toBe(200);
        expect(response.payload).toEqual(serviceAccount);
        expect(checkPrivilegesWithRequest).toHaveBeenCalledWith(request);
        expect(checkPrivileges.globally).toHaveBeenCalledWith({
          elasticsearch: { cluster: ['manage_security'], index: {} },
        });
        expect(uiam.createServiceAccount).toHaveBeenCalledWith(
          HTTPAuthorizationHeader.parseFromRequest(request),
          expect.objectContaining(requestBody),
          undefined
        );
      }
    );

    it('returns a 400 for an Elasticsearch API key before checking privileges', async () => {
      const { routeHandler, uiam, checkPrivilegesWithRequest } = setupUiam();
      const request = httpServerMock.createKibanaRequest({
        body: requestBody,
        headers: { authorization: 'ApiKey a2V5LWlkOnNlY3JldA==' },
      });

      const response = await callRoute(routeHandler, undefined, request);

      expect(response.status).toBe(400);
      expect(response.payload).toMatchObject({
        message: 'Provided credential is not compatible with UIAM',
      });
      expect(checkPrivilegesWithRequest).not.toHaveBeenCalled();
      expect(uiam.createServiceAccount).not.toHaveBeenCalled();
    });
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

    it('rejects organization_id, which Kibana derives from cloud context', () => {
      expect(issuesFor({ ...requestBody, organization_id: 'other-organization' })).toEqual([
        expect.objectContaining({ code: 'unrecognized_keys', keys: ['organization_id'] }),
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
