/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceDefinition, ServiceHandlerFor, ServiceMethodMap } from './service_definition';
import { ResourceLocator } from './resource_locator';

export interface ServiceRegisterOptions {
  routePrefix?: string;
}

export const DEFAULT_SERVICE_OPTION: ServiceRegisterOptions = {
  routePrefix: '/api/code/internal',
};

export interface ServiceHandlerAdapter {
  locator: ResourceLocator;
  getService<DEF extends ServiceDefinition>(serviceDefinition: DEF): ServiceMethodMap<DEF>;
  registerHandler<DEF extends ServiceDefinition>(
    serviceDefinition: DEF,
    serviceHandler: ServiceHandlerFor<DEF> | null,
    options: ServiceRegisterOptions
  ): ServiceMethodMap<DEF>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
