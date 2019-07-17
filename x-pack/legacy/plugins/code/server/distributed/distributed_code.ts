/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { ServiceDefinition, ServiceHandlerFor, ServiceMethodMap } from './service_definition';
import { DEFAULT_SERVICE_OPTION, HandlerAdapter, ServiceRegisterOptions } from './handler_adpter';
import { Endpoint } from './resource_locator';

export class DistributedCode {
  constructor(private readonly adapter: HandlerAdapter) {}

  public registerHandler<serviceDefinition extends ServiceDefinition>(
    serviceDefinition: serviceDefinition,
    serviceHandler: ServiceHandlerFor<serviceDefinition> | null,
    options: ServiceRegisterOptions = DEFAULT_SERVICE_OPTION
  ) {
    this.adapter.registerHandler(serviceDefinition, serviceHandler, options);
  }

  public locate(req: Request, resource: string): Promise<Endpoint> {
    return this.adapter.locator.locate(req, resource);
  }

  public serviceFor<def extends ServiceDefinition>(serviceDefinition: def): ServiceMethodMap<def> {
    return this.adapter.getService(serviceDefinition);
  }
}
