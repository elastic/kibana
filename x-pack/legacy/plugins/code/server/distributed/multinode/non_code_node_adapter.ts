/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Wreck from '@hapi/wreck';
import util from 'util';
import Boom from '@hapi/boom';
import { Request } from '@hapi/hapi';
import * as http from 'http';
import {
  DEFAULT_SERVICE_OPTION,
  ServiceHandlerAdapter,
  ServiceRegisterOptions,
} from '../service_handler_adapter';
import { ResourceLocator } from '../resource_locator';
import { ServiceDefinition, ServiceHandlerFor, ServiceMethodMap } from '../service_definition';
import { CodeNodeResourceLocator } from './code_node_resource_locator';
import { CodeNodeEndpoint } from './code_node_endpoint';
import { RequestPayload } from './code_node_adapter';
import { Logger } from '../../log';

const pickHeaders = ['authorization'];

function filterHeaders(originRequest: Request) {
  const result: { [name: string]: string } = {};
  for (const header of pickHeaders) {
    if (originRequest.headers[header]) {
      result[header] = originRequest.headers[header];
    }
  }
  return result;
}

export class NonCodeNodeAdapter implements ServiceHandlerAdapter {
  handlers: Map<any, any> = new Map<any, any>();

  constructor(private readonly codeNodeUrl: string, private readonly log: Logger) {}

  locator: ResourceLocator = new CodeNodeResourceLocator(this.codeNodeUrl);

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  getService<def extends ServiceDefinition>(serviceDefinition: def): ServiceMethodMap<def> {
    const serviceHandler = this.handlers.get(serviceDefinition);
    if (!serviceHandler) {
      // we don't need implement code for service, so we can register here.
      this.registerHandler(serviceDefinition, null);
    }
    return serviceHandler as ServiceMethodMap<def>;
  }

  registerHandler<def extends ServiceDefinition>(
    serviceDefinition: def,
    // serviceHandler will always be null here since it will be overridden by the request forwarding.
    serviceHandler: ServiceHandlerFor<def> | null,
    options: ServiceRegisterOptions = DEFAULT_SERVICE_OPTION
  ) {
    const dispatchedHandler: { [key: string]: any } = {};
    // eslint-disable-next-line guard-for-in
    for (const method in serviceDefinition) {
      const d = serviceDefinition[method];
      const path = `${options.routePrefix}/${d.routePath || method}`;
      dispatchedHandler[method] = async (endpoint: CodeNodeEndpoint, params: any) => {
        const payload = {
          context: endpoint.toContext(),
          params,
        };
        const { data } = await this.requestFn(
          endpoint.codeNodeUrl,
          path,
          payload,
          endpoint.httpRequest
        );
        return data;
      };
    }
    this.handlers.set(serviceDefinition, dispatchedHandler);
    return dispatchedHandler as ServiceMethodMap<def>;
  }

  async requestFn(baseUrl: string, path: string, payload: RequestPayload, originRequest: Request) {
    const opt = {
      baseUrl,
      payload: JSON.stringify(payload),
      // redirect all headers to CodeNode
      headers: { ...filterHeaders(originRequest), 'kbn-xsrf': 'kibana' },
    };
    const promise = Wreck.request('POST', path, opt);
    const res: http.IncomingMessage = await promise;
    this.log.debug(`sending RPC call to ${baseUrl}${path} ${res.statusCode}`);
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      const buffer: Buffer = await Wreck.read(res, {});
      try {
        return JSON.parse(buffer.toString(), (key, value) => {
          return value && value.type === 'Buffer' ? Buffer.from(value.data) : value;
        });
      } catch (e) {
        this.log.error('parse json failed: ' + buffer.toString());
        throw Boom.boomify(e, { statusCode: 500 });
      }
    } else {
      this.log.error(
        `received ${res.statusCode} from ${baseUrl}/${path}, params was ${util.inspect(
          payload.params
        )}`
      );
      const body: Boom.Payload = await Wreck.read(res, { json: true });
      throw new Boom(body.message, { statusCode: res.statusCode || 500, data: body.error });
    }
  }
}
