/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityServiceMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { createPrincipalKeyResolver } from './principal_key';

type AuthenticatedUser = NonNullable<ReturnType<SecurityServiceStart['authc']['getCurrentUser']>>;

const createUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  username: 'jane',
  roles: [],
  enabled: true,
  authentication_realm: { name: 'native1', type: 'native' },
  lookup_realm: { name: 'native1', type: 'native' },
  authentication_provider: { type: 'http', name: '__http__' },
  authentication_type: 'realm',
  elastic_cloud_user: false,
  http_authentication_scheme: 'basic',
  ...overrides,
});

describe('createPrincipalKeyResolver', () => {
  let security: ReturnType<typeof securityServiceMock.createStart>;

  beforeEach(() => {
    security = securityServiceMock.createStart();
    security.authc.getPrincipal.mockReturnValue(null);
    security.authc.getCurrentUser.mockReturnValue(null);
  });

  const resolve = (request = httpServerMock.createKibanaRequest()) =>
    createPrincipalKeyResolver({ security })(request);

  describe('users', () => {
    it('keys a user with a profile by its profile id', () => {
      security.authc.getPrincipal.mockReturnValue({
        type: 'user',
        username: 'jane',
        userProfileId: 'profile-1',
      });

      expect(resolve()).toBe('user:profile-1');
    });

    it('keys a user without a profile by realm and username', () => {
      security.authc.getPrincipal.mockReturnValue({ type: 'user', username: 'jane' });
      security.authc.getCurrentUser.mockReturnValue(createUser());

      expect(resolve()).toBe('realm_user:["native","native1","jane"]');
    });

    it('separates users with the same username in different realms', () => {
      security.authc.getPrincipal.mockReturnValue({ type: 'user', username: 'jane' });

      security.authc.getCurrentUser.mockReturnValue(createUser());
      const nativeKey = resolve();

      security.authc.getCurrentUser.mockReturnValue(
        createUser({ authentication_realm: { name: 'file1', type: 'file' } })
      );
      const fileKey = resolve();

      expect(nativeKey).not.toBe(fileKey);
    });

    it('resolves no key when the realm cannot be read', () => {
      security.authc.getPrincipal.mockReturnValue({ type: 'user', username: 'jane' });
      security.authc.getCurrentUser.mockImplementation(() => {
        throw new Error('not available for minimally authenticated users');
      });

      expect(resolve()).toBeUndefined();
    });

    it('resolves no key when the user is unknown', () => {
      security.authc.getPrincipal.mockReturnValue({ type: 'user', username: 'jane' });

      expect(resolve()).toBeUndefined();
    });
  });

  describe('machine identities', () => {
    it('keys an API key by its id rather than by its owner', () => {
      security.authc.getPrincipal.mockReturnValue({
        type: 'api_key',
        apiKeyId: 'key-1',
        variant: 'stack',
      });
      security.authc.getCurrentUser.mockReturnValue(createUser({ profile_uid: 'profile-1' }));

      expect(resolve()).toBe('api_key:stack:key-1');
    });

    it('keys a service account by its id', () => {
      security.authc.getPrincipal.mockReturnValue({
        type: 'service_account',
        serviceAccountId: 'elastic/kibana',
        variant: 'stack',
      });

      expect(resolve()).toBe('service_account:stack:elastic/kibana');
    });

    it('keys anonymous access by its username', () => {
      security.authc.getPrincipal.mockReturnValue({ type: 'anonymous', username: 'anon' });

      expect(resolve()).toBe('anonymous:anon');
    });
  });

  describe('fake requests', () => {
    const createFakeRequest = (authorization?: string) =>
      httpServerMock.createFakeKibanaRequest({
        headers: authorization ? { authorization } : {},
      });

    it('keys a fake request by a digest of its credential', () => {
      const principalKey = resolve(createFakeRequest('ApiKey c29tZS1pZDpzb21lLXNlY3JldA=='));

      expect(principalKey).toMatch(/^credential:[0-9a-f]{64}$/);
      expect(principalKey).not.toContain('c29tZS1pZDpzb21lLXNlY3JldA==');
    });

    it('resolves the same key for the same credential', () => {
      expect(resolve(createFakeRequest('ApiKey abc'))).toBe(
        resolve(createFakeRequest('ApiKey abc'))
      );
    });

    it('resolves different keys for different credentials', () => {
      expect(resolve(createFakeRequest('ApiKey abc'))).not.toBe(
        resolve(createFakeRequest('ApiKey abd'))
      );
    });

    it('ignores the user a fake request acts for', () => {
      security.authc.getCurrentUser.mockReturnValue(createUser({ profile_uid: 'profile-1' }));

      expect(resolve(createFakeRequest('ApiKey abc'))).toMatch(/^credential:/);
    });

    it('keys a fake request minted for a service account by the service account', () => {
      security.authc.getPrincipal.mockReturnValue({
        type: 'service_account',
        serviceAccountId: 'account-1',
        variant: 'uiam',
      });

      expect(resolve(createFakeRequest('ApiKey abc'))).toBe('service_account:uiam:account-1');
    });

    it('resolves no key for a fake request without a credential', () => {
      expect(resolve(createFakeRequest())).toBeUndefined();
    });
  });

  it('resolves no key when the request has no known principal', () => {
    expect(resolve()).toBeUndefined();
  });

  it('resolves the principal once per request', () => {
    security.authc.getPrincipal.mockReturnValue({
      type: 'user',
      username: 'jane',
      userProfileId: 'profile-1',
    });
    const getPrincipalKey = createPrincipalKeyResolver({ security });
    const request = httpServerMock.createKibanaRequest();

    getPrincipalKey(request);
    getPrincipalKey(request);
    getPrincipalKey(httpServerMock.createKibanaRequest());

    expect(security.authc.getPrincipal).toHaveBeenCalledTimes(2);
  });

  it('remembers that a request resolved no key', () => {
    const getPrincipalKey = createPrincipalKeyResolver({ security });
    const request = httpServerMock.createKibanaRequest();

    getPrincipalKey(request);
    getPrincipalKey(request);

    expect(security.authc.getPrincipal).toHaveBeenCalledTimes(1);
  });
});
