/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { Request, Server, ResponseToolkit } from 'hapi';
import { runHttpQuery } from 'apollo-server-core';
import {
  UMBackendFrameworkAdapter,
  UMFrameworkRequest,
  UMFrameworkResponse,
  UMFrameworkRouteOptions,
} from './adapter_types';
import { DEFAULT_GRAPHQL_PATH } from '../../../graphql';

export class UMKibanaBackendFrameworkAdapter implements UMBackendFrameworkAdapter {
  private server: Server;

  constructor(hapiServer: Server) {
    this.server = hapiServer;
  }

  public registerRoute<
    RouteRequest extends UMFrameworkRequest,
    RouteResponse extends UMFrameworkResponse
  >(route: UMFrameworkRouteOptions<RouteRequest, RouteResponse>) {
    this.server.route(route);
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    const options = {
      graphQLOptions: (req: any) => ({
        context: { req },
        schema,
      }),
      path: routePath,
      route: {
        tags: ['access:uptime'],
      },
    };
    this.server.route({
      options: options.route,
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          const { method } = request;
          const query =
            method === 'post'
              ? (request.payload as Record<string, any>)
              : (request.query as Record<string, any>);

          const graphQLResponse = await runHttpQuery([request], {
            method: method.toUpperCase(),
            options: options.graphQLOptions,
            query,
          });

          return h.response(graphQLResponse).type('application/json');
        } catch (error) {
          if (error.isGraphQLError === true) {
            return h
              .response(error.message)
              .code(error.statusCode)
              .type('application/json');
          }
          return h.response(error).type('application/json');
        }
      },
      method: ['get', 'post'],
      path: options.path || DEFAULT_GRAPHQL_PATH,
      vhost: undefined,
    });
  }
}
