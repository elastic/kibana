/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLOptions } from 'apollo-server-core';
import { GraphQLSchema } from 'graphql';
import { Lifecycle, ResponseToolkit } from 'hapi';
import { RouteOptions } from 'hapi';
import { SavedObjectsLegacyService, RequestHandler, RouteMethod, IRouter } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ObjectType } from '@kbn/config-schema';

export interface UMFrameworkRequest {
  user: string;
  headers: Record<string, any>;
  payload: Record<string, any>;
  params: Record<string, any>;
  query: Record<string, any>;
}

export type UMFrameworkResponse = Lifecycle.ReturnValue;

export interface UMFrameworkRouteOptions<
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType
> {
  path: string;
  method: string;
  handler: RequestHandler<P, Q, B>;
  config?: any;
  validate: any;
}

export interface UptimeCoreSetup {
  route: IRouter;
}

export interface UptimeCorePlugins {
  elasticsearch: any;
  savedObjects: SavedObjectsLegacyService<any>;
  usageCollection: UsageCollectionSetup;
  xpack: any;
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
    route: UMFrameworkRouteOptions<ObjectType, ObjectType, ObjectType, RouteMethod>
  ): void;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
  getSavedObjectsClient(): any;
}
