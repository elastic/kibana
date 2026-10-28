/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { KibanaContainerModule, Logger } from '@kbn/core-di';
import {
  CoreStart,
  InternalElasticsearchClient,
  Request,
  Response,
  Route,
} from '@kbn/core-di-server';
import { coreMock, elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  GET_NOTIFICATIONS_PATH,
  GET_UNREAD_STATUS_PATH,
  MARK_ALL_READ_PATH,
  MARK_READ_PATH,
} from '../../common/routes';
import { bindRoutes } from './bind_routes';
import { bindServices } from './bind_services';

/**
 * Stands in for the request scope core forks per request: the same plugin bindings plus the
 * request and response factory that `Request` and `Response` resolve to.
 */
const createRequestScope = () => {
  const container = new Container();
  const { featureFlags } = coreMock.createStart();

  container
    .bind(CoreStart('userStorage'))
    .toConstantValue({ asScoped: jest.fn().mockReturnValue(null) } as never);
  container.bind(CoreStart('featureFlags')).toConstantValue(featureFlags as never);
  container
    .bind(InternalElasticsearchClient)
    .toConstantValue(elasticsearchServiceMock.createElasticsearchClient());
  container.bind(Logger).toConstantValue(loggingSystemMock.createLogger());
  container.bind(Request).toConstantValue(httpServerMock.createKibanaRequest());
  container.bind(Response).toConstantValue(httpServerMock.createResponseFactory() as never);

  container.load(
    new KibanaContainerModule((options) => {
      bindServices(options);
      bindRoutes(options);
    })
  );

  return container;
};

describe('bindRoutes', () => {
  it('binds every Notification Center route as an internal, authz-opted-out route', () => {
    const routes = createRequestScope().getAll(Route);

    expect(routes.map(({ method, path, options }) => [method, path, options?.access])).toEqual(
      expect.arrayContaining([
        ['get', GET_NOTIFICATIONS_PATH, 'internal'],
        ['get', GET_UNREAD_STATUS_PATH, 'internal'],
        ['post', MARK_READ_PATH, 'internal'],
        ['post', MARK_ALL_READ_PATH, 'internal'],
      ])
    );
    expect(routes).toHaveLength(4);
    for (const { security } of routes) {
      expect(security).toEqual({ authz: { enabled: false, reason: expect.any(String) } });
    }
  });

  // Core resolves the bound class inside the request scope, so an unbound dependency or a
  // forgotten `@injectable()` only surfaces when the route is constructed.
  it('constructs every route handler from the request scope', () => {
    const container = createRequestScope();

    for (const route of container.getAll(Route)) {
      const handler = container.get(route, { autobind: true });

      expect(typeof handler.handle).toBe('function');
    }
  });
});
