/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { resolveProfileUidForRequest } from './resolve_profile_uid_for_request';

describe('resolveProfileUidForRequest', () => {
  const request = httpServerMock.createKibanaRequest();

  it('prefers API key profile UID over currentUser profile_uid to match with how task execution gets the profileUid', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue({ profile_uid: 'from-user' });
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser,
      getCurrentUserProfileIdFromAPIKey: async () => 'from-api-key',
    });
    expect(uid).toBe('from-api-key');
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('falls back to currentUser profile_uid when API key returns undefined', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue({ profile_uid: 'from-user' });
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser,
      getCurrentUserProfileIdFromAPIKey: async () => undefined,
    });
    expect(uid).toBe('from-user');
    expect(getCurrentUser).toHaveBeenCalledWith(request);
  });

  it('falls back to getCurrentUserProfileIdFromAPIKey when getCurrentUser returns null', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue(null);
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser,
      getCurrentUserProfileIdFromAPIKey: async () => 'from-api-key',
    });
    expect(uid).toBe('from-api-key');
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('falls back to getCurrentUserProfileIdFromAPIKey when user has no profile_uid', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue({});
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser,
      getCurrentUserProfileIdFromAPIKey: async () => 'from-api-key',
    });
    expect(uid).toBe('from-api-key');
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('returns undefined when all sources yield nothing', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue(null);
    const getCurrentUserProfileIdFromBasicAuth = jest.fn().mockResolvedValue(undefined);
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser,
      getCurrentUserProfileIdFromAPIKey: async () => undefined,
      getCurrentUserProfileIdFromBasicAuth,
    });
    expect(uid).toBeUndefined();
    expect(getCurrentUser).toHaveBeenCalledWith(request);
    expect(getCurrentUserProfileIdFromBasicAuth).toHaveBeenCalledWith(request);
  });

  it('returns Basic-auth profile UID when API key and current user do not provide one', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue({});
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser,
      getCurrentUserProfileIdFromAPIKey: async () => undefined,
      getCurrentUserProfileIdFromBasicAuth: async () => 'from-basic',
    });
    expect(uid).toBe('from-basic');
    expect(getCurrentUser).toHaveBeenCalledWith(request);
  });

  it('prefers API key profile UID over Basic auth', async () => {
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser: jest.fn().mockResolvedValue({}),
      getCurrentUserProfileIdFromAPIKey: async () => 'from-api-key',
      getCurrentUserProfileIdFromBasicAuth: async () => 'from-basic',
    });
    expect(uid).toBe('from-api-key');
  });

  it('prefers currentUser profile_uid over Basic auth', async () => {
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser: jest.fn().mockResolvedValue({ profile_uid: 'from-user' }),
      getCurrentUserProfileIdFromAPIKey: async () => undefined,
      getCurrentUserProfileIdFromBasicAuth: async () => 'from-basic',
    });
    expect(uid).toBe('from-user');
  });
});
