/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loadIndexPatterns,
  setDataViewsService,
  getMatchingIndices,
  getESIndexFields,
} from './data_apis';
import { httpServiceMock } from '@kbn/core/public/mocks';

const mockFind = jest.fn();
const perPage = 1000;
const http = httpServiceMock.createStartContract();
const pattern = 'test-pattern';
const indexes = ['test-index'];

const generateDataView = (title: string) => ({
  title,
});

const mockIndices = { indices: ['indices1', 'indices2'] };
const mockFields = {
  fields: [
    { name: 'name', type: 'type', normalizedType: 'nType', searchable: true, aggregatable: false },
  ],
};

const mockPattern = 'test-pattern';

describe('Data API', () => {
  describe('index fields', () => {
    test('fetches index fields', async () => {
      http.post.mockResolvedValueOnce(mockFields);
      const fields = await getESIndexFields({ indexes, http });

      expect(http.post).toHaveBeenCalledWith('/internal/triggers_actions_ui/data/_fields', {
        body: `{"indexPatterns":${JSON.stringify(indexes)}}`,
      });
      expect(fields).toEqual(mockFields.fields);
    });
  });

  describe('matching indices', () => {
    test('fetches indices', async () => {
      http.post.mockResolvedValueOnce(mockIndices);
      const indices = await getMatchingIndices({ pattern, http });

      expect(http.post).toHaveBeenCalledWith('/internal/triggers_actions_ui/data/_indices', {
        body: `{"pattern":"*${mockPattern}*"}`,
      });
      expect(indices).toEqual(mockIndices.indices);
    });

    test('returns empty array if fetch fails', async () => {
      http.post.mockRejectedValueOnce(500);
      const indices = await getMatchingIndices({ pattern, http });
      expect(indices).toEqual([]);
    });
  });

  describe('index patterns', () => {
    beforeEach(() => {
      setDataViewsService({
        find: mockFind,
      });
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('fetches the index patterns', async () => {
      mockFind.mockResolvedValueOnce([generateDataView('index-1'), generateDataView('index-2')]);
      const results = await loadIndexPatterns(mockPattern);

      expect(mockFind).toBeCalledTimes(1);
      expect(mockFind).toBeCalledWith('*test-pattern*', perPage);
      expect(results).toEqual(['index-1', 'index-2']);
    });

    test('returns an empty array if find requests fails', async () => {
      mockFind.mockRejectedValueOnce(500);

      const results = await loadIndexPatterns(mockPattern);

      expect(results).toEqual([]);
    });
  });
});
