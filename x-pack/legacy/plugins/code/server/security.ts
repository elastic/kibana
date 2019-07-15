/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';

import { ServerFacade, ServerRouteFacade, RouteOptionsFacade } from '..';

export class CodeServerRouter {
  public server: ServerFacade;

  constructor(readonly core: CoreSetup) {
    const { server } = core.http as any;
    this.server = server;
  }

  route(route: CodeRoute) {
    const routeOptions: RouteOptionsFacade = (route.options || {}) as RouteOptionsFacade;
    routeOptions.tags = [
      ...(routeOptions.tags || []),
      `access:code_${route.requireAdmin ? 'admin' : 'user'}`,
    ];

    this.server.route({
      handler: route.handler,
      method: route.method,
      options: routeOptions,
      path: route.path,
    });
  }
}

export interface CodeRoute extends ServerRouteFacade {
  requireAdmin?: boolean;
}
