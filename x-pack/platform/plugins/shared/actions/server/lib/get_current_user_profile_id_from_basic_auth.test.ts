/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityActivateUserProfileResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getCurrentUserProfileIdFromBasicAuth } from './get_current_user_profile_id_from_basic_auth';

describe('getCurrentUserProfileIdFromBasicAuth', () => {
  const logger = loggingSystemMock.create().get();
  let clusterClient: ReturnType<typeof elasticsearchClientMock.createClusterClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clusterClient = elasticsearchClientMock.createClusterClient();
  });

  const basicHeader = (username: string, password: string) =>
    `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  it('returns profile uid from Elasticsearch when Basic credentials are valid', async () => {
    clusterClient.asInternalUser.security.activateUserProfile.mockResolvedValue({
      uid: 'profile-from-es',
    } as SecurityActivateUserProfileResponse);

    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: basicHeader('user', 'secret') },
    });

    await expect(
      getCurrentUserProfileIdFromBasicAuth(request, clusterClient, logger)
    ).resolves.toBe('profile-from-es');

    expect(clusterClient.asInternalUser.security.activateUserProfile).toHaveBeenCalledWith({
      grant_type: 'password',
      username: 'user',
      password: 'secret',
    });
  });

  it('returns undefined when Authorization header is not Basic', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'Bearer token' },
    });

    await expect(
      getCurrentUserProfileIdFromBasicAuth(request, clusterClient, logger)
    ).resolves.toBeUndefined();

    expect(clusterClient.asInternalUser.security.activateUserProfile).not.toHaveBeenCalled();
  });

  it('returns undefined when Authorization header is an array', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: ['Basic abc'] as unknown as string },
    });

    await expect(
      getCurrentUserProfileIdFromBasicAuth(request, clusterClient, logger)
    ).resolves.toBeUndefined();

    expect(clusterClient.asInternalUser.security.activateUserProfile).not.toHaveBeenCalled();
  });

  it('correctly parses passwords containing colons (RFC 7617)', async () => {
    clusterClient.asInternalUser.security.activateUserProfile.mockResolvedValue({
      uid: 'profile-colon',
    } as SecurityActivateUserProfileResponse);

    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: basicHeader('user', 'p@ss:word:123') },
    });

    await expect(
      getCurrentUserProfileIdFromBasicAuth(request, clusterClient, logger)
    ).resolves.toBe('profile-colon');

    expect(clusterClient.asInternalUser.security.activateUserProfile).toHaveBeenCalledWith({
      grant_type: 'password',
      username: 'user',
      password: 'p@ss:word:123',
    });
  });

  it('returns undefined and logs when decoded credentials omit the password', async () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: `Basic ${Buffer.from('user').toString('base64')}` },
    });

    await expect(
      getCurrentUserProfileIdFromBasicAuth(request, clusterClient, logger)
    ).resolves.toBeUndefined();

    expect(clusterClient.asInternalUser.security.activateUserProfile).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Malformed basic credentials in Authorization header.'
    );
  });

  it('returns undefined and logs when activateUserProfile fails', async () => {
    clusterClient.asInternalUser.security.activateUserProfile.mockRejectedValue(
      new Error('ES failure')
    );

    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: basicHeader('user', 'secret') },
    });

    await expect(
      getCurrentUserProfileIdFromBasicAuth(request, clusterClient, logger)
    ).resolves.toBeUndefined();

    expect(logger.debug).toHaveBeenCalledWith(
      'Failed to activate user profile from Basic auth credentials: ES failure'
    );
  });
});
