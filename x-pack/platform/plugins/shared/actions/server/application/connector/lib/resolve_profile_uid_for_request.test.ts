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

  it('returns profile_uid from getCurrentUser when present', async () => {
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser: async () => ({ profile_uid: 'from-user' }),
      getCurrentUserProfileIdFromAPIKey: async () => 'from-api-key',
    });
    expect(uid).toBe('from-user');
  });

  it('falls back to getCurrentUserProfileIdFromAPIKey when getCurrentUser returns null', async () => {
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser: async () => null,
      getCurrentUserProfileIdFromAPIKey: async () => 'from-api-key',
    });
    expect(uid).toBe('from-api-key');
  });

  it('falls back to getCurrentUserProfileIdFromAPIKey when user has no profile_uid', async () => {
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser: async () => ({}),
      getCurrentUserProfileIdFromAPIKey: async () => 'from-api-key',
    });
    expect(uid).toBe('from-api-key');
  });

  it('returns undefined when both sources yield nothing', async () => {
    const uid = await resolveProfileUidForRequest({
      request,
      getCurrentUser: async () => null,
      getCurrentUserProfileIdFromAPIKey: async () => undefined,
    });
    expect(uid).toBeUndefined();
  });
});
