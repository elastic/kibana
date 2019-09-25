/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import { ServiceHandlerAdapter } from './service_handler_adapter';
import { ServiceDefinition, ServiceHandlerFor, ServiceMethodMap } from './service_definition';
import { Endpoint, ResourceLocator } from './resource_locator';
import { LocalEndpoint } from './local_endpoint';

export class LocalHandlerAdapter implements ServiceHandlerAdapter {
  handlers: Map<any, any> = new Map<any, any>();

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  registerHandler<def extends ServiceDefinition>(
    serviceDefinition: def,
    serviceHandler: ServiceHandlerFor<def> | null
  ) {
    if (!serviceHandler) {
      throw new Error("Local service handler can't be null!");
    }
    const dispatchedHandler: { [key: string]: any } = {};
    // eslint-disable-next-line guard-for-in
    for (const method in serviceDefinition) {
      dispatchedHandler[method] = function(endpoint: Endpoint, params: any) {
        return serviceHandler[method](params, endpoint.toContext());
      };
    }
    this.handlers.set(serviceDefinition, dispatchedHandler);
    return dispatchedHandler as ServiceMethodMap<def>;
  }

  getService<def extends ServiceDefinition>(serviceDefinition: def): ServiceMethodMap<def> {
    const serviceHandler = this.handlers.get(serviceDefinition);
    if (serviceHandler) {
      return serviceHandler as ServiceMethodMap<def>;
    } else {
      throw new Error(`handler for ${serviceDefinition} not found`);
    }
  }

  locator: ResourceLocator = {
    async locate(httpRequest: Request, resource: string): Promise<Endpoint> {
      return Promise.resolve(new LocalEndpoint(httpRequest, resource));
    },

    isResourceLocal(resource: string): Promise<boolean> {
      return Promise.resolve(true);
    },

    async allocate(httpRequest: Request, resource: string): Promise<Endpoint | undefined> {
      return Promise.resolve(new LocalEndpoint(httpRequest, resource));
    },
  };
}
