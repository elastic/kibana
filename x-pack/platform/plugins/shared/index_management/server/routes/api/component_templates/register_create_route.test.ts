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

const getComponentTemplate = router.getMockESApiFn('cluster.getComponentTemplate');
const putComponentTemplate = router.getMockESApiFn('cluster.putComponentTemplate');

const mockRequest: RequestMock = {
  method: 'post',
  path: addBasePath('/component_templates'),
  body: {
    name: 'test-template',
    template: {},
    _kbnMeta: { usedBy: [], isManaged: false },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  registerComponentTemplateRoutes({
    ...routeDependencies,
    router,
  });
});

describe('Component templates API - create route', () => {
  describe('WHEN POST /api/index_management/component_templates', () => {
    it('SHOULD create the template', async () => {
      getComponentTemplate.mockRejectedValue(new Error('not found'));
      putComponentTemplate.mockResolvedValue({ acknowledged: true });

      const res = await router.runRequest(mockRequest);

      expect(putComponentTemplate).toHaveBeenCalledWith({
        name: 'test-template',
        body: expect.any(Object),
      });
      expect(res).toEqual({ body: { acknowledged: true } });
    });

    describe('AND the name already exists', () => {
      it('SHOULD return a conflict response', async () => {
        getComponentTemplate.mockResolvedValue({
          component_templates: [{ name: 'test-template' }],
        });

        const res = await router.runRequest(mockRequest);

        expect(res.status).toBe(409);
        expect(res.body.message).toBe(
          `There is already a component template with name 'test-template'.`
        );
      });
    });

    describe('AND the existence check returns an empty list', () => {
      it('SHOULD create the template', async () => {
        getComponentTemplate.mockResolvedValue({ component_templates: [] });
        putComponentTemplate.mockResolvedValue({ acknowledged: true });

        const res = await router.runRequest(mockRequest);

        expect(putComponentTemplate).toHaveBeenCalledWith({
          name: 'test-template',
          body: expect.any(Object),
        });
        expect(res).toEqual({ body: { acknowledged: true } });
      });
    });

    describe('AND the existence check throws a non-404 error', () => {
      it('SHOULD swallow the error and create the template', async () => {
        // Existence check throws any error; route should swallow it and continue
        getComponentTemplate.mockRejectedValue(new Error('anything'));
        putComponentTemplate.mockResolvedValue({ acknowledged: true });

        const res = await router.runRequest(mockRequest);

        expect(putComponentTemplate).toHaveBeenCalledWith({
          name: 'test-template',
          body: expect.any(Object),
        });
        expect(res).toEqual({ body: { acknowledged: true } });
      });
    });

    describe('AND the create operation fails', () => {
      it('SHOULD return an error via the shared error handler', async () => {
        const restore = withStubbedHandleEsError(routeDependencies);
        // Re-register routes to capture new error handler
        registerComponentTemplateRoutes({ ...routeDependencies, router });

        getComponentTemplate.mockRejectedValue(new Error('not found'));
        putComponentTemplate.mockRejectedValue(new Error('boom'));

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ status: 500, options: {} });

        restore();
      });
    });
  });
});
