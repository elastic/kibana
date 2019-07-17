/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { DEFAULT_SERVICE_OPTION, HandlerAdapter, ServiceRegisterOptions } from '../handler_adpter';
import { Endpoint, ResourceLocator } from '../resource_locator';
import {
  RequestContext,
  ServiceDefinition,
  ServiceHandlerFor,
  ServiceMethodMap,
} from '../service_definition';
import { CodeServerRouter } from '../../security';
import { LocalHandlerAdapter } from '../local_handler_adapter';
import { LocalEndpoint } from '../local_endpoint';

export interface RequestPayload {
  context: RequestContext;
  params: any;
}

export class CodeNodeAdapter implements HandlerAdapter {
  localAdapter: LocalHandlerAdapter = new LocalHandlerAdapter();
  constructor(private readonly server: CodeServerRouter) {}

  locator: ResourceLocator = {
    async locate(httpRequest: Request, resource: string): Promise<Endpoint> {
      return Promise.resolve(new LocalEndpoint(httpRequest, resource));
    },
  };

  getService<def extends ServiceDefinition>(serviceDefinition: def): ServiceMethodMap<def> {
    // services on code node dispatch to local directly
    return this.localAdapter.getService(serviceDefinition);
  }

  registerHandler<def extends ServiceDefinition>(
    serviceDefinition: def,
    serviceHandler: ServiceHandlerFor<def> | null,
    options: ServiceRegisterOptions = DEFAULT_SERVICE_OPTION
  ) {
    if (!serviceHandler) {
      throw new Error("Code node service handler can't be null!");
    }
    const serviceMethodMap = this.localAdapter.registerHandler(serviceDefinition, serviceHandler);
    // eslint-disable-next-line guard-for-in
    for (const method in serviceDefinition) {
      const d = serviceDefinition[method];
      const path = `${options.routePrefix}/${d.routePath || method}`;
      // register routes, receive requests from non-code node.
      this.server.route({
        method: 'post',
        path,
        async handler(req: Request) {
          const { context, params } = req.payload as RequestPayload;
          const endpoint: Endpoint = {
            toContext(): RequestContext {
              return context;
            },
          };
          return await serviceMethodMap[method](endpoint, params);
        },
      });
    }
    return serviceMethodMap;
  }
}
