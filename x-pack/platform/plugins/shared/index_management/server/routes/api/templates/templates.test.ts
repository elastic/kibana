/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTemplateRoutes } from '.';
import { addBasePath } from '..';
import { RouterMock, routeDependencies, RequestMock } from '../../../test/helpers';

describe('Component templates API', () => {
  const router = new RouterMock();

  beforeEach(() => {
    registerTemplateRoutes({
      ...routeDependencies,
      router,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Update index template - PUT /api/index_management/index_templates/{name}', () => {
    const indexTemplateExists = router.getMockESApiFn('indices.existsIndexTemplate');
    const updateIndexTemplate = router.getMockESApiFn('indices.putIndexTemplate');

    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/index_templates/{name}'),
      params: { name: 'test-template' },
      body: {
        name: 'test-template',
        version: 1,
        _meta: { description: 'Test template' },
        deprecated: false,
        indexMode: 'logsdb',
        _kbnMeta: {
          type: 'default',
          hasDatastream: true,
          isLegacy: false,
        },
      },
    };
    it('updates a component template with data_stream_options successfully', async () => {
      (
        router.contextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as unknown as jest.Mock
      ).mockResolvedValue({
        index_templates: [
          {
            name: 'test-template',
            index_template: {
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

      indexTemplateExists.mockResolvedValue({ acknowledged: true });
      updateIndexTemplate.mockResolvedValue(true);

      const res = await router.runRequest(mockRequest);

      expect(
        router.contextMock.core.elasticsearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_index_template/test-template',
      });
      expect(updateIndexTemplate).toHaveBeenCalledWith({
        name: 'test-template',
        template: {
          data_stream_options: {
            failure_store: {
              enabled: true,
            },
          },
          settings: {
            index: {
              mode: 'logsdb',
            },
          },
        },
        version: 1,
        _meta: { description: 'Test template' },
        deprecated: false,
      });
      expect(res).toEqual({
        body: true,
      });
    });
    it('updates a component template without data_stream_options successfully', async () => {
      (
        router.contextMock.core.elasticsearch.client.asCurrentUser.transport
          .request as unknown as jest.Mock
      ).mockResolvedValue({
        index_templates: [
          {
            name: 'test-template',
          },
        ],
      });

      indexTemplateExists.mockResolvedValue({ acknowledged: true });
      updateIndexTemplate.mockResolvedValue(true);

      const res = await router.runRequest(mockRequest);

      expect(
        router.contextMock.core.elasticsearch.client.asCurrentUser.transport.request
      ).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_index_template/test-template',
      });
      expect(updateIndexTemplate).toHaveBeenCalledWith({
        name: 'test-template',
        template: {
          settings: {
            index: {
              mode: 'logsdb',
            },
          },
        },
        version: 1,
        _meta: { description: 'Test template' },
        deprecated: false,
      });
      expect(res).toEqual({
        body: true,
      });
    });
  });
});
