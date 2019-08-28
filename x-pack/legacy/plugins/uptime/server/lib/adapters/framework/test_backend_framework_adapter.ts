/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import {
  UMBackendFrameworkAdapter,
  UMFrameworkRequest,
  UMFrameworkResponse,
  UMFrameworkRouteOptions,
} from './adapter_types';

export class UMTestBackendFrameworkAdapter implements UMBackendFrameworkAdapter {
  private server: any;

  constructor(server: any) {
    this.server = server;
  }

  public registerRoute<
    UMRouteRequest extends UMFrameworkRequest,
    UMRouteResponse extends UMFrameworkResponse
  >(route: UMFrameworkRouteOptions<UMFrameworkRequest, UMFrameworkResponse>): void {
    const { config, method, path, handler } = route;
    this.server.route({
      config,
      handler,
      method,
      path,
    });
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.register({
      options: {
        schema,
      },
      path: routePath,
    });
  }

  public getSavedObjectsClient() {
    return {};
  }
}
