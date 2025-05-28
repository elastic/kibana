/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerComponentTemplateRoutes } from '.';
import { addBasePath } from '..';
import { RouterMock, routeDependencies, RequestMock } from '../../../test/helpers';

describe('Component templates API', () => {
  const router = new RouterMock();

  beforeEach(() => {
    registerComponentTemplateRoutes({
      ...routeDependencies,
      router,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Update component template - PUT /api/index_management/component_templates/{name}', () => {
    const updateComponentTemplate = router.getMockESApiFn('cluster.putComponentTemplate');

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
    it('updates a component template with data_stream_options successfully', async () => {
      (
        router.contextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as unknown as jest.Mock
      ).mockResolvedValue({
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
    it('updates a component template without data_stream_options successfully', async () => {
      (
        router.contextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as unknown as jest.Mock
      ).mockResolvedValue({
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
});
