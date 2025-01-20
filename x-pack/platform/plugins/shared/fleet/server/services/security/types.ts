/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RouteMethod,
  VersionedRouteConfig,
  AddVersionOpts,
  IKibanaResponse,
  RouteConfigOptions,
} from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { RequestHandler } from '@kbn/core/server';
import type { MaybePromise } from '@kbn/utility-types';

import type { FleetRequestHandlerContext } from '../..';

import type { FleetAuthz } from '../../../common';

/** The values allowed for the `fleetAuthz` property of the Fleet Router registration interface. */
type FleetAuthzRouterConfigParam = FleetAuthzRequirements | ((userAuthz: FleetAuthz) => boolean);

type FleetAuthzRouteRegistrar<
  Method extends RouteMethod,
  Context extends RequestHandlerContext = RequestHandlerContext
> = (config: FleetRouteConfig<Method>) => FleetVersionedRoute<Method, Context>;

export interface FleetAuthzRouteConfig<
  T extends FleetAuthzRouterConfigParam = FleetAuthzRouterConfigParam
> {
  fleetAuthz?: T;
}

/**
 * Internal type necessary to make access in VersionedRouteConfig optional
 */
export type FleetVersionedRouteConfig<Method extends RouteMethod> = Omit<
  VersionedRouteConfig<Method>,
  'access'
> & {
  access?: Exclude<RouteConfigOptions<RouteMethod>['access'], undefined>;
};
/**
 * Interface replacing the native VersionedRouteConfig to accept fleetAuthz
 */
export type FleetRouteConfig<Method extends RouteMethod> = FleetVersionedRouteConfig<Method> &
  FleetAuthzRouteConfig;

/**
 * Interface replacing the native VersionedRouter to handle fleetAuthz
 */
export interface FleetVersionedRouter<
  TContext extends FleetRequestHandlerContext = FleetRequestHandlerContext
> {
  get: FleetAuthzRouteRegistrar<'get', TContext>;
  delete: FleetAuthzRouteRegistrar<'delete', TContext>;
  post: FleetAuthzRouteRegistrar<'post', TContext>;
  put: FleetAuthzRouteRegistrar<'put', TContext>;
  patch: FleetAuthzRouteRegistrar<'patch', TContext>;
}

/**
 * Fleet router that handles versions and authorizations when registering routes
 */
export interface FleetAuthzRouter<
  TContext extends FleetRequestHandlerContext = FleetRequestHandlerContext
> {
  versioned: FleetVersionedRouter<TContext>;
}

type DeepPartialTruthy<T> = {
  [P in keyof T]?: T[P] extends boolean ? true : DeepPartialTruthy<T[P]>;
};

/**
 * The set of authz properties required to be granted access to an API route
 */
export type FleetAuthzRequirements = DeepPartialTruthy<FleetAuthz>;

/**
 * Interface used for registering and calculating authorization for a Fleet API routes
 */
export type FleetRouteRequiredAuthz = Partial<{
  any: FleetAuthzRequirements;
  all: FleetAuthzRequirements;
}>;

/**
 * Interface used to extend Core native addVersionOpts interface to accept fleetAuthz
 */
export interface FleetAddVersionOpts<P, Q, B> extends AddVersionOpts<P, Q, B> {
  fleetAuthz?: FleetAuthzRouteConfig['fleetAuthz'];
}

export type FleetHandler<P, Q, B, Context extends RequestHandlerContext> = (
  ...params: Parameters<RequestHandler<P, Q, B, Context>>
) => MaybePromise<IKibanaResponse>;

/**
 * Interface that redefines Core native VersionedRoute interface to accept Fleet custom types
 */
export interface FleetVersionedRoute<
  Method extends RouteMethod = RouteMethod,
  Context extends RequestHandlerContext = RequestHandlerContext
> {
  addVersion<P = unknown, Q = unknown, B = unknown>(
    options: FleetAddVersionOpts<P, Q, B>,
    handler: FleetHandler<P, Q, B, Context>
  ): FleetVersionedRoute<Method, Context>;
}
