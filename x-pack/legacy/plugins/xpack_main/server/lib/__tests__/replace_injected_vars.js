/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import expect from '@kbn/expect';

import { replaceInjectedVars } from '../replace_injected_vars';
import { KibanaRequest } from '../../../../../../../src/core/server';

const buildRequest = (path = '/app/kibana') => {
  const get = sinon.stub();

  return {
    path,
    route: { settings: {} },
    headers: {},
    raw: {
      req: {
        socket: {},
      },
    },
    getSavedObjectsClient: () => {
      return {
        get,
        create: sinon.stub(),

        errors: {
          isNotFoundError: (error) => {
            return error.message === 'not found exception';
          },
        },
      };
    },
  };
};

describe('replaceInjectedVars uiExport', () => {
  it('sends xpack info if request is authenticated and license is not basic', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest();
    const server = mockServer();

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql({
      a: 1,
      xpackInitialInfo: {
        b: 1,
      },
    });

    sinon.assert.calledOnce(server.newPlatform.setup.plugins.security.authc.isAuthenticated);
    sinon.assert.calledWithExactly(
      server.newPlatform.setup.plugins.security.authc.isAuthenticated,
      sinon.match.instanceOf(KibanaRequest)
    );
  });

  it('sends the xpack info if security plugin is disabled', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest();
    const server = mockServer();
    delete server.plugins.security;
    delete server.newPlatform.setup.plugins.security;

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql({
      a: 1,
      xpackInitialInfo: {
        b: 1,
      },
    });
  });

  it('sends the xpack info if xpack license is basic', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest();
    const server = mockServer();
    server.plugins.xpack_main.info.license.isOneOf.returns(true);

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql({
      a: 1,
      xpackInitialInfo: {
        b: 1,
      },
    });
  });

  it('respects the telemetry opt-in document when opted-out', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest();
    const server = mockServer();
    server.plugins.xpack_main.info.license.isOneOf.returns(true);

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql({
      a: 1,
      xpackInitialInfo: {
        b: 1,
      },
    });
  });

  it('respects the telemetry opt-in document when opted-in', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest();
    const server = mockServer();
    server.plugins.xpack_main.info.license.isOneOf.returns(true);

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql({
      a: 1,
      xpackInitialInfo: {
        b: 1,
      },
    });
  });

  it('indicates that telemetry is opted-out when not loading an application', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest(true, '/');
    const server = mockServer();
    server.plugins.xpack_main.info.license.isOneOf.returns(true);

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql({
      a: 1,
      xpackInitialInfo: {
        b: 1,
      },
    });
  });

  it('sends the originalInjectedVars if not authenticated', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest();
    const server = mockServer();
    server.newPlatform.setup.plugins.security.authc.isAuthenticated.returns(false);

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql(originalInjectedVars);
  });

  it('sends the originalInjectedVars if xpack info is unavailable', async () => {
    const originalInjectedVars = { a: 1 };
    const request = buildRequest();
    const server = mockServer();
    server.plugins.xpack_main.info.isAvailable.returns(false);

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql(originalInjectedVars);
  });

  it('sends the originalInjectedVars (with xpackInitialInfo = undefined) if security is disabled, xpack info is unavailable', async () => {
    const originalInjectedVars = {
      a: 1,
      uiCapabilities: { navLinks: { foo: true }, bar: { baz: true }, catalogue: { cfoo: true } },
    };
    const request = buildRequest();
    const server = mockServer();
    delete server.plugins.security;
    server.plugins.xpack_main.info.isAvailable.returns(false);

    const newVars = await replaceInjectedVars(originalInjectedVars, request, server);
    expect(newVars).to.eql({
      a: 1,
      xpackInitialInfo: undefined,
      uiCapabilities: {
        navLinks: { foo: true },
        bar: { baz: true },
        catalogue: {
          cfoo: true,
        },
      },
    });
  });
});

// creates a mock server object that defaults to being authenticated with a
// non-basic license
function mockServer() {
  const getLicenseCheckResults = sinon.stub().returns({});
  return {
    newPlatform: {
      setup: {
        plugins: { security: { authc: { isAuthenticated: sinon.stub().returns(true) } } },
      },
    },
    plugins: {
      security: {},
      xpack_main: {
        getFeatures: () => [
          {
            id: 'mockFeature',
            name: 'Mock Feature',
            privileges: {
              all: {
                app: [],
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['mockFeatureCapability'],
              },
            },
          },
        ],
        info: {
          isAvailable: sinon.stub().returns(true),
          feature: () => ({
            getLicenseCheckResults,
          }),
          license: {
            isOneOf: sinon.stub().returns(false),
          },
          toJSON: () => ({ b: 1 }),
        },
      },
    },
  };
}
