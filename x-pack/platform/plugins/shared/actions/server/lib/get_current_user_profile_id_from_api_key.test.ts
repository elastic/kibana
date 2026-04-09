/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/core-security-server', () => ({
  extractApiKeyIdFromAuthzHeader: jest.fn(),
}));

import type { SecurityApiKey } from '@elastic/elasticsearch/lib/api/types';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getCurrentUserProfileIdFromAPIKey } from './get_current_user_profile_id_from_api_key';

const extractApiKeyIdMock = extractApiKeyIdFromAuthzHeader as jest.MockedFunction<
  typeof extractApiKeyIdFromAuthzHeader
>;

describe('getCurrentUserProfileIdFromAPIKey', () => {
  const logger = loggingSystemMock.create().get();
  let clusterClient: ReturnType<typeof elasticsearchClientMock.createClusterClient>;
  let scopedCluster: ReturnType<typeof elasticsearchClientMock.createScopedClusterClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clusterClient = elasticsearchClientMock.createClusterClient();
    scopedCluster = elasticsearchClientMock.createScopedClusterClient();
    clusterClient.asScoped.mockReturnValue(scopedCluster);
  });

  it('returns profile_uid from Elasticsearch when API key id resolves', async () => {
    extractApiKeyIdMock.mockReturnValue('api-key-id');
    scopedCluster.asCurrentUser.security.getApiKey.mockResponse({
      api_keys: [{ profile_uid: 'profile-from-es' } as SecurityApiKey],
    });

    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey xxx' },
    });

    await expect(getCurrentUserProfileIdFromAPIKey(request, clusterClient, logger)).resolves.toBe(
      'profile-from-es'
    );

    expect(scopedCluster.asCurrentUser.security.getApiKey).toHaveBeenCalledWith({
      with_profile_uid: true,
      id: 'api-key-id',
    });
  });

  it('returns undefined when Authorization header does not yield an API key id', async () => {
    extractApiKeyIdMock.mockReturnValue(undefined);

    const request = httpServerMock.createKibanaRequest();

    await expect(
      getCurrentUserProfileIdFromAPIKey(request, clusterClient, logger)
    ).resolves.toBeUndefined();

    expect(scopedCluster.asCurrentUser.security.getApiKey).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Failed to decode API key ID from Authorization header.'
    );
  });

  it('returns undefined when Elasticsearch returns no API keys', async () => {
    extractApiKeyIdMock.mockReturnValue('api-key-id');
    scopedCluster.asCurrentUser.security.getApiKey.mockResponse({
      api_keys: [],
    });

    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey xxx' },
    });

    await expect(
      getCurrentUserProfileIdFromAPIKey(request, clusterClient, logger)
    ).resolves.toBeUndefined();

    expect(logger.debug).toHaveBeenCalledWith(
      'No API keys were returned from query, cannot retrieve associated profile id.'
    );
  });

  it('returns undefined and logs when Elasticsearch getApiKey fails', async () => {
    extractApiKeyIdMock.mockReturnValue('api-key-id');
    scopedCluster.asCurrentUser.security.getApiKey.mockRejectedValue(new Error('ES failure'));

    const request = httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey xxx' },
    });

    await expect(
      getCurrentUserProfileIdFromAPIKey(request, clusterClient, logger)
    ).resolves.toBeUndefined();

    expect(logger.debug).toHaveBeenCalledWith(
      'Failed to retrieve API key for user profile retrieval: ES failure'
    );
  });
});
