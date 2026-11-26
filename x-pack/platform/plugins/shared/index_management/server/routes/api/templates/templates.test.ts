/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTemplateRoutes } from '.';
import { addBasePath } from '..';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies, getTransportRequest } from '../../../test/helpers';

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
    const transportRequest = getTransportRequest(router);

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
    const dataStreamMockRequest: RequestMock = {
      ...mockRequest,
      body: { ...mockRequest.body, dataStream: {} },
    };
    it('updates a component template with data_stream_options successfully', async () => {
      transportRequest.mockResolvedValue({
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

      const res = await router.runRequest(dataStreamMockRequest);

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
        data_stream: {},
        version: 1,
        _meta: { description: 'Test template' },
        deprecated: false,
      });
      expect(res).toEqual({
        body: true,
      });
    });
    it('updates a component template without data_stream_options successfully', async () => {
      transportRequest.mockResolvedValue({
        index_templates: [
          {
            name: 'test-template',
          },
        ],
      });

      indexTemplateExists.mockResolvedValue({ acknowledged: true });
      updateIndexTemplate.mockResolvedValue(true);

      const res = await router.runRequest(dataStreamMockRequest);

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
        data_stream: {},
        version: 1,
        _meta: { description: 'Test template' },
        deprecated: false,
      });
      expect(res).toEqual({
        body: true,
      });
    });
    it('ignores data_stream_options sent by the client and keeps the stored value', async () => {
      transportRequest.mockResolvedValue({
        index_templates: [
          {
            name: 'test-template',
            index_template: {
              template: { data_stream_options: { failure_store: { enabled: true } } },
            },
          },
        ],
      });
      indexTemplateExists.mockResolvedValue({ acknowledged: true });
      updateIndexTemplate.mockResolvedValue(true);

      await router.runRequest({
        ...dataStreamMockRequest,
        body: {
          ...dataStreamMockRequest.body,
          template: { data_stream_options: { failure_store: { enabled: false } } },
        },
      });

      expect(updateIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({
            data_stream_options: { failure_store: { enabled: true } },
          }),
        })
      );
    });
    it('does not send client data_stream_options when none is stored', async () => {
      transportRequest.mockResolvedValue({ index_templates: [{ name: 'test-template' }] });
      indexTemplateExists.mockResolvedValue({ acknowledged: true });
      updateIndexTemplate.mockResolvedValue(true);

      await router.runRequest({
        ...dataStreamMockRequest,
        body: {
          ...dataStreamMockRequest.body,
          template: { data_stream_options: { failure_store: { enabled: false } } },
        },
      });

      const arg = updateIndexTemplate.mock.calls[0][0] as any;
      expect(arg.template?.data_stream_options).toBeUndefined();
    });
    it('does not re-apply stored data_stream_options when the template is not a data stream template', async () => {
      transportRequest.mockResolvedValue({
        index_templates: [
          {
            name: 'test-template',
            index_template: {
              template: { data_stream_options: { failure_store: { enabled: true } } },
            },
          },
        ],
      });
      indexTemplateExists.mockResolvedValue({ acknowledged: true });
      updateIndexTemplate.mockResolvedValue(true);

      await router.runRequest(mockRequest);

      const arg = updateIndexTemplate.mock.calls[0][0] as any;
      expect(arg.template?.data_stream_options).toBeUndefined();
    });
  });
});
