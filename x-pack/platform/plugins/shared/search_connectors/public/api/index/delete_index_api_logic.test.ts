/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { deleteIndex } from './delete_index_api_logic';

describe('deleteIndexApiLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('deleteIndex', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve();
      http.post.mockReturnValue(promise);
      const result = deleteIndex({ indexName: 'deleteIndex', http });
      await nextTick();
      expect(http.delete).toHaveBeenCalledWith('/internal/search_connectors/indices/deleteIndex');
      await expect(result).resolves;
    });
  });
});
