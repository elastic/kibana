/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDeleteDocumentRoute } from './register_delete_document_route';
import { addInternalBasePath } from '..';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies, withStubbedHandleEsError } from '../../../test/helpers';

const router = new RouterMock();
const deleteMock = router.getMockESApiFn('delete');

const mockRequest: RequestMock = {
  method: 'delete',
  path: addInternalBasePath('/indices/{indexName}/documents/{id}'),
  params: { indexName: 'my-index', id: 'doc-1' },
};

beforeEach(() => {
  jest.clearAllMocks();
  registerDeleteDocumentRoute({
    ...routeDependencies,
    router,
  });
});

describe('Delete document API', () => {
  describe('DELETE /internal/index_management/indices/{indexName}/documents/{id}', () => {
    it('should call the ES delete API with the correct parameters', async () => {
      deleteMock.mockResolvedValue({});

      await router.runRequest(mockRequest);

      expect(deleteMock).toHaveBeenCalledWith({ index: 'my-index', id: 'doc-1' });
    });

    it('should return ok on success', async () => {
      deleteMock.mockResolvedValue({});

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({ status: 200, options: {} });
    });

    it('should handle errors via handleEsError', async () => {
      const restore = withStubbedHandleEsError(routeDependencies);
      registerDeleteDocumentRoute({ ...routeDependencies, router });

      deleteMock.mockRejectedValue(new Error('Internal Server Error'));

      const res = await router.runRequest(mockRequest);
      expect(res).toEqual({ status: 500, options: {} });

      restore();
    });
  });
});
