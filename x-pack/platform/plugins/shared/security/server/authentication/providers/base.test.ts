/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { BaseAuthenticationProvider } from './base';
import {
  mockAuthenticationProviderOptions,
  type MockAuthenticationProviderOptions,
} from './base.mock';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { sessionMock } from '../../session_management/session.mock';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';

// Concrete subclass to test protected methods on the abstract BaseAuthenticationProvider.
class TestAuthenticationProvider extends BaseAuthenticationProvider {
  static readonly type = 'test';

  async authenticate() {
    return AuthenticationResult.notHandled();
  }

  async logout() {
    return DeauthenticationResult.notHandled();
  }

  getHTTPAuthenticationScheme() {
    return null;
  }

  // Expose the protected `getUser` for testing.
  public getUserPublic(...args: Parameters<BaseAuthenticationProvider['getUser']>) {
    return this.getUser(...args);
  }
}

describe('BaseAuthenticationProvider', () => {
  let provider: TestAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;

  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions();
    provider = new TestAuthenticationProvider(mockOptions);
  });

  describe('getUser', () => {
    describe('minimal authentication mode', () => {
      const createMinimalAuthcRequest = () =>
        httpServerMock.createKibanaRequest({
          kibanaRouteOptions: {
            xsrfRequired: true,
            access: 'internal',
            security: {
              authc: { enabled: 'minimal', reason: 'some reason' },
              authz: { enabled: false, reason: 'some reason' },
            },
          },
        });

      it('returns a user proxy without calling Elasticsearch when session has a username', async () => {
        const session = sessionMock.createValue({
          username: 'testuser',
          userProfileId: 'profile-uid-1',
          provider: { type: 'test', name: 'test1' },
        });

        const request = createMinimalAuthcRequest();
        const user = await provider.getUserPublic(request, undefined, session);

        // Should NOT call Elasticsearch _authenticate
        expect(mockOptions.client.asScoped).not.toHaveBeenCalled();

        // Should return expected properties from session
        expect(user.username).toBe('testuser');
        expect(user.profile_uid).toBe('profile-uid-1');
        expect(user.authentication_provider).toEqual({ type: 'test', name: 'test1' });
        expect(user.enabled).toBe(true);
        expect(user.roles).toEqual([]);
      });

      it('throws when accessing properties not available in minimal mode', async () => {
        const session = sessionMock.createValue({ username: 'testuser' });
        const request = createMinimalAuthcRequest();

        const user = await provider.getUserPublic(request, undefined, session);

        for (const prop of [
          'elastic_cloud_user',
          'authentication_realm',
          'lookup_realm',
          'authentication_type',
        ]) {
          expect(() => (user as any)[prop]).toThrow(
            `Property "${prop}" is not available for minimally authenticated users.`
          );
        }
      });

      it('returns a frozen user proxy', async () => {
        const session = sessionMock.createValue({ username: 'testuser' });
        const request = createMinimalAuthcRequest();

        const user = await provider.getUserPublic(request, undefined, session);

        expect(() => {
          (user as any).username = 'changed';
        }).toThrowErrorMatchingInlineSnapshot(
          `"Cannot assign to read only property 'username' of object '#<Object>'"`
        );
      });

      it('falls back to Elasticsearch _authenticate when session has no username', async () => {
        const session = sessionMock.createValue({ username: undefined });
        const request = createMinimalAuthcRequest();

        const esUser = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(esUser);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        const user = await provider.getUserPublic(request, undefined, session);

        expect(mockOptions.client.asScoped).toHaveBeenCalled();
        expect(user.username).toBe(esUser.username);
      });

      it('falls back to Elasticsearch _authenticate when session is undefined', async () => {
        const request = createMinimalAuthcRequest();

        const esUser = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(esUser);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        const user = await provider.getUserPublic(request, undefined, undefined);

        expect(mockOptions.client.asScoped).toHaveBeenCalled();
        expect(user.username).toBe(esUser.username);
      });
    });

    describe('standard authentication mode', () => {
      it('calls Elasticsearch _authenticate when authc mode is not minimal', async () => {
        const session = sessionMock.createValue({ username: 'testuser' });
        const request = httpServerMock.createKibanaRequest();

        const esUser = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(esUser);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        const user = await provider.getUserPublic(request, undefined, session);

        expect(mockOptions.client.asScoped).toHaveBeenCalled();
        expect(user.username).toBe(esUser.username);
      });

      it('uses original request when no auth headers are provided', async () => {
        const request = httpServerMock.createKibanaRequest();

        const esUser = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(esUser);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        await provider.getUserPublic(request);

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith(request);
      });

      it('combines request and auth headers when auth headers are provided', async () => {
        const request = httpServerMock.createKibanaRequest({
          headers: { 'x-custom': 'value' },
        });
        const authHeaders = { authorization: 'Bearer token123' };

        const esUser = mockAuthenticatedUser();
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(esUser);
        mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

        await provider.getUserPublic(request, authHeaders);

        expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
          headers: expect.objectContaining({
            'x-custom': 'value',
            authorization: 'Bearer token123',
          }),
        });
      });
    });
  });

  describe('authenticationInfoToAuthenticatedUser', () => {
    it('sets elastic_cloud_user to true for cloud SSO realm', async () => {
      mockOptions.isElasticCloudDeployment.mockReturnValue(true);
      provider = new TestAuthenticationProvider(mockOptions);

      const request = httpServerMock.createKibanaRequest();
      const esUser = mockAuthenticatedUser({
        authentication_realm: { name: 'cloud-saml-kibana', type: 'saml' },
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(esUser);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const user = await provider.getUserPublic(request);
      expect(user.elastic_cloud_user).toBe(true);
    });

    it('sets elastic_cloud_user to false when not on cloud', async () => {
      mockOptions.isElasticCloudDeployment.mockReturnValue(false);

      const request = httpServerMock.createKibanaRequest();
      const esUser = mockAuthenticatedUser({
        authentication_realm: { name: 'cloud-saml-kibana', type: 'saml' },
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(esUser);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      const user = await provider.getUserPublic(request);
      expect(user.elastic_cloud_user).toBe(false);
    });
  });
});
