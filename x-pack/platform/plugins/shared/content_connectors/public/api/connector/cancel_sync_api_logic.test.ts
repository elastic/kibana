/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// write tests that checks cancelSync API logic calls correct endpoint
import { httpServiceMock } from '@kbn/core/public/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { cancelSync } from './cancel_sync_api_logic';

describe('CancelSyncApiLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('cancelSync', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({ success: true });
      http.put.mockReturnValue(promise);
      const result = cancelSync({ syncJobId: 'syncJobId1', http });
      await nextTick();
      expect(http.put).toHaveBeenCalledWith(
        '/internal/content_connectors/connectors/syncJobId1/cancel_sync'
      );
      await expect(result).resolves.toEqual({ success: true });
    });
  });
});
