/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  SavedObjectsLegacyService,
  RequestHandler,
  IRouter,
  CallAPIOptions,
  SavedObjectsClientContract,
} from 'src/core/server';
import { ObjectType } from '@kbn/config-schema';
import { UMRouteDefinition } from '../../../rest_api';

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

export type UMElasticsearchQueryFn<T = any, P = undefined> = (
  callAsCurrentUser: (
    endpoint: string,
    clientParams: Record<string, any>,
    options?: CallAPIOptions
  ) => Promise<any>,
  params: P
) => Promise<T> | T;

export type UMSavedObjectsQueryFn<T = any, P = undefined> = (
  client: SavedObjectsClientContract,
  params: P
) => Promise<T> | T;

export interface UptimeCoreSetup {
  route: IRouter;
}

export interface UptimeCorePlugins {
  savedObjects: SavedObjectsLegacyService<any>;
  usageCollection: UsageCollectionSetup;
  xpack: any;
}

export interface UMBackendFrameworkAdapter {
  registerRoute(route: UMRouteDefinition): void;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
}
