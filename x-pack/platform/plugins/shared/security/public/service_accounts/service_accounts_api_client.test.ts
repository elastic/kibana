/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { ServiceAccountsAPIClient } from './service_accounts_api_client';

describe('ServiceAccountsAPIClient', () => {
  describe('#create', () => {
    it('posts the params to the internal route and returns the created account', async () => {
      const http = httpServiceMock.createStartContract();
      const created = { id: 'service-account-id', name: 'nightshift-relay', roles: ['viewer'] };
      http.post.mockResolvedValue(created);

      const params = { name: 'nightshift-relay', roles: ['viewer'] };

      await expect(new ServiceAccountsAPIClient(http).create(params)).resolves.toBe(created);

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith('/internal/security/service_account', {
        body: JSON.stringify(params),
      });
    });
  });

  describe('#list', () => {
    it('gets one page from the internal route', async () => {
      const http = httpServiceMock.createStartContract();
      const response = {
        serviceAccounts: [
          {
            id: 'service-account-id',
            name: 'nightshift-relay',
            roles: ['viewer'],
            enabled: true,
            assumable: true,
          },
        ],
        nextPage: 'next-page',
      };
      http.get.mockResolvedValue(response);

      await expect(
        new ServiceAccountsAPIClient(http).list({ limit: 20, after: 'current-page' })
      ).resolves.toBe(response);

      expect(http.get).toHaveBeenCalledWith('/internal/security/service_account', {
        query: { limit: 20, after: 'current-page' },
      });
    });
  });
});
