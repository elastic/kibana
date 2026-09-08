/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { resolveIdentity, type MinimalAuthService } from './resolve_identity';

type CurrentUser = ReturnType<MinimalAuthService['authc']['getCurrentUser']>;

const request = {} as KibanaRequest;

const resolve = (currentUser: CurrentUser) =>
  resolveIdentity({
    request,
    security: {
      authc: {
        getCurrentUser: () => currentUser,
      },
    },
  });

describe('resolveIdentity', () => {
  it('prefers the profile UID over the username', () => {
    expect(
      resolve({
        profile_uid: 'u_profile',
        username: 'alice',
        authentication_realm: { type: 'native', name: 'default_native' },
      })
    ).toEqual({ author: 'u_profile', author_kind: 'profile_uid' });
  });

  it('qualifies a username with the authentication realm type and name', () => {
    expect(
      resolve({
        username: 'alice',
        authentication_realm: { type: 'native', name: 'default_native' },
      })
    ).toEqual({ author: 'native/default_native:alice', author_kind: 'username' });
  });

  it('rejects invalid or missing identity', () => {
    expect(resolve({ username: 'task-manager-user' })).toBeUndefined();
    expect(resolve(null)).toBeUndefined();
  });
});
