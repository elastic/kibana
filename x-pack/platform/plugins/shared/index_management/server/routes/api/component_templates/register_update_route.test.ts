/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerComponentTemplateRoutes } from '.';
import { addBasePath } from '..';
import type { RequestMock } from '../../../test/helpers';
import {
  RouterMock,
  routeDependencies,
  withStubbedHandleEsError,
  getTransportRequest,
} from '../../../test/helpers';

const router = new RouterMock();
const updateComponentTemplate = router.getMockESApiFn('cluster.putComponentTemplate');

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
      it('SHOULD persist them on update', async () => {
        getTransportRequest(router).mockResolvedValue({
          component_templates: [
            {
              name: 'test-template',
              component_template: {
                template: {
                  data_stream_options: {
                    failure_store: {
                      enabled: true,
                    },
                  },
                },
              },
            },
          ],
        });

        updateComponentTemplate.mockResolvedValue({ acknowledged: true });

        const res = await router.runRequest(mockRequest);

        expect(
          router.contextMock.core.elasticsearch.client.asCurrentUser.transport.request
        ).toHaveBeenCalledWith({
          method: 'GET',
          path: '/_component_template/test-template',
        });
        expect(updateComponentTemplate).toHaveBeenCalledWith({
          name: 'test-template',
          template: {
            settings: { index: { number_of_shards: 1 } },
            data_stream_options: {
              failure_store: {
                enabled: true,
              },
            },
          },
          version: 1,
          _meta: { description: 'Test template' },
          deprecated: false,
        });
        expect(res).toEqual({
          body: { acknowledged: true },
        });
      });
    });

    describe('AND the component has no data_stream_options', () => {
      it('SHOULD update without data_stream_options', async () => {
        getTransportRequest(router).mockResolvedValue({
          component_templates: [
            {
              name: 'test-template',
            },
          ],
        });

        updateComponentTemplate.mockResolvedValue({ acknowledged: true });

        const res = await router.runRequest(mockRequest);

        expect(
          router.contextMock.core.elasticsearch.client.asCurrentUser.transport.request
        ).toHaveBeenCalledWith({
          method: 'GET',
          path: '/_component_template/test-template',
        });
        expect(updateComponentTemplate).toHaveBeenCalledWith({
          name: 'test-template',
          template: {
            settings: { index: { number_of_shards: 1 } },
          },
          version: 1,
          _meta: { description: 'Test template' },
          deprecated: false,
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

        const transportRequest = getTransportRequest(router);
        transportRequest.mockResolvedValue({ component_templates: [] });

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

        const transportRequest = getTransportRequest(router);
        transportRequest.mockRejectedValue(new Error('boom'));

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ status: 500, options: {} });

        restore();
      });
    });
  });
});
