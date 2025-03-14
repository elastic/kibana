/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';

import { Type } from '@kbn/config-schema';
import type {
  HttpResources,
  HttpResourcesRequestHandler,
  RequestHandler,
  RouteConfig,
} from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpResourcesMock, httpServerMock } from '@kbn/core/server/mocks';

import { defineLoginRoutes } from './login';
import type { SecurityLicense } from '../../../common';
import type { LoginSelectorProvider } from '../../../common/login_state';
import type { ConfigType } from '../../config';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Login view routes', () => {
  let httpResources: jest.Mocked<HttpResources>;
  let router: jest.Mocked<SecurityRouter>;
  let license: jest.Mocked<SecurityLicense>;
  let config: ConfigType;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;
    httpResources = routeParamsMock.httpResources;
    license = routeParamsMock.license;
    config = routeParamsMock.config;

    defineLoginRoutes(routeParamsMock);
  });

  describe('View route', () => {
    let routeHandler: HttpResourcesRequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, 'get'>;
    beforeEach(() => {
      const [loginRouteConfig, loginRouteHandler] = httpResources.register.mock.calls.find(
        ([{ path }]) => path === '/login'
      )!;

      routeConfig = loginRouteConfig;
      routeHandler = loginRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ excludeFromOAS: true });

      expect(routeConfig.security).toEqual(
        expect.objectContaining({
          authc: { enabled: 'optional' },
          authz: {
            enabled: false,
            reason: expect.any(String),
          },
        })
      );

      expect(routeConfig.validate).toEqual({
        body: undefined,
        query: expect.any(Type),
        params: undefined,
      });

      const queryValidator = (routeConfig.validate as any).query as Type<any>;
      expect(queryValidator.validate({})).toEqual({});

      expect(queryValidator.validate({ next: 'some-next' })).toEqual({ next: 'some-next' });
      expect(queryValidator.validate({ msg: 'some-msg' })).toEqual({ msg: 'some-msg' });
      expect(queryValidator.validate({ next: 'some-next', msg: 'some-msg', unknown: 1 })).toEqual({
        next: 'some-next',
        msg: 'some-msg',
        unknown: 1,
      });

      expect(() => queryValidator.validate({ next: 1 })).toThrowErrorMatchingInlineSnapshot(
        `"[next]: expected value of type [string] but got [number]"`
      );

      expect(() => queryValidator.validate({ msg: 1 })).toThrowErrorMatchingInlineSnapshot(
        `"[msg]: expected value of type [string] but got [number]"`
      );
    });

    it('redirects user to the root page if they are authenticated or login is disabled.', async () => {
      for (const { query, expectedLocation } of [
        { query: {}, expectedLocation: '/mock-server-basepath/' },
        {
          query: { next: '/mock-server-basepath/app/kibana' },
          expectedLocation: '/mock-server-basepath/app/kibana',
        },
        {
          query: { next: 'http://evil.com/mock-server-basepath/app/kibana' },
          expectedLocation: '/mock-server-basepath/',
        },
      ]) {
        // Redirect if user is authenticated even if `showLogin` is `true`.
        let request = httpServerMock.createKibanaRequest({
          query,
          auth: { isAuthenticated: true },
        });
        (request as any).url = new URL(
          `${request.url.pathname}${request.url.search}`,
          'https://kibana.co'
        );
        license.getFeatures.mockReturnValue({ showLogin: true } as any);
        const responseFactory = httpResourcesMock.createResponseFactory();

        await routeHandler({} as any, request, responseFactory);
        expect(responseFactory.redirected).toHaveBeenCalledWith({
          headers: { location: `${expectedLocation}` },
        });

        // Redirect if `showLogin` is `false` even if user is not authenticated.
        request = httpServerMock.createKibanaRequest({ query, auth: { isAuthenticated: false } });
        (request as any).url = new URL(
          `${request.url.pathname}${request.url.search}`,
          'https://kibana.co'
        );
        license.getFeatures.mockReturnValue({ showLogin: false } as any);
        responseFactory.redirected.mockClear();

        await routeHandler({} as any, request, responseFactory);

        expect(responseFactory.redirected).toHaveBeenCalledWith({
          headers: { location: `${expectedLocation}` },
        });
      }
    });

    it('renders view if user is not authenticated and login page can be shown.', async () => {
      license.getFeatures.mockReturnValue({ showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest({ auth: { isAuthenticated: false } });
      const contextMock = coreMock.createRequestHandlerContext();

      const responseFactory = httpResourcesMock.createResponseFactory();
      await routeHandler({ core: contextMock } as any, request, responseFactory);
      expect(responseFactory.renderAnonymousCoreApp).toHaveBeenCalledWith();
    });
  });

  describe('Login state route', () => {
    function getAuthcConfig(authcConfig: Record<string, unknown> = {}) {
      return routeDefinitionParamsMock.create({ authc: { ...authcConfig } }).config.authc;
    }

    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext, 'get'>;
    let routeConfig: RouteConfig<any, any, any, 'get'>;
    beforeEach(() => {
      const [loginStateRouteConfig, loginStateRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/login_state'
      )!;

      routeConfig = loginStateRouteConfig;
      routeHandler = loginStateRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ authRequired: false });
      expect(routeConfig.validate).toBe(false);
    });

    it('returns only required license features.', async () => {
      license.getFeatures.mockReturnValue({
        allowAccessAgreement: true,
        allowLogin: true,
        allowRbac: false,
        allowRoleDocumentLevelSecurity: true,
        allowRoleFieldLevelSecurity: false,
        allowRoleRemoteIndexPrivileges: false,
        allowRemoteClusterPrivileges: false,
        layout: 'error-es-unavailable',
        showLinks: false,
        showRoleMappingsManagement: true,
        allowSubFeaturePrivileges: true,
        allowAuditLogging: true,
        showLogin: true,
        allowUserProfileCollaboration: true,
        allowFips: false,
      });

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const expectedPayload = {
        allowLogin: true,
        layout: 'error-es-unavailable',
        requiresSecureConnection: false,
        selector: {
          enabled: false,
          providers: [{ name: 'basic', type: 'basic', usesLoginForm: true, showInSelector: true }],
        },
      };
      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: expectedPayload },
        payload: expectedPayload,
        status: 200,
      });
    });

    it('returns `form` layout if it is not specified in the license.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const expectedPayload = {
        allowLogin: true,
        layout: 'form',
        requiresSecureConnection: false,
        selector: {
          enabled: false,
          providers: [{ name: 'basic', type: 'basic', usesLoginForm: true, showInSelector: true }],
        },
      };
      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: expectedPayload },
        payload: expectedPayload,
        status: 200,
      });
    });

    it('returns `requiresSecureConnection: true` if `secureCookies` is enabled in config.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      config.secureCookies = true;

      const expectedPayload = expect.objectContaining({ requiresSecureConnection: true });
      await expect(
        routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
      ).resolves.toEqual({
        options: { body: expectedPayload },
        payload: expectedPayload,
        status: 200,
      });
    });

    it('returns `useLoginForm: true` for `basic` and `token` providers.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const cases: Array<[LoginSelectorProvider[], ConfigType['authc']]> = [
        [[], getAuthcConfig({ providers: { basic: { basic1: { order: 0, enabled: false } } } })],
        [
          [
            {
              name: 'basic1',
              type: 'basic',
              usesLoginForm: true,
              showInSelector: true,
              icon: 'logoElasticsearch',
              description: 'Log in with Elasticsearch',
            },
          ],
          getAuthcConfig({ providers: { basic: { basic1: { order: 0 } } } }),
        ],
        [
          [
            {
              name: 'token1',
              type: 'token',
              usesLoginForm: true,
              showInSelector: true,
              icon: 'logoElasticsearch',
              description: 'Log in with Elasticsearch',
            },
          ],
          getAuthcConfig({ providers: { token: { token1: { order: 0 } } } }),
        ],
      ];

      for (const [providers, authcConfig] of cases) {
        config.authc = authcConfig;

        const expectedPayload = expect.objectContaining({
          selector: { enabled: false, providers },
        });
        await expect(
          routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
        ).resolves.toEqual({
          options: { body: expectedPayload },
          payload: expectedPayload,
          status: 200,
        });
      }
    });

    it('correctly returns `selector` information.', async () => {
      license.getFeatures.mockReturnValue({ allowLogin: true, showLogin: true } as any);

      const request = httpServerMock.createKibanaRequest();
      const contextMock = coreMock.createRequestHandlerContext();

      const cases: Array<[ConfigType['authc'], LoginSelectorProvider[]]> = [
        // selector is disabled, multiple providers, all providers should be returned.
        [
          getAuthcConfig({
            selector: { enabled: false },
            providers: {
              basic: { basic1: { order: 0 } },
              saml: { saml1: { order: 1, realm: 'realm1' } },
            },
          }),
          [
            {
              name: 'basic1',
              type: 'basic',
              usesLoginForm: true,
              showInSelector: true,
              icon: 'logoElasticsearch',
              description: 'Log in with Elasticsearch',
            },
            {
              type: 'saml',
              name: 'saml1',
              usesLoginForm: false,
              showInSelector: false,
            },
          ],
        ],
        // selector is enabled, but only basic/token is available and should be returned.
        [
          getAuthcConfig({
            selector: { enabled: true },
            providers: { basic: { basic1: { order: 0 } } },
          }),
          [
            {
              name: 'basic1',
              type: 'basic',
              usesLoginForm: true,
              showInSelector: true,
              icon: 'logoElasticsearch',
              description: 'Log in with Elasticsearch',
            },
          ],
        ],
        // selector is enabled
        [
          getAuthcConfig({
            selector: { enabled: true },
            providers: {
              basic: {
                basic1: {
                  order: 0,
                  description: 'some-desc1',
                  hint: 'some-hint1',
                  icon: 'logoElasticsearch',
                },
              },
              saml: {
                saml1: {
                  order: 1,
                  description: 'some-desc2',
                  realm: 'realm1',
                  icon: 'some-icon2',
                  showInSelector: false,
                },
                saml2: { order: 2, description: 'some-desc3', hint: 'some-hint3', realm: 'realm2' },
              },
            },
          }),
          [
            {
              type: 'basic',
              name: 'basic1',
              description: 'some-desc1',
              hint: 'some-hint1',
              icon: 'logoElasticsearch',
              usesLoginForm: true,
              showInSelector: true,
            },
            {
              type: 'saml',
              name: 'saml1',
              description: 'some-desc2',
              icon: 'some-icon2',
              usesLoginForm: false,
              showInSelector: false,
            },
            {
              type: 'saml',
              name: 'saml2',
              description: 'some-desc3',
              hint: 'some-hint3',
              usesLoginForm: false,
              showInSelector: true,
            },
          ],
        ],
      ];

      for (const [authcConfig, expectedProviders] of cases) {
        config.authc = authcConfig;

        const expectedPayload = expect.objectContaining({
          selector: { enabled: authcConfig.selector.enabled, providers: expectedProviders },
        });
        await expect(
          routeHandler({ core: contextMock } as any, request, kibanaResponseFactory)
        ).resolves.toEqual({
          options: { body: expectedPayload },
          payload: expectedPayload,
          status: 200,
        });
      }
    });
  });
});
