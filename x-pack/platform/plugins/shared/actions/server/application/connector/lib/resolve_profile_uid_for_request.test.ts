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

  it('returns undefined when both sources yield nothing', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue(null);
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser,
      getCurrentUserProfileIdFromAPIKey: async () => undefined,
    });
    expect(uid).toBeUndefined();
    expect(getCurrentUser).toHaveBeenCalledWith(request);
  });
});
