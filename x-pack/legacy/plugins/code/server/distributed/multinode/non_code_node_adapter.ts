/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Wreck from '@hapi/wreck';
import { DEFAULT_SERVICE_OPTION, HandlerAdapter, ServiceRegisterOptions } from '../handler_adpter';
import { ResourceLocator } from '../resource_locator';
import { ServiceDefinition, ServiceHandlerFor, ServiceMethodMap } from '../service_definition';
import { CodeNodeResourceLocator } from './code_node_resource_locator';
import { CodeNodeEndpoint } from './code_node_endpoint';
import { RequestPayload } from './code_node_adapter';

export class NonCodeNodeAdapter implements HandlerAdapter {
  handlers: Map<any, any> = new Map<any, any>();

  constructor(private readonly codeNodeUrl: string) {}

  locator: ResourceLocator = new CodeNodeResourceLocator(this.codeNodeUrl);

  getService<def extends ServiceDefinition>(serviceDefinition: def): ServiceMethodMap<def> {
    const serviceHandler = this.handlers.get(serviceDefinition);
    if (serviceHandler) {
      return serviceHandler as ServiceMethodMap<def>;
    } else {
      throw new Error(`handler for ${serviceDefinition} not found`);
    }
  }

  registerHandler<def extends ServiceDefinition>(
    serviceDefinition: def,
    serviceHandler: ServiceHandlerFor<def> | null,
    options: ServiceRegisterOptions = DEFAULT_SERVICE_OPTION
  ) {
    const dispatchedHandler: { [key: string]: any } = {};
    // eslint-disable-next-line guard-for-in
    for (const method in serviceDefinition) {
      const d = serviceDefinition[method];
      const path = `${options.routePrefix}/${d.routePath || method}`;
      const requestFn = this.requestFn;
      dispatchedHandler[method] = async function(endpoint: CodeNodeEndpoint, params: any) {
        const payload = {
          context: endpoint.toContext(),
          params,
        };
        return await requestFn(endpoint.codeNodeUrl, path, payload);
      };
    }
    this.handlers.set(serviceDefinition, dispatchedHandler);
    return dispatchedHandler as ServiceMethodMap<def>;
  }

  async requestFn(baseUrl: string, path: string, payload: RequestPayload) {
    const opt = {
      baseUrl,
      payload: JSON.stringify(payload),
      headers: payload.context.headers,
    };
    const promise = Wreck.request('POST', path, opt);
    try {
      const res = await promise;
      return await Wreck.read(res, { json: 'force' });
    } catch (err) {
      throw err;
    }
  }
}
