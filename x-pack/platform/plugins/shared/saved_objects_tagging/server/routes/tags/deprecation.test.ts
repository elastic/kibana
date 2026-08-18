/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import type { KibanaRouteOptions } from '@kbn/core-http-server';
import { registerCreateTagRoute } from './create_tag';
import { registerDeleteTagRoute } from './delete_tag';
import { registerGetAllTagsRoute } from './get_all_tags';
import { registerGetTagRoute } from './get_tag';
import { registerUpdateTagRoute } from './update_tag';

describe('legacy /api/saved_objects_tagging tag CRUD routes', () => {
  it('registers all CRUD routes as deprecated', () => {
    const httpSetup = httpServiceMock.createSetupContract();
    const router = httpSetup.createRouter();

    registerCreateTagRoute(router);
    registerUpdateTagRoute(router);
    registerDeleteTagRoute(router);
    registerGetAllTagsRoute(router);
    registerGetTagRoute(router);

    const getRouteOptions = (
      routes: Array<[unknown, unknown]>,
      path: string
    ): KibanaRouteOptions | undefined => {
      const match = routes.find(([route]) => (route as { path?: string }).path === path);
      if (!match) {
        throw new Error(`Expected route for path [${path}] to be registered`);
      }
      return (match[0] as { options?: KibanaRouteOptions }).options;
    };

    const expectedDocUrl = 'https://www.elastic.co/docs/api/doc/kibana/group/endpoint-tags';

    const createOptions = getRouteOptions(
      router.post.mock.calls,
      '/api/saved_objects_tagging/tags/create'
    );
    const updateOptions = getRouteOptions(
      router.post.mock.calls,
      '/api/saved_objects_tagging/tags/{id}'
    );
    const deleteOptions = getRouteOptions(
      router.delete.mock.calls,
      '/api/saved_objects_tagging/tags/{id}'
    );
    const getAllOptions = getRouteOptions(router.get.mock.calls, '/api/saved_objects_tagging/tags');
    const getOptions = getRouteOptions(
      router.get.mock.calls,
      '/api/saved_objects_tagging/tags/{id}'
    );

    expect(createOptions).toEqual(
      expect.objectContaining({
        deprecated: {
          documentationUrl: expectedDocUrl,
          severity: 'warning',
          reason: { type: 'migrate', newApiMethod: 'POST', newApiPath: '/api/tags' },
        },
      })
    );

    expect(updateOptions).toEqual(
      expect.objectContaining({
        deprecated: {
          documentationUrl: expectedDocUrl,
          severity: 'warning',
          reason: { type: 'migrate', newApiMethod: 'PUT', newApiPath: '/api/tags/{id}' },
        },
      })
    );

    expect(deleteOptions).toEqual(
      expect.objectContaining({
        deprecated: {
          documentationUrl: expectedDocUrl,
          severity: 'warning',
          reason: { type: 'migrate', newApiMethod: 'DELETE', newApiPath: '/api/tags/{id}' },
        },
      })
    );

    expect(getAllOptions).toEqual(
      expect.objectContaining({
        deprecated: {
          documentationUrl: expectedDocUrl,
          severity: 'warning',
          reason: { type: 'migrate', newApiMethod: 'GET', newApiPath: '/api/tags' },
        },
      })
    );

    expect(getOptions).toEqual(
      expect.objectContaining({
        deprecated: {
          documentationUrl: expectedDocUrl,
          severity: 'warning',
          reason: { type: 'migrate', newApiMethod: 'GET', newApiPath: '/api/tags/{id}' },
        },
      })
    );
  });
});
