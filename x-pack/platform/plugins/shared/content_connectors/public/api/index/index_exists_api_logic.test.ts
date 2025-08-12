/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { fetchIndexExists } from './index_exists_api_logic';

describe('IndexExistsApiLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('indexExists', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({ exists: true });
      http.get.mockReturnValue(promise);
      const result = fetchIndexExists({ http, indexName: 'indexName' });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        '/internal/content_connectors/indices/indexName/exists'
      );
      await expect(result).resolves.toEqual({ exists: true, indexName: 'indexName' });
    });
  });
});
