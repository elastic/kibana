/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Endpoint } from './resource_locator';

export interface ServiceDefinition {
  [method: string]: { request: any; response: any; routePath?: string };
}

export type MethodsFor<serviceDefinition extends ServiceDefinition> = Extract<
  keyof serviceDefinition,
  string
>;

export type MethodHandler<
  serviceDefinition extends ServiceDefinition,
  method extends MethodsFor<serviceDefinition>
> = (
  request: RequestFor<serviceDefinition, method>,
  context: RequestContext
) => Promise<ResponseFor<serviceDefinition, method>>;

export type ServiceHandlerFor<serviceDefinition extends ServiceDefinition> = {
  [method in MethodsFor<serviceDefinition>]: MethodHandler<serviceDefinition, method>;
};

export type RequestFor<
  serviceDefinition extends ServiceDefinition,
  method extends MethodsFor<serviceDefinition>
> = serviceDefinition[method]['request'];

export type ResponseFor<
  serviceDefinition extends ServiceDefinition,
  method extends MethodsFor<serviceDefinition>
> = serviceDefinition[method]['response'];

export interface RequestContext {
  path: string;
  resource: string;
}

export type ServiceMethodMap<serviceDefinition extends ServiceDefinition> = {
  [method in MethodsFor<serviceDefinition>]: ServiceMethod<serviceDefinition, method>;
};

export type ServiceMethod<
  serviceDefinition extends ServiceDefinition,
  method extends MethodsFor<serviceDefinition>
> = (
  endpoint: Endpoint,
  request: RequestFor<serviceDefinition, method>
) => Promise<ResponseFor<serviceDefinition, method>>;
