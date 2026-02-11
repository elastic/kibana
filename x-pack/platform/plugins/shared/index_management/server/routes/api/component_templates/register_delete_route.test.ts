/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerComponentTemplateRoutes } from '.';
import { addBasePath } from '..';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies, withStubbedHandleEsError } from '../../../test/helpers';

const router = new RouterMock();

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure errors are collected instead of thrown by stubbing the shared error handler.
  const restore = withStubbedHandleEsError(routeDependencies, () => ({
    status: 500,
    options: {},
  }));
  // Store restore on router instance to call after if needed (per-test isolation not required here)
  // Re-register routes to capture stubbed handler
  registerComponentTemplateRoutes({ ...routeDependencies, router });
  // Immediately restore since handler is captured in the route closure
  restore();
});

describe('Component templates API - delete route', () => {
  describe('WHEN DELETE /api/index_management/component_templates/{names}', () => {
    const deleteComponentTemplate = router.getMockESApiFn('cluster.deleteComponentTemplate');

    it('SHOULD delete multiple component templates and report results', async () => {
      const mockRequest: RequestMock = {
        method: 'delete',
        path: addBasePath('/component_templates/{names}'),
        params: { names: 'a,b' },
      };

      deleteComponentTemplate.mockResolvedValueOnce(true);
      deleteComponentTemplate.mockResolvedValueOnce(true);

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: {
          itemsDeleted: ['a', 'b'],
          errors: [],
        },
      });
    });

    it('SHOULD collect errors for failed deletions', async () => {
      const mockRequest: RequestMock = {
        method: 'delete',
        path: addBasePath('/component_templates/{names}'),
        params: { names: 'a,b' },
      };

      deleteComponentTemplate.mockResolvedValueOnce(true);
      deleteComponentTemplate.mockRejectedValueOnce(new Error('boom'));

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: {
          itemsDeleted: ['a'],
          errors: [expect.objectContaining({ name: 'b' })],
        },
      });
    });

    it('SHOULD surface an error via the shared handler when a delete call throws', async () => {
      const restore = withStubbedHandleEsError(routeDependencies);
      registerComponentTemplateRoutes({ ...routeDependencies, router });
      const mockRequest: RequestMock = {
        method: 'delete',
        path: addBasePath('/component_templates/{names}'),
        params: { names: 'a' },
      };

      deleteComponentTemplate.mockRejectedValue(new Error('boom'));

      const res = await router.runRequest(mockRequest);
      expect(res).toEqual({ body: { itemsDeleted: [], errors: [expect.anything()] } });
      restore();
    });
  });
});
