/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { setupServer, SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { globalSearchPluginMock } from '../../mocks';
import { registerInternalSearchableTypesRoute } from '../get_searchable_types';

const pluginId = Symbol('globalSearch');

describe('GET /internal/global_search/searchable_types', () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];
  let registerRouteHandlerContext: SetupServerReturn['registerRouteHandlerContext'];
  let globalSearchHandlerContext: ReturnType<
    typeof globalSearchPluginMock.createRouteHandlerContext
  >;

  beforeEach(async () => {
    ({ server, createRouter, registerRouteHandlerContext } = await setupServer(pluginId));

    globalSearchHandlerContext = globalSearchPluginMock.createRouteHandlerContext();
    registerRouteHandlerContext<
      ReturnType<typeof globalSearchPluginMock.createRequestHandlerContext>,
      'globalSearch'
    >(pluginId, 'globalSearch', () => globalSearchHandlerContext);

    const router =
      createRouter<ReturnType<typeof globalSearchPluginMock.createRequestHandlerContext>>('/');

    registerInternalSearchableTypesRoute(router);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('calls the handler context with correct parameters', async () => {
    await supertest(server.listener).get('/internal/global_search/searchable_types').expect(200);

    expect(globalSearchHandlerContext.getSearchableTypes).toHaveBeenCalledTimes(1);
  });

  it('returns the types returned from the service', async () => {
    globalSearchHandlerContext.getSearchableTypes.mockResolvedValue(['type-a', 'type-b']);

    const response = await supertest(server.listener)
      .get('/internal/global_search/searchable_types')
      .expect(200);

    expect(response.body).toEqual({
      types: ['type-a', 'type-b'],
    });
  });

  it('returns the default error when the observable throws any other error', async () => {
    globalSearchHandlerContext.getSearchableTypes.mockRejectedValue(new Error());

    const response = await supertest(server.listener)
      .get('/internal/global_search/searchable_types')
      .expect(500);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'An internal server error occurred. Check Kibana server logs for details.',
        statusCode: 500,
      })
    );
  });
});
