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

import {
  deserializeComponentTemplate,
  deserializeComponentTemplateList,
} from '../../../../common/lib';

jest.mock('../../../../common/lib', () => ({
  ...jest.requireActual('../../../../common/lib'),
  deserializeComponentTemplate: jest.fn(
    jest.requireActual('../../../../common/lib').deserializeComponentTemplate
  ),
  deserializeComponentTemplateList: jest.fn(
    jest.requireActual('../../../../common/lib').deserializeComponentTemplateList
  ),
}));

const router = new RouterMock();
const getComponentTemplate = router.getMockESApiFn('cluster.getComponentTemplate');
const getIndexTemplate = router.getMockESApiFn('indices.getIndexTemplate');

const deserializeComponentTemplateMock = jest.mocked(deserializeComponentTemplate);
const deserializeComponentTemplateListMock = jest.mocked(deserializeComponentTemplateList);

beforeEach(() => {
  jest.clearAllMocks();
  registerComponentTemplateRoutes({
    ...routeDependencies,
    router,
  });

  const actualLib = jest.requireActual('../../../../common/lib');
  deserializeComponentTemplateMock.mockImplementation(actualLib.deserializeComponentTemplate);
  deserializeComponentTemplateListMock.mockImplementation(
    actualLib.deserializeComponentTemplateList
  );
});

describe('Component templates API - get routes', () => {
  describe('WHEN GET /api/index_management/component_templates', () => {
    it('SHOULD return a list of component templates', async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addBasePath('/component_templates'),
      };

      getComponentTemplate.mockResolvedValue({ component_templates: [] });
      getIndexTemplate.mockResolvedValue({ index_templates: [] });

      const res = await router.runRequest(mockRequest);

      expect(deserializeComponentTemplateList).toHaveBeenCalled();
      expect(res).toEqual({ body: [] });
    });

    it(`SHOULD include 'usedBy' and flags in the list response`, async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addBasePath('/component_templates'),
      };

      getComponentTemplate.mockResolvedValue({
        component_templates: [
          {
            name: 'comp-a',
            component_template: {
              template: {
                settings: { index: { number_of_shards: 1 } },
                mappings: { properties: {} },
                aliases: { a: {} },
              },
              _meta: {},
              deprecated: false,
            },
          },
        ],
      });
      getIndexTemplate.mockResolvedValue({
        index_templates: [
          {
            name: 'tmpl-1',
            index_template: { composed_of: ['comp-a'], index_patterns: ['logs-*'] },
          },
        ],
      });

      const res = await router.runRequest(mockRequest);

      expect(res.body[0]).toEqual(
        expect.objectContaining({
          name: 'comp-a',
          usedBy: ['tmpl-1'],
          isManaged: false,
          isDeprecated: false,
          hasSettings: true,
          hasMappings: true,
          hasAliases: true,
        })
      );
    });

    describe('AND an ES call fails', () => {
      it('SHOULD surface the error via the shared handler', async () => {
        const restore = withStubbedHandleEsError(routeDependencies);
        // Re-register routes to capture new handler
        registerComponentTemplateRoutes({ ...routeDependencies, router });

        const mockRequest: RequestMock = {
          method: 'get',
          path: addBasePath('/component_templates'),
        };

        getComponentTemplate.mockRejectedValue(new Error('boom'));

        const res = await router.runRequest(mockRequest);
        expect(res).toEqual({ status: 500, options: {} });

        restore();
      });
    });
  });

  describe('WHEN GET /api/index_management/component_templates/{name}', () => {
    it('SHOULD return a single component template', async () => {
      const mockRequest: RequestMock = {
        method: 'get',
        path: addBasePath('/component_templates/{name}'),
        params: { name: 'foo' },
      };

      getComponentTemplate.mockResolvedValue({
        component_templates: [
          {
            name: 'foo',
            component_template: { template: {} },
          },
        ],
      });
      getIndexTemplate.mockResolvedValue({
        index_templates: [
          { name: 'tmpl-1', index_template: { composed_of: ['foo'], index_patterns: ['*'] } },
        ],
      });

      const res = await router.runRequest(mockRequest);

      expect(deserializeComponentTemplate).toHaveBeenCalled();
      // Ensure we returned an ok response with a body
      expect(res).toHaveProperty('body');
      expect(res.body._kbnMeta.usedBy).toEqual(['tmpl-1']);
    });

    it('SHOULD surface errors via the shared error handler', async () => {
      const restore = withStubbedHandleEsError(routeDependencies);
      // Re-register routes to capture new error handler
      registerComponentTemplateRoutes({ ...routeDependencies, router });

      const mockRequest: RequestMock = {
        method: 'get',
        path: addBasePath('/component_templates/{name}'),
        params: { name: 'foo' },
      };

      getComponentTemplate.mockRejectedValue(new Error('boom'));

      const res = await router.runRequest(mockRequest);
      expect(res).toEqual({ status: 500, options: {} });

      restore();
    });
  });
});
