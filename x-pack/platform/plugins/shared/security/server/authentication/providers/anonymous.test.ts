/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

import type { ScopeableRequest } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import { AnonymousAuthenticationProvider } from './anonymous';
import { mockAuthenticationProviderOptions } from './base.mock';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { BasicHTTPAuthorizationHeaderCredentials } from '../http_authentication';

function expectAuthenticateCall(
  mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
}

enum CredentialsType {
  Basic = 'Basic',
  ApiKey = 'ApiKey',
  None = 'ES native anonymous',
}

describe('AnonymousAuthenticationProvider', () => {
  const user = mockAuthenticatedUser({
    authentication_provider: { type: 'anonymous', name: 'anonymous1' },
  });

  for (const credentialsType of [
    CredentialsType.Basic,
    CredentialsType.ApiKey,
    CredentialsType.None,
  ]) {
    describe(`with ${credentialsType} credentials`, () => {
      let provider: AnonymousAuthenticationProvider;
      let mockOptions: ReturnType<typeof mockAuthenticationProviderOptions>;
      let authorization: string;
      beforeEach(() => {
        mockOptions = mockAuthenticationProviderOptions({ name: 'anonymous1' });

        let credentials;
        switch (credentialsType) {
          case CredentialsType.Basic:
            credentials = { username: 'user', password: 'pass' };
            authorization = new HTTPAuthorizationHeader(
              'Basic',
              new BasicHTTPAuthorizationHeaderCredentials('user', 'pass').toString()
            ).toString();
            break;
          case CredentialsType.ApiKey:
            credentials = { apiKey: 'some-apiKey' };
            authorization = new HTTPAuthorizationHeader('ApiKey', 'some-apiKey').toString();
            break;
          default:
            credentials = 'elasticsearch_anonymous_user' as 'elasticsearch_anonymous_user';
            break;
        }

        provider = new AnonymousAuthenticationProvider(mockOptions, { credentials });
      });

      describe('`login` method', () => {
        it('succeeds if credentials are valid, and creates session and authHeaders', async () => {
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(
            provider.login(httpServerMock.createKibanaRequest({ headers: {} }))
          ).resolves.toEqual(
            AuthenticationResult.succeeded(user, {
              authHeaders: { authorization },
              state: {},
            })
          );
          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
        });

        it('fails if user cannot be retrieved during login attempt', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });
          const authenticationError = new errors.ResponseError(
            securityMock.createApiResponse({ body: {} })
          );
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
            authenticationError
          );
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.login(request)).resolves.toEqual(
            AuthenticationResult.failed(authenticationError)
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

          expect(request.headers).not.toHaveProperty('authorization');
        });
      });

      describe('`authenticate` method', () => {
        it('does not create session for AJAX requests.', async () => {
          // Add `kbn-xsrf` header to make `can_redirect_request` think that it's AJAX request and
          // avoid triggering of redirect logic.
          await expect(
            provider.authenticate(
              httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } }),
              null
            )
          ).resolves.toEqual(AuthenticationResult.notHandled());
        });

        it('does not create session for request that do not require authentication.', async () => {
          await expect(
            provider.authenticate(httpServerMock.createKibanaRequest({ routeAuthRequired: false }))
          ).resolves.toEqual(AuthenticationResult.notHandled());
        });

        it('does not handle authentication via `authorization` header.', async () => {
          const originalAuthorizationHeader = 'Basic credentials';
          const request = httpServerMock.createKibanaRequest({
            headers: { authorization: originalAuthorizationHeader },
          });
          await expect(provider.authenticate(request)).resolves.toEqual(
            AuthenticationResult.notHandled()
          );

          expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
          expect(request.headers.authorization).toBe(originalAuthorizationHeader);
        });

        it('does not handle authentication via `authorization` header even if state exists.', async () => {
          const originalAuthorizationHeader = 'Basic credentials';
          const request = httpServerMock.createKibanaRequest({
            headers: { authorization: originalAuthorizationHeader },
          });
          await expect(provider.authenticate(request, {})).resolves.toEqual(
            AuthenticationResult.notHandled()
          );

          expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
          expect(request.headers.authorization).toBe(originalAuthorizationHeader);
        });

        it('succeeds for non-AJAX requests if state is available.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });

          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request, {})).resolves.toEqual(
            AuthenticationResult.succeeded(user, { authHeaders: { authorization } })
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
        });

        it('succeeds for AJAX requests if state is available.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'xsrf' } });

          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request, {})).resolves.toEqual(
            AuthenticationResult.succeeded(user, { authHeaders: { authorization } })
          );

          expectAuthenticateCall(mockOptions.client, {
            headers: { authorization, 'kbn-xsrf': 'xsrf' },
          });
        });

        it('non-AJAX requests can start a new session.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });

          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request)).resolves.toEqual(
            AuthenticationResult.succeeded(user, { state: {}, authHeaders: { authorization } })
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
        });

        it('fails if credentials are not valid.', async () => {
          const request = httpServerMock.createKibanaRequest({ headers: {} });

          const authenticationError = new errors.ResponseError(
            securityMock.createApiResponse({ body: {} })
          );
          const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
          mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
            authenticationError
          );
          mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

          await expect(provider.authenticate(request)).resolves.toEqual(
            AuthenticationResult.failed(authenticationError)
          );

          expectAuthenticateCall(mockOptions.client, { headers: { authorization } });

          expect(request.headers).not.toHaveProperty('authorization');
        });

        if (credentialsType === CredentialsType.ApiKey) {
          it('properly handles extended format for the ApiKey credentials', async () => {
            provider = new AnonymousAuthenticationProvider(mockOptions, {
              credentials: { apiKey: { id: 'some-id', key: 'some-key' } },
            });
            authorization = new HTTPAuthorizationHeader(
              'ApiKey',
              new BasicHTTPAuthorizationHeaderCredentials('some-id', 'some-key').toString()
            ).toString();

            const request = httpServerMock.createKibanaRequest({ headers: {} });

            const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
            mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
            mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

            await expect(provider.authenticate(request, {})).resolves.toEqual(
              AuthenticationResult.succeeded(user, { authHeaders: { authorization } })
            );

            expectAuthenticateCall(mockOptions.client, { headers: { authorization } });
          });
        }
      });

      describe('`logout` method', () => {
        it('does not handle logout if state is not present', async () => {
          await expect(provider.logout(httpServerMock.createKibanaRequest())).resolves.toEqual(
            DeauthenticationResult.notHandled()
          );
        });

        it('always redirects to the logged out page.', async () => {
          await expect(provider.logout(httpServerMock.createKibanaRequest(), {})).resolves.toEqual(
            DeauthenticationResult.redirectTo('/mock-server-basepath/security/logged_out')
          );

          await expect(
            provider.logout(httpServerMock.createKibanaRequest(), null)
          ).resolves.toEqual(
            DeauthenticationResult.redirectTo('/mock-server-basepath/security/logged_out')
          );
        });
      });

      it('`getHTTPAuthenticationScheme` method', () => {
        let expectedAuthenticationScheme;
        switch (credentialsType) {
          case CredentialsType.Basic:
            expectedAuthenticationScheme = 'basic';
            break;
          case CredentialsType.ApiKey:
            expectedAuthenticationScheme = 'apikey';
            break;
          default:
            expectedAuthenticationScheme = null;
            break;
        }
        expect(provider.getHTTPAuthenticationScheme()).toBe(expectedAuthenticationScheme);
      });
    });
  }
});
