/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizedUserPreRoutingFactory } from './authorized_user_pre_routing';

describe('authorized_user_pre_routing', function () {
  const createMockConfig = (mockConfig = {}) => {
    return {
      get: (...keys) => mockConfig[keys.join('.')],
      kbnConfig: { get: (...keys) => mockConfig[keys.join('.')] },
    };
  };
  const createMockPlugins = (function () {
    const getUserStub = jest.fn();

    return function ({
      securityEnabled = true,
      xpackInfoUndefined = false,
      xpackInfoAvailable = true,
      getCurrentUser = undefined,
      user = undefined,
    }) {
      getUserStub.mockReset();
      getUserStub.mockResolvedValue(user);
      return {
        security: securityEnabled
          ? {
              authc: { getCurrentUser },
            }
          : null,
        __LEGACY: {
          plugins: {
            xpack_main: {
              info: !xpackInfoUndefined && {
                isAvailable: () => xpackInfoAvailable,
                feature(featureName) {
                  if (featureName === 'security') {
                    return {
                      isEnabled: () => securityEnabled,
                      isAvailable: () => xpackInfoAvailable,
                    };
                  }
                },
              },
            },
          },
        },
      };
    };
  })();

  const mockRequestRaw = {
    body: {},
    events: {},
    headers: {},
    isSystemRequest: false,
    params: {},
    query: {},
    route: { settings: { payload: 'abc' }, options: { authRequired: true, body: {}, tags: [] } },
    withoutSecretHeaders: true,
  };
  const getMockRequest = () => ({
    ...mockRequestRaw,
    raw: { req: mockRequestRaw },
  });

  const getMockLogger = () => ({
    warn: jest.fn(),
    error: (msg) => {
      throw new Error(msg);
    },
  });

  it('should return with boom notFound when xpackInfo is undefined', async function () {
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      createMockConfig(),
      createMockPlugins({ xpackInfoUndefined: true }),
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(404);
  });

  it(`should return with boom notFound when xpackInfo isn't available`, async function () {
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      createMockConfig(),
      createMockPlugins({ xpackInfoAvailable: false }),
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(404);
  });

  it('should return with null user when security is disabled in Elasticsearch', async function () {
    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      createMockConfig(),
      createMockPlugins({ securityEnabled: false }),
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response).toBe(null);
  });

  it('should return with boom unauthenticated when security is enabled but no authenticated user', async function () {
    const mockPlugins = createMockPlugins({
      user: null,
      config: { 'xpack.reporting.roles.allow': ['.reporting_user'] },
    });
    mockPlugins.security = { authc: { getCurrentUser: () => null } };

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      createMockConfig(),
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(401);
  });

  it(`should return with boom forbidden when security is enabled but user doesn't have allowed role`, async function () {
    const mockConfig = createMockConfig({ 'roles.allow': ['.reporting_user'] });
    const mockPlugins = createMockPlugins({
      user: { roles: [] },
      getCurrentUser: () => ({ roles: ['something_else'] }),
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockConfig,
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(403);
  });

  it('should return with user when security is enabled and user has explicitly allowed role', async function () {
    const user = { roles: ['.reporting_user', 'something_else'] };
    const mockConfig = createMockConfig({ 'roles.allow': ['.reporting_user'] });
    const mockPlugins = createMockPlugins({
      user,
      getCurrentUser: () => ({ roles: ['.reporting_user', 'something_else'] }),
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockConfig,
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response).toEqual(user);
  });

  it('should return with user when security is enabled and user has superuser role', async function () {
    const user = { roles: ['superuser', 'something_else'] };
    const mockConfig = createMockConfig({ 'roles.allow': [] });
    const mockPlugins = createMockPlugins({
      getCurrentUser: () => ({ roles: ['superuser', 'something_else'] }),
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockConfig,
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response).toEqual(user);
  });
});
