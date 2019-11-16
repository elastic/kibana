/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server, Request, ResponseToolkit } from 'hapi';
import {
  FrameworkRoute,
  FrameworkRequest,
  FrameworkUser,
  internalAuthData,
  FrameworkResponseToolkit,
} from './adapter_types';

export class HapiFrameworkAdapter {
  constructor(private readonly server: Server) {}

  public registerRoute(route: FrameworkRoute) {
    this.server.route({
      ...route,
      handler: async function frameworkRouteHandler(request: Request, h: ResponseToolkit) {
        const frameworkRequest = HapiFrameworkAdapter.getFrameworkRequestFromRequest(request);

        return await route.handler(frameworkRequest, h as FrameworkResponseToolkit);
      },
    });
  }

  public static getFrameworkRequestFromRequest(request: Request): FrameworkRequest {
    const { params, payload, query, headers } = request;
    return {
      params,
      payload,
      query,
      headers,
      user: HapiFrameworkAdapter.getUserFromRequest(request),
    };
  }
  public static getUserFromRequest(request: Request): FrameworkUser {
    const isAuthenticated = request.headers.authorization != null;

    return isAuthenticated
      ? {
          kind: 'authenticated',
          [internalAuthData]: request.headers,
        }
      : {
          kind: 'unauthenticated',
        };
  }
}
