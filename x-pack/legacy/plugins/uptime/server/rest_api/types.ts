/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObjectType } from '@kbn/config-schema';
import { RequestHandler, RouteConfig, RouteMethod } from 'kibana/server';
import { UMServerLibs } from '../lib/lib';

export interface UMServerRoute {
  method: string;
  handler: RequestHandler<ObjectType, ObjectType, ObjectType>;
}

export type UMRouteDefinition = UMServerRoute &
  RouteConfig<ObjectType, ObjectType, ObjectType, RouteMethod>;

export type UMRestApiRouteCreator = (libs: UMServerLibs) => UMRouteDefinition;
