/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLOptions } from 'apollo-server-core';
import { GraphQLSchema } from 'graphql';
import { Lifecycle, ResponseToolkit } from '@hapi/hapi';
import { RouteOptions } from '@hapi/hapi';

export interface UMFrameworkRequest {
  user: string;
  headers: Record<string, any>;
  payload: Record<string, any>;
  params: Record<string, any>;
  query: Record<string, any>;
}

export type UMFrameworkResponse = Lifecycle.ReturnValue;

export interface UMFrameworkRouteOptions<
  RouteRequest extends UMFrameworkRequest,
  RouteResponse extends UMFrameworkResponse
> {
  path: string;
  method: string;
  handler: (req: Request, h: ResponseToolkit) => any;
  config?: any;
}

export type UMFrameworkRouteHandler<RouteRequest extends UMFrameworkRequest> = (
  request: UMFrameworkRequest,
  h: ResponseToolkit
) => void;

export type HapiOptionsFunction = (req: Request) => GraphQLOptions | Promise<GraphQLOptions>;

export interface UMHapiGraphQLPluginOptions {
  path: string;
  vhost?: string;
  route?: RouteOptions;
  graphQLOptions: GraphQLOptions | HapiOptionsFunction;
}

export interface UMBackendFrameworkAdapter {
  registerRoute<RouteRequest extends UMFrameworkRequest, RouteResponse extends UMFrameworkResponse>(
    route: UMFrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
  getSavedObjectsClient(): any;
}
