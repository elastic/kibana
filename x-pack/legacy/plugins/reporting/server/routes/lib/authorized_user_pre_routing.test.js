/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizedUserPreRoutingFactory } from './authorized_user_pre_routing';

describe('authorized_user_pre_routing', function() {
  // the getClientShield is using `once` which forces us to use a constant mock
  // which makes testing anything that is dependent on `oncePerServer` confusing.
  // so createMockServer reuses the same 'instance' of the server and overwrites
  // the properties to contain different values
  const createMockServer = (function() {
    const getUserStub = jest.fn();
    let mockConfig;

    const mockServer = {
      expose() {},
      config() {
        return {
          get(key) {
            return mockConfig[key];
          },
        };
      },
      log: function() {},
      plugins: {
        xpack_main: {},
        security: { getUser: getUserStub },
      },
    };

    return function({
      securityEnabled = true,
      xpackInfoUndefined = false,
      xpackInfoAvailable = true,
      user = undefined,
      config = {},
    }) {
      mockConfig = config;

      mockServer.plugins.xpack_main = {
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
      };

      getUserStub.mockReset();
      getUserStub.mockResolvedValue(user);
      return mockServer;
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

  const getMockPlugins = pluginSet => {
    return pluginSet || { security: null };
  };

  const getMockLogger = () => ({
    warn: jest.fn(),
    error: msg => {
      throw new Error(msg);
    },
  });

  it('should return with boom notFound when xpackInfo is undefined', async function() {
    const mockServer = createMockServer({ xpackInfoUndefined: true });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockServer,
      getMockPlugins(),
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(404);
  });

  it(`should return with boom notFound when xpackInfo isn't available`, async function() {
    const mockServer = createMockServer({ xpackInfoAvailable: false });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockServer,
      getMockPlugins(),
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(404);
  });

  it('should return with null user when security is disabled in Elasticsearch', async function() {
    const mockServer = createMockServer({ securityEnabled: false });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockServer,
      getMockPlugins(),
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response).toBe(null);
  });

  it('should return with boom unauthenticated when security is enabled but no authenticated user', async function() {
    const mockServer = createMockServer({
      user: null,
      config: { 'xpack.reporting.roles.allow': ['.reporting_user'] },
    });
    const mockPlugins = getMockPlugins({
      security: { authc: { getCurrentUser: () => null } },
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockServer,
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(401);
  });

  it(`should return with boom forbidden when security is enabled but user doesn't have allowed role`, async function() {
    const mockServer = createMockServer({
      user: { roles: [] },
      config: { 'xpack.reporting.roles.allow': ['.reporting_user'] },
    });
    const mockPlugins = getMockPlugins({
      security: { authc: { getCurrentUser: () => ({ roles: ['something_else'] }) } },
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockServer,
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response.isBoom).toBe(true);
    expect(response.output.statusCode).toBe(403);
  });

  it('should return with user when security is enabled and user has explicitly allowed role', async function() {
    const user = { roles: ['.reporting_user', 'something_else'] };
    const mockServer = createMockServer({
      user,
      config: { 'xpack.reporting.roles.allow': ['.reporting_user'] },
    });
    const mockPlugins = getMockPlugins({
      security: {
        authc: { getCurrentUser: () => ({ roles: ['.reporting_user', 'something_else'] }) },
      },
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockServer,
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response).toEqual(user);
  });

  it('should return with user when security is enabled and user has superuser role', async function() {
    const user = { roles: ['superuser', 'something_else'] };
    const mockServer = createMockServer({
      user,
      config: { 'xpack.reporting.roles.allow': [] },
    });
    const mockPlugins = getMockPlugins({
      security: { authc: { getCurrentUser: () => ({ roles: ['superuser', 'something_else'] }) } },
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(
      mockServer,
      mockPlugins,
      getMockLogger()
    );
    const response = await authorizedUserPreRouting(getMockRequest());
    expect(response).toEqual(user);
  });
});
