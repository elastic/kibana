/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./access_agreement');
jest.mock('./capture_url');
jest.mock('./logged_out');
jest.mock('./login');
jest.mock('./logout');
jest.mock('./overwritten_session');
jest.mock('./reset_session');
jest.mock('./unauthenticated');

import { coreMock } from '@kbn/core/public/mocks';

import { AuthenticationService } from './authentication_service';
import type { ConfigType } from '../config';
import { securityMock } from '../mocks';

const createService = () => {
  const coreSetup = coreMock.createSetup();
  const service = new AuthenticationService();
  const { getCurrentUser } = service.setup({
    application: coreSetup.application,
    fatalErrors: coreSetup.fatalErrors,
    config: { uiam: { enabled: false } } as unknown as ConfigType,
    getStartServices: coreSetup.getStartServices,
    http: coreSetup.http,
  });
  return { coreSetup, getCurrentUser };
};

describe('AuthenticationService', () => {
  describe('#getCurrentUser', () => {
    it('issues a single HTTP request for concurrent callers and reuses the cached value', async () => {
      const { coreSetup, getCurrentUser } = createService();
      const user = securityMock.createMockAuthenticatedUser();
      coreSetup.http.get.mockResolvedValue(user);

      const [first, second] = await Promise.all([getCurrentUser(), getCurrentUser()]);

      expect(first).toBe(user);
      expect(second).toBe(user);
      expect(coreSetup.http.get).toHaveBeenCalledTimes(1);
      expect(coreSetup.http.get).toHaveBeenCalledWith('/internal/security/me', {
        asSystemRequest: true,
      });

      const third = await getCurrentUser();
      expect(third).toBe(user);
      expect(coreSetup.http.get).toHaveBeenCalledTimes(1);
    });

    it('clears the cache on rejection so subsequent callers can retry', async () => {
      const { coreSetup, getCurrentUser } = createService();
      const failure = new Error('boom');
      const user = securityMock.createMockAuthenticatedUser();
      coreSetup.http.get.mockRejectedValueOnce(failure).mockResolvedValueOnce(user);

      await expect(getCurrentUser()).rejects.toBe(failure);
      expect(coreSetup.http.get).toHaveBeenCalledTimes(1);

      await expect(getCurrentUser()).resolves.toBe(user);
      expect(coreSetup.http.get).toHaveBeenCalledTimes(2);
    });
  });
});
