/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { Server } from 'hapi';
import {
  UMBackendFrameworkAdapter,
  UMFrameworkRequest,
  UMFrameworkResponse,
  UMFrameworkRouteOptions,
  UMHapiGraphQLPluginOptions,
} from './adapter_types';
import { uptimeGraphQLHapiPlugin } from './apollo_framework_adapter';

export class UMKibanaBackendFrameworkAdapter implements UMBackendFrameworkAdapter {
  private server: Server;

  constructor(hapiServer: Server, private readonly register: any, private readonly route: any) {
    this.server = hapiServer;
    this.register = register;
    this.route = route;
    console.log(JSON.stringify(Object.keys(this.server), null, 2))
    console.log('route', this.server.route);
  }

  public registerRoute<
    RouteRequest extends UMFrameworkRequest,
    RouteResponse extends UMFrameworkResponse
  >(route: UMFrameworkRouteOptions<RouteRequest, RouteResponse>) {
    this.route(route);
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.register<UMHapiGraphQLPluginOptions>({
      options: {
        graphQLOptions: (req: any) => ({
          context: { req },
          schema,
        }),
        path: routePath,
        route: {
          tags: ['access:uptime'],
        },
      },
      plugin: uptimeGraphQLHapiPlugin,
    });
  }
}

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License;
//  * you may not use this file except in compliance with the Elastic License.
//  */

// import { GraphQLSchema } from 'graphql';
// import {
//   UMBackendFrameworkAdapter,
//   UMFrameworkRequest,
//   UMFrameworkResponse,
//   UMFrameworkRouteOptions,
//   UMHapiGraphQLPluginOptions,
// } from './adapter_types';
// import { uptimeGraphQLHapiPlugin } from './apollo_framework_adapter';

// export class UMKibanaBackendFrameworkAdapter implements UMBackendFrameworkAdapter {
//   constructor(
//     private readonly route: (route: any) => void,
//     private readonly register: <T>(options: any) => void
//   ) {
//     this.route = route;
//     this.register = register;
//   }

//   public registerRoutez<
//     RouteRequest extends UMFrameworkRequest,
//     RouteResponse extends UMFrameworkResponse
//   >(route: UMFrameworkRouteOptions<RouteRequest, RouteResponse>) {
//     // this.route(route);
//   }

//   public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
//   //   this.register<UMHapiGraphQLPluginOptions>({
//   //     options: {
//   //       graphQLOptions: (req: any) => ({
//   //         context: { req },
//   //         schema,
//   //       }),
//   //       path: routePath,
//   //       route: {
//   //         tags: ['access:uptime'],
//   //       },
//   //     },
//   //     plugin: uptimeGraphQLHapiPlugin,
//   //   });
//   }
// }
