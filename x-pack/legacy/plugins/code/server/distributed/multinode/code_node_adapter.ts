/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import util from 'util';
import Boom from '@hapi/boom';
import {
  DEFAULT_SERVICE_OPTION,
  ServiceHandlerAdapter,
  ServiceRegisterOptions,
} from '../service_handler_adapter';
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
import { Logger } from '../../log';

export interface RequestPayload {
  context: RequestContext;
  params: any;
}

export class CodeNodeAdapter implements ServiceHandlerAdapter {
  localAdapter: LocalHandlerAdapter = new LocalHandlerAdapter();
  constructor(private readonly server: CodeServerRouter, private readonly log: Logger) {}

  locator: ResourceLocator = {
    async locate(httpRequest: Request, resource: string): Promise<Endpoint> {
      return Promise.resolve(new LocalEndpoint(httpRequest, resource));
    },

    isResourceLocal(resource: string): Promise<boolean> {
      return Promise.resolve(false);
    },

    async allocate(httpRequest: Request, resource: string): Promise<Endpoint | undefined> {
      return Promise.resolve(new LocalEndpoint(httpRequest, resource));
    },
  };

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

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
        handler: async (req: Request) => {
          const { context, params } = req.payload as RequestPayload;
          this.log.debug(`Receiving RPC call ${req.url.pathname} ${util.inspect(params)}`);
          const endpoint: Endpoint = {
            toContext(): RequestContext {
              return context;
            },
          };
          try {
            const data = await serviceMethodMap[method](endpoint, params);
            return { data };
          } catch (e) {
            if (!Boom.isBoom(e)) {
              throw Boom.boomify(e, { statusCode: 500 });
            } else {
              throw e;
            }
          }
        },
      });
    }
    return serviceMethodMap;
  }
}
