/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, RouteConfig, RouteMethod } from 'kibana/server';
import { UMServerLibs } from '../lib/lib';

export interface UMServerRoute<P, Q, B> {
  method: string;
  handler: RequestHandler<P, Q, B>;
}

export type UMRouteDefinition<P = any, Q = any, B = any> = UMServerRoute<P, Q, B> &
  RouteConfig<P, Q, B, RouteMethod>;

// The current master version assumes 'any' anyway
export type UMRestApiRouteCreator<P = any, Q = any, B = any> = (
  libs: UMServerLibs
) => UMRouteDefinition<P, Q, B>;
