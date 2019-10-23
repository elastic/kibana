/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouter, RequestHandler } from 'src/core/server';
import { ServerRouteFacade, RouteOptionsFacade } from '..';

export class CodeServerRouter {
  constructor(public readonly router: IRouter) {}

  route(route: CodeRoute) {
    const routeOptions: RouteOptionsFacade = (route.options || {}) as RouteOptionsFacade;
    const tags = [
      ...(routeOptions.tags || []),
      `access:code_${route.requireAdmin ? 'admin' : 'user'}`,
    ];

    const routeHandler = route.npHandler!;

    switch ((route.method as string).toLowerCase()) {
      case 'get': {
        this.router.get(
          {
            path: route.path,
            validate: {
              query: schema.object({}, { allowUnknowns: true }),
              params: schema.object({}, { allowUnknowns: true }),
            },
            options: {
              tags,
            },
          },
          routeHandler
        );
        break;
      }
      case 'put': {
        this.router.put(
          {
            path: route.path,
            validate: {
              query: schema.object({}, { allowUnknowns: true }),
              params: schema.object({}, { allowUnknowns: true }),
              body: schema.object({}, { allowUnknowns: true }),
            },
            options: {
              tags,
            },
          },
          routeHandler
        );
        break;
      }
      case 'delete': {
        this.router.delete(
          {
            path: route.path,
            validate: {
              query: schema.object({}, { allowUnknowns: true }),
              params: schema.object({}, { allowUnknowns: true }),
            },
            options: {
              tags,
            },
          },
          routeHandler
        );
        break;
      }
      case 'patch':
      case 'post': {
        this.router.post(
          {
            path: route.path,
            validate: {
              query: schema.object({}, { allowUnknowns: true }),
              params: schema.object({}, { allowUnknowns: true }),
              body: schema.object({}, { allowUnknowns: true }),
            },
            options: {
              tags,
            },
          },
          routeHandler
        );
        break;
      }
      default: {
        throw new Error(`Unknown HTTP method: ${route.method}`);
      }
    }
  }
}

export interface CodeRoute extends ServerRouteFacade {
  requireAdmin?: boolean;
  // New Platform Route Handler API
  npHandler?: RequestHandler<any, any, any>;
}
