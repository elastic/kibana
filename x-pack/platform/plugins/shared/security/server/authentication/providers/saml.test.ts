/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { ELASTIC_CLOUD_SSO_REALM_NAME } from './base';
import type { MockAuthenticationProviderOptions } from './base.mock';
import { mockAuthenticationProviderOptions } from './base.mock';
import { SAMLAuthenticationProvider, SAMLLogin } from './saml';
import {
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  AUTH_URL_HASH_QUERY_STRING_PARAMETER,
  ES_CLIENT_AUTHENTICATION_HEADER,
} from '../../../common/constants';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { InvalidGrantError } from '../../errors';
import { securityMock } from '../../mocks';
import { mockSamlResponses } from '../__fixtures__/mock_saml_responses';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';

describe('SAMLAuthenticationProvider', () => {
  let provider: SAMLAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  let mockUser: ReturnType<typeof mockAuthenticatedUser>;
  let mockScopedClusterClient: ReturnType<
    typeof elasticsearchServiceMock.createScopedClusterClient
  >;

  const mockSAMLSet1 = mockSamlResponses.set1;

  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'saml' });

    mockUser = mockAuthenticatedUser({ authentication_provider: { type: 'saml', name: 'saml' } });
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(mockUser);
    mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

    provider = new SAMLAuthenticationProvider(mockOptions);
  });

  describe('`login` method', () => {
    it('gets token and redirects user to requested URL if SAML Response is valid.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
        realm: 'test-realm',
        authentication: mockUser,
        in_response_to: mockSAMLSet1.requestId,
      });

      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: mockSAMLSet1.samlResponse,
          },
          {
            requestIdMap: {
              [mockSAMLSet1.requestId]: {
                redirectURL: '/test-base-path/some-path#some-app',
              },
            },
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/test-base-path/some-path#some-app', {
          userProfileGrant: { type: 'accessToken', accessToken: 'some-token' },
          state: {
            accessToken: 'some-token',
            refreshToken: 'some-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: {
          ids: [mockSAMLSet1.requestId],
          content: mockSAMLSet1.samlResponse,
          realm: 'test-realm',
        },
      });
    });

    it('gets token and redirects user to the requested URL if SAML Response is valid ignoring Relay State.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        access_token: 'some-token',
        refresh_token: 'some-refresh-token',
        realm: 'test-realm',
        authentication: mockUser,
        in_response_to: mockSAMLSet1.requestId,
      });

      provider = new SAMLAuthenticationProvider(mockOptions, {
        useRelayStateDeepLink: true,
      });
      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: mockSAMLSet1.samlResponse,
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          },
          {
            requestIdMap: {
              [mockSAMLSet1.requestId]: { redirectURL: '/test-base-path/some-path#some-app' },
            },
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/test-base-path/some-path#some-app', {
          userProfileGrant: { type: 'accessToken', accessToken: 'some-token' },
          state: {
            accessToken: 'some-token',
            refreshToken: 'some-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: {
          ids: [mockSAMLSet1.requestId],
          content: mockSAMLSet1.samlResponse,
          realm: 'test-realm',
        },
      });
    });

    it('fails if SAML Response payload is presented but state does not contain SAML Request token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
          },
          {} as any
        )
      ).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.badRequest('SAML response state does not have corresponding request id.')
        )
      );

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('fails if realm from state is different from the realm provider is configured with.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const customMockOptions = mockAuthenticationProviderOptions({ name: 'saml' });
      provider = new SAMLAuthenticationProvider(customMockOptions, {
        realm: 'test-realm',
      });

      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
          },
          { realm: 'other-realm' }
        )
      ).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.unauthorized(
            'State based on realm "other-realm", but provider with the name "saml" is configured to use realm "test-realm".'
          )
        )
      );

      expect(customMockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('redirects to the default location if state contains empty redirect URL.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        access_token: 'user-initiated-login-token',
        refresh_token: 'user-initiated-login-refresh-token',
        realm: 'test-realm',
        authentication: mockUser,
        in_response_to: mockSAMLSet1.requestId,
      });

      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: mockSAMLSet1.samlResponse,
          },
          {
            requestIdMap: { [mockSAMLSet1.requestId]: { redirectURL: '' } },
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/mock-server-basepath/', {
          userProfileGrant: { type: 'accessToken', accessToken: 'user-initiated-login-token' },
          state: {
            accessToken: 'user-initiated-login-token',
            refreshToken: 'user-initiated-login-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: {
          ids: [mockSAMLSet1.requestId],
          content: mockSAMLSet1.samlResponse,
          realm: 'test-realm',
        },
      });
    });

    it('redirects to the default location if state contains empty redirect URL ignoring Relay State.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        access_token: 'user-initiated-login-token',
        refresh_token: 'user-initiated-login-refresh-token',
        realm: 'test-realm',
        authentication: mockUser,
        in_response_to: mockSAMLSet1.requestId,
      });

      provider = new SAMLAuthenticationProvider(mockOptions, {
        useRelayStateDeepLink: true,
      });
      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: mockSAMLSet1.samlResponse,
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          },
          {
            requestIdMap: { [mockSAMLSet1.requestId]: { redirectURL: '' } },
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/mock-server-basepath/', {
          userProfileGrant: { type: 'accessToken', accessToken: 'user-initiated-login-token' },
          state: {
            accessToken: 'user-initiated-login-token',
            refreshToken: 'user-initiated-login-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: {
          ids: [mockSAMLSet1.requestId],
          content: mockSAMLSet1.samlResponse,
          realm: 'test-realm',
        },
      });
    });

    it('redirects to the default location if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        realm: 'test-realm',
        access_token: 'idp-initiated-login-token',
        refresh_token: 'idp-initiated-login-refresh-token',
        authentication: mockUser,
      });

      await expect(
        provider.login(request, {
          type: SAMLLogin.LoginWithSAMLResponse,
          samlResponse: 'saml-response-xml',
        })
      ).resolves.toEqual(
        AuthenticationResult.redirectTo('/mock-server-basepath/', {
          userProfileGrant: { type: 'accessToken', accessToken: 'idp-initiated-login-token' },
          state: {
            accessToken: 'idp-initiated-login-token',
            refreshToken: 'idp-initiated-login-refresh-token',
            realm: 'test-realm',
          },
          user: mockUser,
        })
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: { ids: [], content: 'saml-response-xml' },
      });
    });

    it('fails if SAML Response is rejected.', async () => {
      const request = httpServerMock.createKibanaRequest();

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 503, body: {} })
      );
      mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

      await expect(
        provider.login(
          request,
          {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: mockSAMLSet1.samlResponse,
          },
          {
            requestIdMap: {
              [mockSAMLSet1.requestId]: { redirectURL: '/test-base-path/some-path' },
            },
            realm: 'test-realm',
          }
        )
      ).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: {
          ids: [mockSAMLSet1.requestId],
          content: mockSAMLSet1.samlResponse,
          realm: 'test-realm',
        },
      });
    });

    describe('Multiple "concurrent" login requests', () => {
      it('should remove the successful requestId from the map, but leave the other requestIds', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
          access_token: 'some-token',
          refresh_token: 'some-refresh-token',
          realm: 'test-realm',
          authentication: mockUser,
          in_response_to: mockSamlResponses.set25.requestId,
        });

        const requestIdMap: Record<string, { redirectURL: string }> = {};

        Object.values(mockSamlResponses).forEach(
          (response) => (requestIdMap[response.requestId] = { redirectURL: response.redirectURL })
        );

        const requestIdMapResult = { ...requestIdMap };
        delete requestIdMapResult[mockSamlResponses.set25.requestId];

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginWithSAMLResponse,
              samlResponse: mockSamlResponses.set25.samlResponse,
            },
            {
              requestIdMap,
              realm: 'test-realm',
            }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo('/path25', {
            user: mockUser,
            userProfileGrant: { type: 'accessToken', accessToken: 'some-token' },
            state: {
              accessToken: 'some-token',
              refreshToken: 'some-refresh-token',
              requestIdMap: requestIdMapResult,
              realm: 'test-realm',
            },
          })
        );
      });

      it('should replace the first requestId in the list if a new User-Initiated call is made and there are 50 existing requestIds in the state', async () => {
        const request = httpServerMock.createKibanaRequest();

        const requestIdMap: Record<string, { redirectURL: string }> = {};

        Object.values(mockSamlResponses).forEach(
          (response) => (requestIdMap[response.requestId] = { redirectURL: response.redirectURL })
        );

        const newRequestId = '_mock_request_id_51';
        const requestIdMapResult = { ...requestIdMap };
        delete requestIdMapResult[mockSamlResponses.set1.requestId];
        requestIdMapResult[newRequestId] = { redirectURL: '/path51' };

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
          id: newRequestId,
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
          realm: 'test-realm',
        });

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginInitiatedByUser,
              redirectURL: '/path51',
            },
            { requestIdMap }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestIdMap: requestIdMapResult,
                realm: 'test-realm',
              },
              stateCookieOptions: { sameSite: 'None', isSecure: true },
            }
          )
        );

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/prepare',
          body: {
            acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
          },
        });
      });
    });

    describe('IdP initiated login', () => {
      beforeEach(() => {
        mockOptions.basePath.get.mockReturnValue(mockOptions.basePath.serverBasePath);

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
          username: 'user',
          access_token: 'valid-token',
          refresh_token: 'valid-refresh-token',
          realm: 'test-realm',
          authentication: mockUser,
        });

        provider = new SAMLAuthenticationProvider(mockOptions, {
          useRelayStateDeepLink: true,
        });
      });

      it('redirects to the home page if `useRelayStateDeepLink` is set to `false`.', async () => {
        provider = new SAMLAuthenticationProvider(mockOptions, {
          useRelayStateDeepLink: false,
        });

        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            userProfileGrant: { type: 'accessToken', accessToken: 'valid-token' },
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('redirects to the home page if `relayState` is not specified.', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            userProfileGrant: { type: 'accessToken', accessToken: 'valid-token' },
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('recognizes Elastic Cloud users.', async () => {
        const nonElasticCloudUser = mockAuthenticatedUser({
          authentication_provider: { type: 'saml', name: 'saml' },
          authentication_realm: { type: 'saml', name: 'random-saml' },
        });
        const elasticCloudUser = mockAuthenticatedUser({
          authentication_provider: { type: 'saml', name: 'saml' },
          authentication_realm: { type: 'saml', name: ELASTIC_CLOUD_SSO_REALM_NAME },
        });

        // The only case when user should be recognized as Elastic Cloud user: Kibana is running inside Cloud
        // deployment and user is authenticated with SAML realm of the predefined name.
        for (const [authentication, isElasticCloudDeployment, isElasticCloudUser] of [
          [nonElasticCloudUser, false, false],
          [nonElasticCloudUser, true, false],
          [elasticCloudUser, false, false],
          [elasticCloudUser, true, true],
        ]) {
          mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
            username: 'user',
            access_token: 'valid-token',
            refresh_token: 'valid-refresh-token',
            realm: 'test-realm',
            authentication,
          });

          mockOptions.isElasticCloudDeployment.mockReturnValue(isElasticCloudDeployment);

          const loginResult = await provider.login(
            httpServerMock.createKibanaRequest({ headers: {} }),
            {
              type: SAMLLogin.LoginWithSAMLResponse,
              samlResponse: 'saml-response-xml',
            }
          );

          expect(loginResult.user?.elastic_cloud_user).toBe(isElasticCloudUser);
        }
      });

      it('redirects to the home page if `relayState` includes external URL', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `https://evil.com${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            userProfileGrant: { type: 'accessToken', accessToken: 'valid-token' },
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('redirects to the home page if `relayState` includes URL that starts with double slashes', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `//${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            userProfileGrant: { type: 'accessToken', accessToken: 'valid-token' },
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );
      });

      it('redirects to the URL from the relay state.', async () => {
        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
            relayState: `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            `${mockOptions.basePath.serverBasePath}/app/some-app#some-deep-link`,
            {
              userProfileGrant: { type: 'accessToken', accessToken: 'valid-token' },
              state: {
                accessToken: 'valid-token',
                refreshToken: 'valid-refresh-token',
                realm: 'test-realm',
              },
              user: mockUser,
            }
          )
        );
      });

      it('uses `realm` name instead of `acs` if it is specified for SAML authenticate request.', async () => {
        // Create new provider instance with additional `realm` option.
        provider = new SAMLAuthenticationProvider(mockOptions, {
          realm: 'test-realm',
        });

        await expect(
          provider.login(httpServerMock.createKibanaRequest({ headers: {} }), {
            type: SAMLLogin.LoginWithSAMLResponse,
            samlResponse: 'saml-response-xml',
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(`${mockOptions.basePath.serverBasePath}/`, {
            userProfileGrant: { type: 'accessToken', accessToken: 'valid-token' },
            state: {
              accessToken: 'valid-token',
              refreshToken: 'valid-refresh-token',
              realm: 'test-realm',
            },
            user: mockUser,
          })
        );

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/authenticate',
          body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' },
        });
      });
    });

    describe('IdP initiated login with existing session', () => {
      it('fails if new SAML Response is rejected and provider is not configured with specific realm.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const authorization = 'Bearer some-valid-token';

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 503, body: {} })
        );
        mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginWithSAMLResponse,
              samlResponse: 'saml-response-xml',
            },
            {
              accessToken: 'some-valid-token',
              refreshToken: 'some-valid-refresh-token',
              realm: 'test-realm',
            }
          )
        ).resolves.toEqual(AuthenticationResult.failed(failureReason));

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/authenticate',
          body: { ids: [], content: 'saml-response-xml' },
        });
      });

      it('returns `notHandled` if new SAML Response is rejected and provider is configured with specific realm.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const authorization = 'Bearer some-valid-token';

        provider = new SAMLAuthenticationProvider(mockOptions, {
          realm: 'test-realm',
        });

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 503, body: {} })
        );
        mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginWithSAMLResponse,
              samlResponse: 'saml-response-xml',
            },
            {
              accessToken: 'some-valid-token',
              refreshToken: 'some-valid-refresh-token',
              realm: 'test-realm',
            }
          )
        ).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/authenticate',
          body: { ids: [], content: 'saml-response-xml', realm: 'test-realm' },
        });
      });

      it('fails if fails to invalidate existing access/refresh tokens.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          accessToken: 'existing-valid-token',
          refreshToken: 'existing-valid-refresh-token',
          realm: 'test-realm',
        };
        const authorization = `Bearer ${state.accessToken}`;

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
          username: 'user',
          access_token: 'new-valid-token',
          refresh_token: 'new-valid-refresh-token',
          authentication: mockUser,
        });

        const failureReason = new Error('Failed to invalidate token!');
        mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginWithSAMLResponse,
              samlResponse: 'saml-response-xml',
            },
            state
          )
        ).resolves.toEqual(AuthenticationResult.failed(failureReason));

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/authenticate',
          body: { ids: [], content: 'saml-response-xml' },
        });

        expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
        expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });
      });

      for (const [description, response] of [
        [
          'current session is valid',
          Promise.resolve(
            securityMock.createApiResponse({
              body: mockAuthenticatedUser({
                authentication_provider: { type: 'saml', name: 'saml' },
              }),
            })
          ),
        ],
        [
          'current session is expired',
          Promise.reject(
            new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
          ),
        ],
      ] as Array<[string, any]>) {
        it(`redirects to the home page if ${description}.`, async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const state = {
            accessToken: 'existing-token',
            refreshToken: 'existing-refresh-token',
            realm: 'test-realm',
          };
          const authorization = `Bearer ${state.accessToken}`;

          // The first call is made using tokens from existing session.
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockImplementationOnce(
            () => response
          );
          mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
            username: 'user',
            access_token: 'new-valid-token',
            refresh_token: 'new-valid-refresh-token',
            realm: 'test-realm',
            authentication: mockUser,
          });
          mockOptions.tokens.invalidate.mockResolvedValue(undefined);

          await expect(
            provider.login(
              request,
              {
                type: SAMLLogin.LoginWithSAMLResponse,
                samlResponse: 'saml-response-xml',
              },
              state
            )
          ).resolves.toEqual(
            AuthenticationResult.redirectTo('/mock-server-basepath/', {
              userProfileGrant: { type: 'accessToken', accessToken: 'new-valid-token' },
              state: {
                accessToken: 'new-valid-token',
                refreshToken: 'new-valid-refresh-token',
                realm: 'test-realm',
              },
              user: mockUser,
            })
          );

          expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
          expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
            method: 'POST',
            path: '/_security/saml/authenticate',
            body: { ids: [], content: 'saml-response-xml' },
          });

          expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
          expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
            accessToken: state.accessToken,
            refreshToken: state.refreshToken,
          });
        });

        it(`redirects to the URL from relay state if ${description}.`, async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const state = {
            accessToken: 'existing-token',
            refreshToken: 'existing-refresh-token',
            realm: 'test-realm',
          };
          const authorization = `Bearer ${state.accessToken}`;

          // The first call is made using tokens from existing session.
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockImplementationOnce(
            () => response
          );
          mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
            username: 'user',
            access_token: 'new-valid-token',
            refresh_token: 'new-valid-refresh-token',
            realm: 'test-realm',
            authentication: mockUser,
          });

          mockOptions.tokens.invalidate.mockResolvedValue(undefined);

          provider = new SAMLAuthenticationProvider(mockOptions, {
            useRelayStateDeepLink: true,
          });

          await expect(
            provider.login(
              request,
              {
                type: SAMLLogin.LoginWithSAMLResponse,
                samlResponse: 'saml-response-xml',
                relayState: '/mock-server-basepath/app/some-app#some-deep-link',
              },
              state
            )
          ).resolves.toEqual(
            AuthenticationResult.redirectTo('/mock-server-basepath/app/some-app#some-deep-link', {
              userProfileGrant: { type: 'accessToken', accessToken: 'new-valid-token' },
              state: {
                accessToken: 'new-valid-token',
                refreshToken: 'new-valid-refresh-token',
                realm: 'test-realm',
              },
              user: mockUser,
            })
          );

          expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });
          expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
            method: 'POST',
            path: '/_security/saml/authenticate',
            body: { ids: [], content: 'saml-response-xml' },
          });

          expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
          expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
            accessToken: state.accessToken,
            refreshToken: state.refreshToken,
          });
        });
      }
    });

    describe('User initiated login with captured redirect URL', () => {
      it('fails if redirectURL is not valid', async () => {
        const request = httpServerMock.createKibanaRequest();

        await expect(
          provider.login(request, {
            type: SAMLLogin.LoginInitiatedByUser,
            redirectURL: '',
          })
        ).resolves.toEqual(
          AuthenticationResult.failed(
            Boom.badRequest('Login attempt should include non-empty `redirectURL` string.')
          )
        );

        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      });

      it('redirects requests to the IdP remembering redirect URL with existing state.', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
          realm: 'test-realm',
        });

        await expect(
          provider.login(request, {
            type: SAMLLogin.LoginInitiatedByUser,
            redirectURL: '/test-base-path/some-path#some-fragment',
          })
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestIdMap: {
                  'some-request-id': { redirectURL: '/test-base-path/some-path#some-fragment' },
                },
                realm: 'test-realm',
              },
              stateCookieOptions: { sameSite: 'None', isSecure: true },
            }
          )
        );

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/prepare',
          body: {
            acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
          },
        });

        expect(mockOptions.logger.warn).not.toHaveBeenCalled();
      });

      it('redirects requests to the IdP remembering redirect URL without state.', async () => {
        const request = httpServerMock.createKibanaRequest();

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
          realm: 'test-realm',
        });

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginInitiatedByUser,
              redirectURL: '/test-base-path/some-path#some-fragment',
            },
            null
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestIdMap: {
                  'some-request-id': { redirectURL: '/test-base-path/some-path#some-fragment' },
                },
                realm: 'test-realm',
              },
              stateCookieOptions: { sameSite: 'None', isSecure: true },
            }
          )
        );

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/prepare',
          body: {
            acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
          },
        });

        expect(mockOptions.logger.warn).not.toHaveBeenCalled();
      });

      it('uses `realm` name instead of `acs` if it is specified for SAML prepare request.', async () => {
        const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });

        // Create new provider instance with additional `realm` option.
        const customMockOptions = mockAuthenticationProviderOptions();
        provider = new SAMLAuthenticationProvider(customMockOptions, {
          realm: 'test-realm',
        });

        customMockOptions.client.asInternalUser.transport.request.mockResolvedValue({
          id: 'some-request-id',
          redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
          realm: 'test-realm',
        });

        await expect(
          provider.login(
            request,
            {
              type: SAMLLogin.LoginInitiatedByUser,
              redirectURL: '/test-base-path/some-path#some-fragment',
            },
            { realm: 'test-realm' }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo(
            'https://idp-host/path/login?SAMLRequest=some%20request%20',
            {
              state: {
                requestIdMap: {
                  'some-request-id': { redirectURL: '/test-base-path/some-path#some-fragment' },
                },
                realm: 'test-realm',
              },
              stateCookieOptions: { sameSite: 'None', isSecure: true },
            }
          )
        );

        expect(customMockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/prepare',
          body: { realm: 'test-realm' },
        });
      });

      it('fails if SAML request preparation fails.', async () => {
        const request = httpServerMock.createKibanaRequest();

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 401, body: {} })
        );
        mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

        await expect(
          provider.login(request, {
            type: SAMLLogin.LoginInitiatedByUser,
            redirectURL: '/test-base-path/some-path#some-fragment',
          })
        ).resolves.toEqual(AuthenticationResult.failed(failureReason));

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/prepare',
          body: {
            acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
          },
        });
      });
    });
  });

  describe('`authenticate` method', () => {
    it('does not handle AJAX request that can not be authenticated.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

      await expect(provider.authenticate(request, null)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );
    });

    it('does not handle non-AJAX request that does not require authentication.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );
    });

    it('does not handle authentication via `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not handle authentication via `authorization` header even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(
        provider.authenticate(request, {
          accessToken: 'some-valid-token',
          refreshToken: 'some-valid-refresh-token',
          realm: 'test-realm',
        })
      ).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('redirects non-AJAX request that can not be authenticated to the "capture URL" page.', async () => {
      mockOptions.getRequestOriginalURL.mockReturnValue(
        '/mock-server-basepath/s/foo/some-path?auth_provider_hint=saml'
      );
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path' });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/internal/security/capture-url?next=%2Fmock-server-basepath%2Fs%2Ffoo%2Fsome-path%3Fauth_provider_hint%3Dsaml',
          { state: null }
        )
      );

      expect(mockOptions.getRequestOriginalURL).toHaveBeenCalledTimes(1);
      expect(mockOptions.getRequestOriginalURL).toHaveBeenCalledWith(request, [
        [AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER, 'saml'],
      ]);

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('initiates SAML handshake for non-AJAX request that can not be authenticated, but includes URL hash fragment.', async () => {
      mockOptions.getRequestOriginalURL.mockReturnValue('/mock-server-basepath/s/foo/some-path');
      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        id: 'some-request-id',
        redirect: 'https://idp-host/path/login?SAMLRequest=some%20request%20',
      });

      const request = httpServerMock.createKibanaRequest({
        path: '/s/foo/some-path',
        query: { [AUTH_URL_HASH_QUERY_STRING_PARAMETER]: '#some-fragment' },
      });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          'https://idp-host/path/login?SAMLRequest=some%20request%20',
          {
            state: {
              requestIdMap: {
                'some-request-id': {
                  redirectURL: '/mock-server-basepath/s/foo/some-path#some-fragment',
                },
              },
            },
            stateCookieOptions: { sameSite: 'None', isSecure: true },
          }
        )
      );

      expect(mockOptions.getRequestOriginalURL).toHaveBeenCalledTimes(1);
      expect(mockOptions.getRequestOriginalURL).toHaveBeenCalledWith(request);

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/prepare',
        body: {
          acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
        },
      });
    });

    it('succeeds if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(mockUser, { authHeaders: { authorization } })
      );

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        accessToken: 'some-valid-token',
        refreshToken: 'some-valid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(failureReason);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        realm: 'test-realm',
      };

      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );

      mockOptions.tokens.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        authenticationInfo: mockUser,
      });

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(mockUser, {
          authHeaders: { authorization: 'Bearer new-access-token' },
          state: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            realm: 'test-realm',
          },
        })
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is expired and refresh attempt failed with unknown reason too.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );

      const refreshFailureReason = {
        statusCode: 500,
        message: 'Something is wrong with refresh token.',
      };
      mockOptions.tokens.refresh.mockRejectedValue(refreshFailureReason);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(refreshFailureReason as any)
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails for AJAX requests with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );

      mockOptions.tokens.refresh.mockRejectedValue(
        InvalidGrantError.expiredOrInvalidRefreshToken()
      );

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.badRequest(
            'Your session has expired because your refresh token is no longer valid. Please log in again.'
          )
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { 'kbn-xsrf': 'xsrf', authorization },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails for non-AJAX requests that do not require authentication with user friendly message if refresh token is expired.', async () => {
      const request = httpServerMock.createKibanaRequest({ routeAuthRequired: false, headers: {} });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );

      mockOptions.tokens.refresh.mockRejectedValue(
        InvalidGrantError.expiredOrInvalidRefreshToken()
      );

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.badRequest(
            'Your session has expired because your refresh token is no longer valid. Please log in again.'
          )
        )
      );

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('re-capture URL for non-AJAX requests if refresh token is expired.', async () => {
      mockOptions.getRequestOriginalURL.mockReturnValue(
        '/mock-server-basepath/s/foo/some-path?auth_provider_hint=saml'
      );
      const request = httpServerMock.createKibanaRequest({ path: '/s/foo/some-path', headers: {} });
      const state = {
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        realm: 'test-realm',
      };
      const authorization = `Bearer ${state.accessToken}`;

      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );

      mockOptions.tokens.refresh.mockRejectedValue(
        InvalidGrantError.expiredOrInvalidRefreshToken()
      );

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.redirectTo(
          '/mock-server-basepath/internal/security/capture-url?next=%2Fmock-server-basepath%2Fs%2Ffoo%2Fsome-path%3Fauth_provider_hint%3Dsaml',
          { state: null }
        )
      );

      expect(mockOptions.getRequestOriginalURL).toHaveBeenCalledTimes(1);
      expect(mockOptions.getRequestOriginalURL).toHaveBeenCalledWith(request, [
        [AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER, 'saml'],
      ]);

      expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('fails if realm from state is different from the realm provider is configured with.', async () => {
      const request = httpServerMock.createKibanaRequest();

      // Create new provider instance with additional `realm` option.
      const customMockOptions = mockAuthenticationProviderOptions({ name: 'saml' });
      provider = new SAMLAuthenticationProvider(customMockOptions, {
        realm: 'test-realm',
      });

      await expect(provider.authenticate(request, { realm: 'other-realm' })).resolves.toEqual(
        AuthenticationResult.failed(
          Boom.unauthorized(
            'State based on realm "other-realm", but provider with the name "saml" is configured to use realm "test-realm".'
          )
        )
      );
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented or does not include access token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request)).resolves.toEqual(DeauthenticationResult.notHandled());

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('redirects to logged out view if state is `null` or does not include access token.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request, null)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
      );
      await expect(provider.logout(request, { somethingElse: 'x' } as any)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
      );

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('fails if SAML logout call fails.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.failed(failureReason));

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/logout',
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('fails if SAML invalidate call fails.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 500, body: {} })
      );
      mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.failed(failureReason)
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/invalidate',
        body: {
          query_string: 'SAMLRequest=xxx%20yyy',
          acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
        },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML logout response is null.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({ redirect: null });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request)));

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/logout',
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML logout response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        redirect: undefined,
      });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request)));

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/logout',
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('relies on SAML logout if query string is not empty, but does not include SAMLRequest.', async () => {
      const request = httpServerMock.createKibanaRequest({
        query: { Whatever: 'something unrelated', SAMLResponse: 'xxx yyy' },
      });
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({ redirect: null });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request)));

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/logout',
        body: { token: accessToken, refresh_token: refreshToken },
      });
    });

    it('relies on SAML invalidate call even if access token is presented.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({ redirect: null });

      await expect(
        provider.logout(request, {
          accessToken: 'x-saml-token',
          refreshToken: 'x-saml-refresh-token',
          realm: 'test-realm',
        })
      ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request)));

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/invalidate',
        body: { query_string: 'SAMLRequest=xxx%20yyy', realm: 'test-realm' },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML invalidate response is null.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({ redirect: null });

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/invalidate',
        body: {
          query_string: 'SAMLRequest=xxx%20yyy',
          acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
        },
      });
    });

    it('redirects to `loggedOut` URL if `redirect` field in SAML invalidate response is not defined.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        redirect: undefined,
      });

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/saml/invalidate',
        body: {
          query_string: 'SAMLRequest=xxx%20yyy',
          acs: 'test-protocol://test-hostname:1234/mock-server-basepath/api/security/saml/callback',
        },
      });
    });

    it('redirects to `loggedOut` URL if SAML logout response is received.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLResponse: 'xxx yyy' } });

      await expect(provider.logout(request)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
      );

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of SP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const accessToken = 'x-saml-token';
      const refreshToken = 'x-saml-refresh-token';

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H',
      });

      await expect(
        provider.logout(request, {
          accessToken,
          refreshToken,
          realm: 'test-realm',
        })
      ).resolves.toEqual(
        DeauthenticationResult.redirectTo('http://fake-idp/SLO?SAMLRequest=7zlH37H')
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
    });

    it('redirects user to the IdP if SLO is supported by IdP in case of IdP initiated logout.', async () => {
      const request = httpServerMock.createKibanaRequest({ query: { SAMLRequest: 'xxx yyy' } });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        redirect: 'http://fake-idp/SLO?SAMLRequest=7zlH37H',
      });

      await expect(
        provider.logout(request, {
          accessToken: 'x-saml-token',
          refreshToken: 'x-saml-refresh-token',
          realm: 'test-realm',
        })
      ).resolves.toEqual(
        DeauthenticationResult.redirectTo('http://fake-idp/SLO?SAMLRequest=7zlH37H')
      );

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('`doesSessionNeedToBeCheckedForRequestIds` method', () => {
    it('returns true when state is undefined', () => {
      expect(provider.shouldInvalidateIntermediateSessionAfterLogin(undefined)).toBe(true);
    });

    it('returns true when state is null', () => {
      expect(provider.shouldInvalidateIntermediateSessionAfterLogin(null)).toBe(true);
    });

    it('returns true when state has no requestIdMap', () => {
      const state = {
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
        realm: 'test-realm',
      };
      expect(provider.shouldInvalidateIntermediateSessionAfterLogin(state)).toBe(true);
    });

    it('returns true when requestIdMap is empty', () => {
      const state = {
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
        realm: 'test-realm',
        requestIdMap: {},
      };
      expect(provider.shouldInvalidateIntermediateSessionAfterLogin(state)).toBe(true);
    });

    it('returns false when requestIdMap has one entry', () => {
      const state = {
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
        realm: 'test-realm',
        requestIdMap: {
          'request-id-1': { redirectURL: '/some-path' },
        },
      };
      expect(provider.shouldInvalidateIntermediateSessionAfterLogin(state)).toBe(false);
    });

    it('returns false when requestIdMap has multiple entries', () => {
      const state = {
        accessToken: 'some-token',
        refreshToken: 'some-refresh-token',
        realm: 'test-realm',
        requestIdMap: {
          'request-id-1': { redirectURL: '/some-path' },
          'request-id-2': { redirectURL: '/another-path' },
          'request-id-3': { redirectURL: '/third-path' },
        },
      };
      expect(provider.shouldInvalidateIntermediateSessionAfterLogin(state)).toBe(false);
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });

  describe('UIAM mode', () => {
    beforeEach(() => {
      mockUser = mockAuthenticatedUser({
        authentication_provider: { type: 'saml', name: ELASTIC_CLOUD_SSO_REALM_NAME },
      });
      mockOptions = mockAuthenticationProviderOptions({
        name: ELASTIC_CLOUD_SSO_REALM_NAME,
        uiam: true,
      });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        access_token: 'essu_dev_some-token',
        refresh_token: 'essu_dev_some-refresh-token',
        realm: ELASTIC_CLOUD_SSO_REALM_NAME,
        authentication: mockUser,
        in_response_to: mockSAMLSet1.requestId,
      });
      mockOptions.uiam?.getClientAuthentication.mockReturnValue({
        scheme: 'SharedSecret',
        value: 'some-secret',
      });
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      provider = new SAMLAuthenticationProvider(mockOptions, {
        realm: ELASTIC_CLOUD_SSO_REALM_NAME,
      });
    });

    describe('`login` method', () => {
      it('properly constructs user profile activate grant when UIAM is enabled.', async () => {
        const request = httpServerMock.createKibanaRequest();
        await expect(
          provider.login(
            request,
            { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: mockSAMLSet1.samlResponse },
            {
              requestIdMap: {
                [mockSAMLSet1.requestId]: { redirectURL: '/test-base-path/some-path#some-app' },
              },
              realm: ELASTIC_CLOUD_SSO_REALM_NAME,
            }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo('/test-base-path/some-path#some-app', {
            userProfileGrant: {
              type: 'uiamAccessToken',
              accessToken: 'essu_dev_some-token',
              clientAuthentication: { scheme: 'SharedSecret', value: 'some-secret' },
            },
            state: {
              accessToken: 'essu_dev_some-token',
              refreshToken: 'essu_dev_some-refresh-token',
              realm: ELASTIC_CLOUD_SSO_REALM_NAME,
            },
            user: mockUser,
          })
        );

        expect(mockOptions.uiam?.getClientAuthentication).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/authenticate',
          body: {
            ids: [mockSAMLSet1.requestId],
            content: mockSAMLSet1.samlResponse,
            realm: ELASTIC_CLOUD_SSO_REALM_NAME,
          },
        });
      });
    });

    describe('`authenticate` method', () => {
      it('properly constructs authentication headers when UIAM is enabled.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          accessToken: 'essu_dev_some-valid-token',
          refreshToken: 'essu_dev_some-valid-refresh-token',
          realm: ELASTIC_CLOUD_SSO_REALM_NAME,
        };
        const authorization = `Bearer ${state.accessToken}`;

        await expect(provider.authenticate(request, state)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser, {
            authHeaders: { authorization, [ES_CLIENT_AUTHENTICATION_HEADER]: 'some-shared-secret' },
          })
        );

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization, [ES_CLIENT_AUTHENTICATION_HEADER]: 'some-shared-secret' },
        });

        expect(request.headers).not.toHaveProperty('authorization');
        expect(request.headers).not.toHaveProperty(ES_CLIENT_AUTHENTICATION_HEADER);
      });
    });

    describe('`logout` method', () => {
      it('returns `notHandled` if state is not presented or does not include access token.', async () => {
        const request = httpServerMock.createKibanaRequest();

        await expect(provider.logout(request)).resolves.toEqual(
          DeauthenticationResult.notHandled()
        );

        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      });

      it('fails if token invalidation fails.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const accessToken = 'essu_dev_x-saml-token';
        const refreshToken = 'essu_dev_x-saml-refresh-token';

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 500, body: {} })
        );
        mockOptions.uiam?.invalidateSessionTokens.mockRejectedValue(failureReason);

        await expect(
          provider.logout(request, {
            accessToken,
            refreshToken,
            realm: ELASTIC_CLOUD_SSO_REALM_NAME,
          })
        ).resolves.toEqual(DeauthenticationResult.failed(failureReason));

        expect(mockOptions.uiam?.invalidateSessionTokens).toHaveBeenCalledTimes(1);
        expect(mockOptions.uiam?.invalidateSessionTokens).toHaveBeenCalledWith(
          'essu_dev_x-saml-token',
          'essu_dev_x-saml-refresh-token'
        );

        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      });

      it('redirects to `loggedOut` URL.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const accessToken = 'essu_dev_x-saml-token';
        const refreshToken = 'essu_dev_x-saml-refresh-token';

        await expect(
          provider.logout(request, {
            accessToken,
            refreshToken,
            realm: 'test-realm',
          })
        ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request)));

        expect(mockOptions.uiam?.invalidateSessionTokens).toHaveBeenCalledTimes(1);
        expect(mockOptions.uiam?.invalidateSessionTokens).toHaveBeenCalledWith(
          'essu_dev_x-saml-token',
          'essu_dev_x-saml-refresh-token'
        );

        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      });
    });

    describe('refresh token handling', () => {
      it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const state = {
          accessToken: 'essu_dev_expired-token',
          refreshToken: 'essu_dev_valid-refresh-token',
          realm: 'cloud-saml-kibana',
        };

        mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValueOnce(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
        );

        mockOptions.uiam?.refreshSessionTokens.mockResolvedValue({
          accessToken: 'essu_dev_new-access-token',
          refreshToken: 'essu_dev_new-refresh-token',
        });

        mockOptions.uiam?.getClientAuthentication.mockReturnValue({
          scheme: 'SharedSecret',
          value: 'some-secret',
        });

        await expect(provider.authenticate(request, state)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser, {
            authHeaders: { authorization: 'Bearer essu_dev_new-access-token' },
            userProfileGrant: {
              type: 'uiamAccessToken',
              accessToken: 'essu_dev_new-access-token',
              clientAuthentication: { scheme: 'SharedSecret', value: 'some-secret' },
            },
            state: {
              accessToken: 'essu_dev_new-access-token',
              refreshToken: 'essu_dev_new-refresh-token',
              realm: 'cloud-saml-kibana',
            },
          })
        );

        expect(mockOptions.uiam?.refreshSessionTokens).toHaveBeenCalledTimes(1);
        expect(mockOptions.uiam?.refreshSessionTokens).toHaveBeenCalledWith(state.refreshToken);

        expect(request.headers).not.toHaveProperty('authorization');
        expect(request.headers).not.toHaveProperty(ES_CLIENT_AUTHENTICATION_HEADER);
      });

      it('fails if token from the state is expired, refresh attempt failed, and displays error from UIAM', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          accessToken: 'essu_dev_expired-token',
          refreshToken: 'essu_dev_invalid-refresh-token',
          realm: 'cloud-saml-kibana',
        };
        const authorization = `Bearer ${state.accessToken}`;

        mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
        );

        const refreshFailureReason = new Boom.Boom('Authentication failed');
        mockOptions.uiam?.refreshSessionTokens.mockRejectedValue(refreshFailureReason);

        await expect(provider.authenticate(request, state)).resolves.toEqual(
          AuthenticationResult.failed(refreshFailureReason as any)
        );

        expect(mockOptions.uiam?.refreshSessionTokens).toHaveBeenCalledTimes(1);
        expect(mockOptions.uiam?.refreshSessionTokens).toHaveBeenCalledWith(state.refreshToken);

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: { authorization, [ES_CLIENT_AUTHENTICATION_HEADER]: 'some-shared-secret' },
        });

        expect(request.headers).not.toHaveProperty('authorization');
        expect(request.headers).not.toHaveProperty(ES_CLIENT_AUTHENTICATION_HEADER);
      });
    });
  });

  describe('UIAM mode with ES native tokens', () => {
    beforeEach(() => {
      mockUser = mockAuthenticatedUser({
        authentication_provider: { type: 'saml', name: ELASTIC_CLOUD_SSO_REALM_NAME },
      });
      mockOptions = mockAuthenticationProviderOptions({
        name: ELASTIC_CLOUD_SSO_REALM_NAME,
        uiam: true,
      });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        access_token: 'x_essu_dev_some-token',
        refresh_token: 'x_essu_dev_some-refresh-token',
        realm: ELASTIC_CLOUD_SSO_REALM_NAME,
        authentication: mockUser,
        in_response_to: mockSAMLSet1.requestId,
      });
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      provider = new SAMLAuthenticationProvider(mockOptions, {
        realm: ELASTIC_CLOUD_SSO_REALM_NAME,
      });
    });

    describe('`login` method', () => {
      it('properly constructs ES native user profile activate grant when UIAM is enabled.', async () => {
        const request = httpServerMock.createKibanaRequest();
        await expect(
          provider.login(
            request,
            { type: SAMLLogin.LoginWithSAMLResponse, samlResponse: mockSAMLSet1.samlResponse },
            {
              requestIdMap: {
                [mockSAMLSet1.requestId]: { redirectURL: '/test-base-path/some-path#some-app' },
              },
              realm: ELASTIC_CLOUD_SSO_REALM_NAME,
            }
          )
        ).resolves.toEqual(
          AuthenticationResult.redirectTo('/test-base-path/some-path#some-app', {
            userProfileGrant: { type: 'accessToken', accessToken: 'x_essu_dev_some-token' },
            state: {
              accessToken: 'x_essu_dev_some-token',
              refreshToken: 'x_essu_dev_some-refresh-token',
              realm: ELASTIC_CLOUD_SSO_REALM_NAME,
            },
            user: mockUser,
          })
        );

        expect(mockOptions.uiam?.getClientAuthentication).not.toHaveBeenCalled();
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/authenticate',
          body: {
            ids: [mockSAMLSet1.requestId],
            content: mockSAMLSet1.samlResponse,
            realm: ELASTIC_CLOUD_SSO_REALM_NAME,
          },
        });
      });
    });

    describe('`authenticate` method', () => {
      it('properly constructs authentication headers only with ES native access token when UIAM is enabled.', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          accessToken: 'x_essu_dev_some-valid-token',
          refreshToken: 'x_essu_dev_some-valid-refresh-token',
          realm: ELASTIC_CLOUD_SSO_REALM_NAME,
        };
        const authorization = `Bearer ${state.accessToken}`;

        await expect(provider.authenticate(request, state)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser, { authHeaders: { authorization } })
        );

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

        expect(request.headers).not.toHaveProperty('authorization');
        expect(request.headers).not.toHaveProperty(ES_CLIENT_AUTHENTICATION_HEADER);
      });
    });

    describe('`logout` method', () => {
      it('returns `notHandled` if state is not presented or does not include access token.', async () => {
        const request = httpServerMock.createKibanaRequest();

        await expect(provider.logout(request)).resolves.toEqual(
          DeauthenticationResult.notHandled()
        );

        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      });

      it('fails if token invalidation fails.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const accessToken = 'x_essu_dev_x-saml-token';
        const refreshToken = 'x_essu_dev_x-saml-refresh-token';

        const failureReason = new errors.ResponseError(
          securityMock.createApiResponse({ statusCode: 500, body: {} })
        );
        mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

        await expect(
          provider.logout(request, {
            accessToken,
            refreshToken,
            realm: ELASTIC_CLOUD_SSO_REALM_NAME,
          })
        ).resolves.toEqual(DeauthenticationResult.failed(failureReason));

        expect(mockOptions.uiam?.invalidateSessionTokens).not.toHaveBeenCalled();

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/logout',
          body: { token: accessToken, refresh_token: refreshToken },
        });
      });

      it('redirects to `loggedOut` URL.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const accessToken = 'x_essu_dev_x-saml-token';
        const refreshToken = 'x_essu_dev_x-saml-refresh-token';

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({ redirect: null });

        await expect(
          provider.logout(request, {
            accessToken,
            refreshToken,
            realm: 'test-realm',
          })
        ).resolves.toEqual(DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request)));

        expect(mockOptions.uiam?.invalidateSessionTokens).not.toHaveBeenCalled();

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/saml/logout',
          body: { token: accessToken, refresh_token: refreshToken },
        });
      });
    });

    describe('refresh token handling', () => {
      it('succeeds if token from the state is expired, but has been successfully refreshed.', async () => {
        const request = httpServerMock.createKibanaRequest();
        const state = {
          accessToken: 'x_essu_dev_expired-token',
          refreshToken: 'x_essu_dev_valid-refresh-token',
          realm: 'cloud-saml-kibana',
        };

        mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValueOnce(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
        );

        mockOptions.tokens.refresh.mockResolvedValue({
          accessToken: 'x_essu_dev_new-access-token',
          refreshToken: 'x_essu_dev_new-refresh-token',
          authenticationInfo: mockUser,
        });

        await expect(provider.authenticate(request, state)).resolves.toEqual(
          AuthenticationResult.succeeded(mockUser, {
            authHeaders: { authorization: 'Bearer x_essu_dev_new-access-token' },
            state: {
              accessToken: 'x_essu_dev_new-access-token',
              refreshToken: 'x_essu_dev_new-refresh-token',
              realm: 'cloud-saml-kibana',
            },
          })
        );

        expect(mockOptions.uiam?.refreshSessionTokens).not.toHaveBeenCalled();

        expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
        expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

        expect(request.headers).not.toHaveProperty('authorization');
        expect(request.headers).not.toHaveProperty(ES_CLIENT_AUTHENTICATION_HEADER);
      });

      it('fails if token from the state is expired, refresh attempt failed, and displays error from UIAM', async () => {
        const request = httpServerMock.createKibanaRequest({ headers: {} });
        const state = {
          accessToken: 'x_essu_dev_expired-token',
          refreshToken: 'x_essu_dev_invalid-refresh-token',
          realm: 'cloud-saml-kibana',
        };
        const authorization = `Bearer ${state.accessToken}`;

        mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
          new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
        );

        const refreshFailureReason = new Boom.Boom('Authentication failed');
        mockOptions.tokens.refresh.mockRejectedValue(refreshFailureReason);

        await expect(provider.authenticate(request, state)).resolves.toEqual(
          AuthenticationResult.failed(refreshFailureReason as any)
        );

        expect(mockOptions.uiam?.refreshSessionTokens).not.toHaveBeenCalled();

        expect(mockOptions.tokens.refresh).toHaveBeenCalledTimes(1);
        expect(mockOptions.tokens.refresh).toHaveBeenCalledWith(state.refreshToken);

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({ headers: { authorization } });

        expect(request.headers).not.toHaveProperty('authorization');
        expect(request.headers).not.toHaveProperty(ES_CLIENT_AUTHENTICATION_HEADER);
      });
    });
  });
});
