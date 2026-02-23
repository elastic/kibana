/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDocumentsSampleRoute } from './register_documents_sample_route';
import { addInternalBasePath } from '..';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies, withStubbedHandleEsError } from '../../../test/helpers';
import { DEFAULT_DOCS_PER_PAGE } from '@kbn/search-index-documents';

const router = new RouterMock();
const searchMock = router.getMockESApiFn('search');

const mockRequest: RequestMock = {
  method: 'get',
  path: addInternalBasePath('/indices/{indexName}/sample'),
  params: { indexName: 'my-index' },
};

beforeEach(() => {
  jest.clearAllMocks();
  registerDocumentsSampleRoute({
    ...routeDependencies,
    router,
  });
});

describe('Documents sample API', () => {
  describe('GET /internal/index_management/indices/{indexName}/sample', () => {
    it('should return search results', async () => {
      searchMock.mockResolvedValue({
        hits: {
          hits: [{ _id: '1', _source: { field: 'value' } }],
        },
      });

      const res = await router.runRequest(mockRequest);

      expect(searchMock).toHaveBeenCalledWith({
        index: 'my-index',
        size: DEFAULT_DOCS_PER_PAGE,
      });

      expect(res).toEqual({
        body: {
          results: [{ _id: '1', _source: { field: 'value' } }],
        },
      });
    });

    it('should handle errors via handleEsError', async () => {
      const restore = withStubbedHandleEsError(routeDependencies);
      registerDocumentsSampleRoute({ ...routeDependencies, router });

      searchMock.mockRejectedValue(new Error('Internal Server Error'));

      const res = await router.runRequest(mockRequest);
      expect(res).toEqual({ status: 500, options: {} });

      restore();
    });
  });
});
