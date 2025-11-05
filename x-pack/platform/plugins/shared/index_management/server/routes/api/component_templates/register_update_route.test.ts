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
const updateComponentTemplate = router.getMockESApiFn('cluster.putComponentTemplate');
const getComponentTemplate = router.getMockESApiFn('cluster.getComponentTemplate');

beforeEach(() => {
  jest.clearAllMocks();
  registerComponentTemplateRoutes({
    ...routeDependencies,
    router,
  });
});

describe('Component templates API - update route', () => {
  describe('WHEN PUT /api/index_management/component_templates/{name}', () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/component_templates/{name}'),
      params: { name: 'test-template' },
      body: {
        template: {
          settings: { index: { number_of_shards: 1 } },
        },
        version: 1,
        _meta: { description: 'Test template' },
        deprecated: false,
      },
    };

    describe('AND the component has existing data_stream_options', () => {
      it('SHOULD update using provided body (no merge)', async () => {
        getComponentTemplate.mockResolvedValue({});

        updateComponentTemplate.mockResolvedValue({ acknowledged: true });

        const res = await router.runRequest(mockRequest);

        expect(getComponentTemplate).toHaveBeenCalledWith({ name: 'test-template' });
        expect(updateComponentTemplate).toHaveBeenCalledWith({
          name: 'test-template',
          body: {
            template: {
              settings: { index: { number_of_shards: 1 } },
            },
            version: 1,
            _meta: { description: 'Test template' },
            deprecated: false,
          },
        });
        expect(res).toEqual({
          body: { acknowledged: true },
        });
      });
    });

    describe('AND the component has no data_stream_options', () => {
      it('SHOULD update without data_stream_options', async () => {
        getComponentTemplate.mockResolvedValue({});

        updateComponentTemplate.mockResolvedValue({ acknowledged: true });

        const res = await router.runRequest(mockRequest);

        expect(getComponentTemplate).toHaveBeenCalledWith({ name: 'test-template' });
        expect(updateComponentTemplate).toHaveBeenCalledWith({
          name: 'test-template',
          body: {
            template: {
              settings: { index: { number_of_shards: 1 } },
            },
            version: 1,
            _meta: { description: 'Test template' },
            deprecated: false,
          },
        });
        expect(res).toEqual({
          body: { acknowledged: true },
        });
      });
    });

    describe('AND the update operation fails', () => {
      it('SHOULD return an error via the shared error handler', async () => {
        const restore = withStubbedHandleEsError(routeDependencies);
        // Re-register routes to capture new error handler
        registerComponentTemplateRoutes({ ...routeDependencies, router });

        getComponentTemplate.mockResolvedValue({});
        updateComponentTemplate.mockRejectedValue(new Error('boom'));

        const res = await router.runRequest(mockRequest);

        expect(res).toEqual({ status: 500, options: {} });

        restore();
      });
    });

    describe('AND pre-reading the existing template fails', () => {
      it('SHOULD surface an error via the shared error handler', async () => {
        const restore = withStubbedHandleEsError(routeDependencies);
        // Re-register routes to capture new error handler
        registerComponentTemplateRoutes({ ...routeDependencies, router });

        getComponentTemplate.mockRejectedValue(new Error('boom'));

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ status: 500, options: {} });

        restore();
      });
    });
  });
});
