/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { authorizedUserPreRoutingFactory } from '../authorized_user_pre_routing';

describe('authorized_user_pre_routing', function () {

  // the getClientShield is using `once` which forces us to use a constant mock
  // which makes testing anything that is dependent on `oncePerServer` confusing.
  // so createMockServer reuses the same 'instance' of the server and overwrites
  // the properties to contain different values
  const createMockServer = (function () {
    const callWithRequestStub = sinon.stub();
    let mockConfig;

    const mockServer = {
      expose: function () {},
      config: function () {
        return {
          get: function (key) {
            return mockConfig[key];
          }
        };
      },
      log: function () {},
      plugins: {
        xpack_main: {},
        elasticsearch: {
          createCluster: function () {
            return {
              callWithRequest: callWithRequestStub
            };
          }
        }
      }
    };

    return function ({ securityEnabled = true, xpackInfoUndefined = false, xpackInfoAvailable = true, user = undefined, config = {} }) {
      mockConfig = config;

      mockServer.plugins.xpack_main = {
        info: !xpackInfoUndefined && {
          isAvailable: () => xpackInfoAvailable,
          feature: function (featureName) {
            if (featureName === 'security') {
              return {
                isEnabled: () => securityEnabled,
                isAvailable: () => xpackInfoAvailable
              };
            }
          }
        }
      };

      callWithRequestStub.resetHistory();
      callWithRequestStub.returns(Promise.resolve(user));
      return mockServer;
    };
  }());


  it('should return with boom notFound when xpackInfo is undefined', async function () {
    const mockServer = createMockServer({ xpackInfoUndefined: true });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockServer);
    const response = await authorizedUserPreRouting();
    expect(response.isBoom).to.be(true);
    expect(response.output.statusCode).to.be(404);
  });

  it(`should return with boom notFound when xpackInfo isn't available`, async function () {
    const mockServer = createMockServer({ xpackInfoAvailable: false });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockServer);
    const response = await authorizedUserPreRouting();
    expect(response.isBoom).to.be(true);
    expect(response.output.statusCode).to.be(404);
  });

  it('should return with null user when security is disabled in Elasticsearch', async function () {
    const mockServer = createMockServer({ securityEnabled: false });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockServer);
    const response = await authorizedUserPreRouting();
    expect(response).to.be(null);
  });

  it('should return with boom unauthenticated when security is enabled but no authenticated user', async function () {
    const mockServer = createMockServer({ user: null });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockServer);
    const response = await authorizedUserPreRouting();
    expect(response.isBoom).to.be(true);
    expect(response.output.statusCode).to.be(401);
  });

  it(`should return with boom forbidden when security is enabled but user doesn't have allowed role`, async function () {
    const mockServer = createMockServer({
      user: { roles: [] },
      config: { 'xpack.reporting.roles.allow': ['.reporting_user'] }
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockServer);
    const response = await authorizedUserPreRouting();
    expect(response.isBoom).to.be(true);
    expect(response.output.statusCode).to.be(403);
  });

  it('should return with user when security is enabled and user has explicitly allowed role', async function () {
    const user = { roles: ['.reporting_user', 'something_else'] };
    const mockServer = createMockServer({
      user,
      config: { 'xpack.reporting.roles.allow': ['.reporting_user'] }
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockServer);
    const response = await authorizedUserPreRouting();
    expect(response).to.be(user);
  });

  it('should return with user when security is enabled and user has superuser role', async function () {
    const user = { roles: ['superuser', 'something_else'] };
    const mockServer = createMockServer({
      user,
      config: { 'xpack.reporting.roles.allow': [] }
    });

    const authorizedUserPreRouting = authorizedUserPreRoutingFactory(mockServer);
    const response = await authorizedUserPreRouting();
    expect(response).to.be(user);
  });
});
