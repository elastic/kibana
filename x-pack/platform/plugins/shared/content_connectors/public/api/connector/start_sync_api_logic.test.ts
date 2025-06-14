/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { nextTick } from '@kbn/test-jest-helpers';

import { startSync } from './start_sync_api_logic';

describe('startSync', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('generateApiKey', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = startSync({ http, connectorId: 'connectorId' });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/content_connectors/connectors/connectorId/start_sync'
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
