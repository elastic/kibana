/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getUserInfo } from './get_user_info';

describe('getUserInfo', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();

  it('returns undefined when security is unavailable', async () => {
    const result = await getUserInfo({ request, logger });

    expect(result).toBeUndefined();
  });

  it('returns user profile info when available', async () => {
    const security = {
      userProfiles: {
        getCurrent: jest.fn().mockResolvedValue({
          uid: 'profile-1',
          user: {
            username: 'user-name',
            full_name: 'Full Name',
            email: 'user@example.com',
          },
        }),
      },
      authc: {
        getCurrentUser: jest.fn(),
      },
    } as unknown as SecurityPluginStart;

    const result = await getUserInfo({ request, security, logger });

    expect(result).toEqual({
      username: 'Full Name',
      full_name: 'Full Name',
      email: 'user@example.com',
      profile_uid: 'profile-1',
    });
  });

  it('falls back to authc when user profile lookup fails', async () => {
    const security = {
      userProfiles: {
        getCurrent: jest.fn().mockRejectedValue(new Error('failed')),
      },
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({
          username: 'fallback-user',
          full_name: null,
          email: 'fallback@example.com',
        }),
      },
    } as unknown as SecurityPluginStart;

    const result = await getUserInfo({ request, security, logger });

    expect(result).toEqual({
      username: 'fallback@example.com',
      full_name: null,
      email: 'fallback@example.com',
      profile_uid: null,
    });
  });
});
