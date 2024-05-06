/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { CoreSecurityContract } from '@kbn/core-security-server';

import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { buildSecurityApi } from './build_security_api';
import { securityMock } from './mocks';

describe('buildSecurityApi', () => {
  let authc: ReturnType<typeof authenticationServiceMock.createStart>;
  let api: CoreSecurityContract;

  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    api = buildSecurityApi({ getAuthc: () => authc });
  });

  describe('authc.getCurrentUser', () => {
    it('properly delegates to the service', () => {
      const request = httpServerMock.createKibanaRequest();
      api.authc.getCurrentUser(request);

      expect(authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(authc.getCurrentUser).toHaveBeenCalledWith(request);
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      const delegateReturn = securityMock.createMockAuthenticatedUser();

      authc.getCurrentUser.mockReturnValue(delegateReturn);

      const currentUser = api.authc.getCurrentUser(request);

      expect(currentUser).toBe(delegateReturn);
    });
  });
});
