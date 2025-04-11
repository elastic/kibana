/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { nextTick } from '@kbn/test-jest-helpers';

import { cancelSyncs } from './cancel_syncs_api_logic';

describe('CancelSyncsLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('cancelSyncs', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = cancelSyncs({ connectorId: 'connectorId1', http });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/content_connectors/connectors/connectorId1/cancel_syncs'
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
