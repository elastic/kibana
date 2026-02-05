/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { UserService } from './user_service';

describe('UserService', () => {
  const request = httpServerMock.createKibanaRequest();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current user profile uid when security is available', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser.mockReturnValue(
      mockAuthenticatedUser({ username: 'elastic', profile_uid: 'elastic_profile_uid' })
    );

    const service = new UserService(request, security);

    expect(service.getCurrentUserProfileUid()).toBe('elastic_profile_uid');
  });

  it('returns null when security is not available', () => {
    const service = new UserService(request, undefined);

    expect(service.getCurrentUserProfileUid()).toBeNull();
  });

  it('returns null when current user is not available', () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser.mockReturnValue(null);

    const service = new UserService(request, security);

    expect(service.getCurrentUserProfileUid()).toBeNull();
  });
});
