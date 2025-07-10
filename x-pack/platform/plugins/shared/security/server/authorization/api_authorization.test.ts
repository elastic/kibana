/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import { initAPIAuthorization } from './api_authorization';
import { authorizationMock } from './index.mock';

describe('initAPIAuthorization', () => {
  test(`protected route when "mode.useRbacForRequest()" returns false continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = {
      ...authorizationMock.create(),
      getCurrentUser: jest.fn(),
      getSecurityConfig: jest.fn(),
    };
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
      kibanaRouteOptions: {
        xsrfRequired: true,
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    mockAuthz.mode.useRbacForRequest.mockReturnValue(false);

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`unprotected route when "mode.useRbacForRequest()" returns true continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = {
      ...authorizationMock.create(),
      getCurrentUser: jest.fn(),
      getSecurityConfig: jest.fn(),
    };
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
      routeTags: ['not-access:foo'],
      kibanaRouteOptions: {
        xsrfRequired: true,
        access: 'internal',
        security: {
          authz: {
            enabled: false,
            reason: 'Used in test suite',
          },
        },
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`protected route when "mode.useRbacForRequest()" returns true and user is authorized continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = {
      ...authorizationMock.create({ version: '1.0.0-zeta1' }),
      getCurrentUser: jest.fn(),
      getSecurityConfig: jest.fn(),
    };
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
      headers,
      kibanaRouteOptions: {
        xsrfRequired: true,
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    const mockCheckPrivileges = jest.fn().mockReturnValue({
      privileges: {
        kibana: [{ privilege: 'api:foo', authorized: true }],
      },
      hasAllRequested: true,
    });
    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
    mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation((request) => {
      // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
      // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
      expect(request.headers).toMatchObject(headers);

      return mockCheckPrivileges;
    });

    mockAuthz.checkPrivilegesWithRequest.mockImplementation((request) => {
      expect(request.headers).toMatchObject(headers);

      return {
        globally: () => ({
          privileges: {
            kibana: [{ privilege: 'api:foo', authorized: true }],
          },
        }),
      };
    });

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.authzResultNext).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivileges).toHaveBeenCalledWith({
      kibana: [mockAuthz.actions.api.get('foo')],
    });
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`protected route when "mode.useRbacForRequest()" returns true and user isn't authorized responds with a 403`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = {
      ...authorizationMock.create({ version: '1.0.0-zeta1' }),
      getCurrentUser: jest.fn(),
      getSecurityConfig: jest.fn(),
    };
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
      headers,
      kibanaRouteOptions: {
        xsrfRequired: true,
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['foo'],
          },
        },
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    const mockCheckPrivileges = jest.fn().mockReturnValue({
      privileges: {
        kibana: [{ privilege: 'api:foo', authorized: false }],
      },
      hasAllRequested: false,
    });
    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
    mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation((request) => {
      // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
      // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
      expect(request.headers).toMatchObject(headers);

      return mockCheckPrivileges;
    });

    mockAuthz.checkPrivilegesWithRequest.mockImplementation((request) => {
      expect(request.headers).toMatchObject(headers);

      return {
        globally: () => ({
          privileges: {
            kibana: [{ privilege: 'api:foo', authorized: false }],
          },
        }),
      };
    });

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.forbidden).toHaveBeenCalledTimes(1);
    expect(mockPostAuthToolkit.next).not.toHaveBeenCalled();
    expect(mockCheckPrivileges).toHaveBeenCalledWith({
      kibana: [mockAuthz.actions.api.get('foo')],
    });
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  describe('security config', () => {
    const testSecurityConfig = (
      description: string,
      {
        security,
        kibanaPrivilegesResponse,
        kibanaCurrentUserResponse,
        kibanaPrivilegesRequestActions,
        asserts,
        esXpackSecurityUsageResponse,
      }: {
        security?: RouteSecurity;
        kibanaPrivilegesResponse?: {
          privileges: { kibana: Array<{ privilege: string; authorized: boolean }> };
          hasAllRequested?: boolean;
        };
        kibanaPrivilegesRequestActions?: string[];
        kibanaCurrentUserResponse?: { operator: boolean };
        esXpackSecurityUsageResponse?: {
          operator_privileges: { enabled: boolean; available: boolean };
        };
        asserts: {
          forbidden?: boolean;
          authzResult?: Record<string, boolean>;
          authzDisabled?: boolean;
        };
      }
    ) => {
      test(description, async () => {
        const mockHTTPSetup = coreMock.createSetup().http;
        const mockAuthz = {
          ...authorizationMock.create({ version: '1.0.0-zeta1' }),
          getCurrentUser: jest.fn(),
          getSecurityConfig: jest.fn(),
        };
        initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

        const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

        const headers = { authorization: 'foo' };

        const mockRequest = httpServerMock.createKibanaRequest({
          method: 'get',
          path: '/foo/bar',
          headers,
          kibanaRouteOptions: {
            xsrfRequired: true,
            access: 'internal',
            security,
          },
        });
        const mockResponse = httpServerMock.createResponseFactory();
        const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

        const mockCheckPrivileges = jest.fn().mockReturnValue(kibanaPrivilegesResponse);
        mockAuthz.getCurrentUser.mockReturnValue(kibanaCurrentUserResponse);
        mockAuthz.getSecurityConfig.mockResolvedValue(esXpackSecurityUsageResponse);
        mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
        mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation((request) => {
          // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
          // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
          expect(request.headers).toMatchObject(headers);

          return mockCheckPrivileges;
        });

        mockAuthz.checkPrivilegesWithRequest.mockImplementation((request) => {
          expect(request.headers).toMatchObject(headers);

          return { globally: () => kibanaPrivilegesResponse };
        });

        await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

        expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);

        if (asserts.authzDisabled) {
          expect(mockResponse.forbidden).not.toHaveBeenCalled();
          expect(mockPostAuthToolkit.authzResultNext).not.toHaveBeenCalled();
          expect(mockPostAuthToolkit.next).toHaveBeenCalled();
          expect(mockCheckPrivileges).not.toHaveBeenCalled();

          return;
        }

        if (kibanaPrivilegesRequestActions) {
          expect(mockCheckPrivileges).toHaveBeenCalledWith({
            kibana: kibanaPrivilegesRequestActions!.map((action: string) =>
              mockAuthz.actions.api.get(action)
            ),
          });
        }

        if (asserts.forbidden) {
          expect(mockResponse.forbidden).toHaveBeenCalled();
          expect(mockPostAuthToolkit.authzResultNext).not.toHaveBeenCalled();
        }

        if (asserts.authzResult) {
          expect(mockResponse.forbidden).not.toHaveBeenCalled();
          expect(mockPostAuthToolkit.authzResultNext).toHaveBeenCalledTimes(1);
          expect(mockPostAuthToolkit.authzResultNext).toHaveBeenCalledWith(asserts.authzResult);
        }
      });
    };

    testSecurityConfig(
      `protected route returns "authzResult" if user has allRequired AND anyRequired privileges requested`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1'],
                anyRequired: ['privilege2', 'privilege3'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: true },
              { privilege: 'api:privilege3', authorized: false },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: true,
            privilege3: false,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has all required privileges requested as complex config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1', 'privilege2'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: true },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has at least one of anyRequired privileges requested`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                anyRequired: ['privilege1', 'privilege2', 'privilege3'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: false },
              { privilege: 'api:privilege2', authorized: true },
              { privilege: 'api:privilege3', authorized: false },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3'],
        asserts: {
          authzResult: {
            privilege1: false,
            privilege2: true,
            privilege3: false,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has all required privileges requested as simple config`,
      {
        security: {
          authz: {
            requiredPrivileges: ['privilege1', 'privilege2'],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: true },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has operator privileges requested and user is operator`,
      {
        security: {
          authz: {
            requiredPrivileges: [ReservedPrivilegesSet.operator],
          },
        },
        kibanaCurrentUserResponse: { operator: true },
        esXpackSecurityUsageResponse: { operator_privileges: { enabled: true, available: true } },
        asserts: {
          authzResult: {
            operator: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has requested operator privileges and operator privileges are disabled`,
      {
        security: {
          authz: {
            requiredPrivileges: [ReservedPrivilegesSet.operator, 'privilege1'],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [{ privilege: 'api:privilege1', authorized: true }],
          },
        },
        kibanaCurrentUserResponse: { operator: false },
        esXpackSecurityUsageResponse: { operator_privileges: { enabled: false, available: false } },
        asserts: {
          authzResult: {
            privilege1: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user operator privileges are disabled and user doesn't have additional privileges granted`,
      {
        security: {
          authz: {
            requiredPrivileges: [ReservedPrivilegesSet.operator, 'privilege1'],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [{ privilege: 'api:privilege1', authorized: false }],
          },
        },
        kibanaCurrentUserResponse: { operator: false },
        esXpackSecurityUsageResponse: { operator_privileges: { enabled: false, available: false } },
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user has operator privileges requested and user is not operator`,
      {
        security: {
          authz: {
            requiredPrivileges: [ReservedPrivilegesSet.operator],
          },
        },
        esXpackSecurityUsageResponse: { operator_privileges: { enabled: true, available: true } },
        kibanaCurrentUserResponse: { operator: false },
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route restricted to only superusers returns forbidden if user not a superuser`,
      {
        security: {
          authz: {
            requiredPrivileges: [ReservedPrivilegesSet.superuser],
          },
        },
        kibanaPrivilegesResponse: { privileges: { kibana: [] }, hasAllRequested: false },
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route allowed only for superuser access returns "authzResult" if user is superuser`,
      {
        security: {
          authz: {
            requiredPrivileges: [ReservedPrivilegesSet.superuser],
          },
        },
        kibanaPrivilegesResponse: { privileges: { kibana: [] }, hasAllRequested: true },
        asserts: {
          authzResult: {
            [ReservedPrivilegesSet.superuser]: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user doesn't have at least one from allRequired privileges requested`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1', 'privilege2'],
                anyRequired: ['privilege3', 'privilege4'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
              { privilege: 'api:privilege3', authorized: false },
              { privilege: 'api:privilege4', authorized: true },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3', 'privilege4'],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user doesn't have at least one from required privileges requested as simple config`,
      {
        security: {
          authz: {
            requiredPrivileges: ['privilege1', 'privilege2'],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2'],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has permissions with complex anyRequired config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                anyRequired: [
                  { allOf: ['privilege1', 'privilege2'] },
                  { allOf: ['privilege3', 'privilege4'] },
                ],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
              { privilege: 'api:privilege3', authorized: true },
              { privilege: 'api:privilege4', authorized: true },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3', 'privilege4'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: false,
            privilege3: true,
            privilege4: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has permissions  requested with complex allRequired config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: [
                  { anyOf: ['privilege1', 'privilege2'] },
                  { anyOf: ['privilege3', 'privilege4'] },
                ],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
              { privilege: 'api:privilege3', authorized: true },
              { privilege: 'api:privilege4', authorized: false },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3', 'privilege4'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: false,
            privilege3: true,
            privilege4: false,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user doesn't have required privileges requested with complex allRequired config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: [
                  { anyOf: ['privilege1', 'privilege2'] },
                  { anyOf: ['privilege3', 'privilege4'] },
                ],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
              { privilege: 'api:privilege3', authorized: false },
              { privilege: 'api:privilege4', authorized: false },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3', 'privilege4'],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has permissions requested with complex config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                // (privilege1 OR privilege2) AND (privilege3 OR privilege4)
                // AND ((privilege5 AND privilege6) OR (privilege7 AND privilege8))
                allRequired: [
                  { anyOf: ['privilege1', 'privilege2'] },
                  { anyOf: ['privilege3', 'privilege4'] },
                ],
                anyRequired: [
                  { allOf: ['privilege5', 'privilege6'] },
                  { allOf: ['privilege7', 'privilege8'] },
                ],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
              { privilege: 'api:privilege3', authorized: false },
              { privilege: 'api:privilege4', authorized: true },
              { privilege: 'api:privilege5', authorized: false },
              { privilege: 'api:privilege6', authorized: false },
              { privilege: 'api:privilege7', authorized: true },
              { privilege: 'api:privilege8', authorized: true },
            ],
          },
        },
        kibanaPrivilegesRequestActions: [
          'privilege1',
          'privilege2',
          'privilege3',
          'privilege4',
          'privilege5',
          'privilege6',
          'privilege7',
          'privilege8',
        ],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: false,
            privilege3: false,
            privilege4: true,
            privilege5: false,
            privilege6: false,
            privilege7: true,
            privilege8: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user doesn't have required privileges with complex config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                // (privilege1 OR privilege2) AND (privilege3 OR privilege4)
                // AND ((privilege5 AND privilege6) OR (privilege7 AND privilege8))
                allRequired: [
                  { anyOf: ['privilege1', 'privilege2'] },
                  { anyOf: ['privilege3', 'privilege4'] },
                ],
                anyRequired: [
                  { allOf: ['privilege5', 'privilege6'] },
                  { allOf: ['privilege7', 'privilege8'] },
                ],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
              { privilege: 'api:privilege3', authorized: false },
              { privilege: 'api:privilege4', authorized: true },
              { privilege: 'api:privilege5', authorized: false },
              { privilege: 'api:privilege6', authorized: false },
              { privilege: 'api:privilege7', authorized: true },
              { privilege: 'api:privilege8', authorized: false },
            ],
          },
        },
        kibanaPrivilegesRequestActions: [
          'privilege1',
          'privilege2',
          'privilege3',
          'privilege4',
          'privilege5',
          'privilege6',
          'privilege7',
          'privilege8',
        ],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user doesn't have required privileges requested with complex anyRequired config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                anyRequired: [
                  { allOf: ['privilege1', 'privilege2'] },
                  { allOf: ['privilege3', 'privilege4'] },
                ],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: {
          privileges: {
            kibana: [
              { privilege: 'api:privilege1', authorized: true },
              { privilege: 'api:privilege2', authorized: false },
              { privilege: 'api:privilege3', authorized: false },
              { privilege: 'api:privilege4', authorized: true },
            ],
          },
        },
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3', 'privilege4'],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(`route returns next if route has authz disabled`, {
      security: {
        authz: {
          enabled: false,
          reason: 'authz is disabled',
        },
      },
      asserts: {
        authzDisabled: true,
      },
    });
  });
});
