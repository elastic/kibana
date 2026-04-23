/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithSecurity } from '@kbn/core-user-profile-common';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { UserService } from './user_service';

const mockProfile: UserProfileWithSecurity = {
  uid: 'elastic_profile_uid',
  enabled: true,
  user: {
    username: 'elastic',
    roles: [],
    realm_name: 'realm',
  },
  data: {},
  labels: {},
};

export function createUserService({ isFakeRequest = false }: { isFakeRequest?: boolean } = {}): {
  userService: UserService;
  userProfileService: jest.Mocked<UserProfileServiceStart>;
  esClient: jest.Mocked<ElasticsearchClient>;
} {
  const request = isFakeRequest
    ? httpServerMock.createFakeKibanaRequest({})
    : httpServerMock.createKibanaRequest();
  const userProfileService = userProfileServiceMock.createStart();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  userProfileService.getCurrent.mockResolvedValue(createUserProfile());
  esClient.security.authenticate.mockResolvedValue({ username: 'elastic_api_key_user' } as any);

  return {
    userService: new UserService(request, userProfileService, esClient),
    userProfileService,
    esClient,
  };
}

export function createUserProfile(uid?: string): UserProfileWithSecurity {
  return {
    ...mockProfile,
    ...(uid ? { uid } : {}),
  };
}
