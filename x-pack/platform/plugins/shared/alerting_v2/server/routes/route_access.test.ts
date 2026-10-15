/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import { Route } from '@kbn/core-di-server';
import type { RouteAccess } from '@kbn/core-http-server';
import { bindRoutes } from '../setup/bind_routes';

const INTERNAL_PATH_PREFIX = '/internal/';
const PUBLIC_PATH_PREFIX = '/api/';

const expectedAccessForPath = (path: string): RouteAccess => {
  if (path.startsWith(INTERNAL_PATH_PREFIX)) {
    return 'internal';
  }
  if (path.startsWith(PUBLIC_PATH_PREFIX)) {
    return 'public';
  }
  throw new Error(
    `Route path "${path}" must start with "${PUBLIC_PATH_PREFIX}" or "${INTERNAL_PATH_PREFIX}"`
  );
};

const collectBoundRoutes = () => {
  const container = new Container();
  container.load(new ContainerModule((options) => bindRoutes(options)));
  return container.getAll(Route);
};

describe('alerting v2 route access', () => {
  const routes = collectBoundRoutes();

  it.each(
    routes.map((route) => ({
      name: `${route.method.toUpperCase()} ${route.path}`,
      route,
    }))
  )('$name declares an access level that agrees with its path prefix', ({ route }) => {
    expect(route.options?.access).toEqual(expectedAccessForPath(route.path));
  });
});
