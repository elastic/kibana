/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceDefinition, ServiceHandlerFor, ServiceMethodMap } from './service_definition';
import {
  DEFAULT_SERVICE_OPTION,
  ServiceHandlerAdapter,
  ServiceRegisterOptions,
} from './service_handler_adapter';
import { Endpoint } from './resource_locator';
import { RequestFacade } from '../../';

export class CodeServices {
  constructor(private readonly adapter: ServiceHandlerAdapter) {}

  public registerHandler<serviceDefinition extends ServiceDefinition>(
    serviceDefinition: serviceDefinition,
    serviceHandler: ServiceHandlerFor<serviceDefinition> | null,
    options: ServiceRegisterOptions = DEFAULT_SERVICE_OPTION
  ) {
    this.adapter.registerHandler(serviceDefinition, serviceHandler, options);
  }

  public async start() {
    await this.adapter.start();
  }

  public async stop() {
    await this.adapter.stop();
  }

  public allocate(req: RequestFacade, resource: string): Promise<Endpoint | undefined> {
    return this.adapter.locator.allocate(req, resource);
  }

  public locate(req: RequestFacade, resource: string): Promise<Endpoint> {
    return this.adapter.locator.locate(req, resource);
  }

  public isResourceLocal(resource: string): Promise<boolean> {
    return this.adapter.locator.isResourceLocal(resource);
  }

  public serviceFor<def extends ServiceDefinition>(serviceDefinition: def): ServiceMethodMap<def> {
    return this.adapter.getService(serviceDefinition);
  }
}
