/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { defineOlsRoutes } from '.';
import { olsRoutesMock } from './index.mock';

const ROUTES = [
  ['get', '/internal/security/ols/{type}/_policy'],
  ['post', '/internal/security/ols/{type}/_suggest_principals'],
  ['get', '/internal/security/ols/{type}/{id}'],
  ['put', '/internal/security/ols/{type}/{id}'],
  ['post', '/internal/security/ols/{type}/{id}/_claim'],
  ['post', '/internal/security/ols/{type}/{id}/_transfer'],
] as const;

describe('OLS routes', () => {
  let mocks: ReturnType<typeof olsRoutesMock.create>;
  beforeEach(() => {
    mocks = olsRoutesMock.create();
    defineOlsRoutes(mocks.routeParams);
  });

  const callRoute = (method: (typeof ROUTES)[number][0], path: string) =>
    olsRoutesMock.getHandler(mocks.routeParams.router, method, path)(
      mocks.context,
      httpServerMock.createKibanaRequest({ params: { type: 'unknown', id: '1' } }),
      kibanaResponseFactory
    );

  it.each(ROUTES)('%s %s answers 404 for a type without an access policy', async (method, path) => {
    mocks.olsService.getPolicy.mockReturnValue(undefined);

    const response = await callRoute(method, path);

    expect(response.status).toBe(404);
    expect(mocks.olsService.getPolicy).toHaveBeenCalledWith('unknown');
  });

  it.each(ROUTES.filter(([, path]) => !path.endsWith('_policy')))(
    '%s %s answers 400 while OLS is disabled',
    async (method, path) => {
      mocks.olsService.isEnabled.mockReturnValue(false);

      const response = await callRoute(method, path);

      expect(response.status).toBe(400);
      expect(response.payload).toEqual({ message: 'Object-level security (OLS) is disabled.' });
      expect(mocks.routeParams.authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
      expect(mocks.savedObjectsClient.get).not.toHaveBeenCalled();
      expect(mocks.savedObjectsClient.changeAcl).not.toHaveBeenCalled();
    }
  );

  it.each(ROUTES)('%s %s disables route authorization in favor of the service', (method, path) => {
    const [config] = mocks.routeParams.router[method].mock.calls.find(
      ([routeConfig]) => routeConfig.path === path
    )!;

    expect(config.security?.authz).toEqual(expect.objectContaining({ enabled: false }));
    expect(config.options).toEqual({ access: 'internal' });
  });
});
