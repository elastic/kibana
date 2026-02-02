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
const getIndexTemplate = router.getMockESApiFn('indices.getIndexTemplate');

beforeEach(() => {
  jest.clearAllMocks();
  registerComponentTemplateRoutes({
    ...routeDependencies,
    router,
  });
});

describe('Component templates API - datastream routes', () => {
  describe('WHEN GET /api/index_management/component_templates/{name}/datastreams', () => {
    const getComponentTemplate = router.getMockESApiFn('cluster.getComponentTemplate');
    const getDataStream = router.getMockESApiFn('indices.getDataStream');

    describe('AND the component template is not found', () => {
      it('SHOULD return empty data_streams', async () => {
        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates/{name}/datastreams'),
          params: { name: 'foo' },
        };

        getComponentTemplate.mockResolvedValue({ component_templates: [] });

        const res = await router.runRequest(mockRequest);

        expect(res).toEqual({ body: { data_streams: [] } });
      });
    });

    describe('AND index templates reference the component', () => {
      it('SHOULD return datastream names matching composed index templates', async () => {
        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates/{name}/datastreams'),
          params: { name: 'foo' },
        };

        getComponentTemplate.mockResolvedValue({ component_templates: [{ name: 'foo' }] });
        getIndexTemplate.mockResolvedValue({
          index_templates: [
            { index_template: { composed_of: ['bar', 'foo'], index_patterns: ['logs-*'] } },
            { index_template: { composed_of: ['baz'], index_patterns: ['metrics-*'] } },
          ],
        });
        getDataStream.mockResolvedValue({ data_streams: [{ name: 'logs-1' }] });

        const res = await router.runRequest(mockRequest);

        expect(res).toEqual({ body: { data_streams: ['logs-1'] } });
      });
    });

    describe('AND no index template references the component', () => {
      it('SHOULD return empty data_streams', async () => {
        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates/{name}/datastreams'),
          params: { name: 'foo' },
        };

        getComponentTemplate.mockResolvedValue({ component_templates: [{ name: 'foo' }] });
        getIndexTemplate.mockResolvedValue({ index_templates: [] });

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ body: { data_streams: [] } });
      });
    });

    describe('AND getComponentTemplate fails', () => {
      it('SHOULD surface the ES error via the shared handler', async () => {
        const restore = withStubbedHandleEsError(routeDependencies);
        registerComponentTemplateRoutes({ ...routeDependencies, router });

        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates/{name}/datastreams'),
          params: { name: 'foo' },
        };

        getComponentTemplate.mockRejectedValue(new Error('boom'));

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ status: 500, options: {} });

        restore();
      });
    });
  });

  describe('WHEN GET /api/index_management/component_templates/{name}/referenced_index_template_meta', () => {
    describe('AND index templates reference the component', () => {
      it('SHOULD return the first _meta object', async () => {
        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates/{name}/referenced_index_template_meta'),
          params: { name: 'foo' },
        };

        getIndexTemplate.mockResolvedValue({
          index_templates: [
            { index_template: { composed_of: ['foo'], _meta: { x: 1 } } },
            { index_template: { composed_of: ['foo'], _meta: { y: 2 } } },
          ],
        });

        const res = await router.runRequest(mockRequest);

        expect(res).toEqual({ body: { x: 1 } });
      });
    });

    describe('AND no index template references the component', () => {
      it('SHOULD return notFound', async () => {
        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates/{name}/referenced_index_template_meta'),
          params: { name: 'foo' },
        };

        getIndexTemplate.mockResolvedValue({ index_templates: [] });

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ status: 404, options: {} });
      });
    });

    describe('AND getIndexTemplate fails', () => {
      it('SHOULD surface the ES error via the shared handler', async () => {
        const restore = withStubbedHandleEsError(routeDependencies);
        registerComponentTemplateRoutes({ ...routeDependencies, router });

        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates/{name}/referenced_index_template_meta'),
          params: { name: 'foo' },
        };

        getIndexTemplate.mockRejectedValue(new Error('boom'));

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ status: 500, options: {} });

        restore();
      });
    });
  });
});
