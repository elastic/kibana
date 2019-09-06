/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericParams } from 'elasticsearch';
import { GraphQLSchema } from 'graphql';
import { Legacy } from 'kibana';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { get } from 'lodash';
import { Request, ResponseToolkit } from 'hapi';
import { runHttpQuery } from 'apollo-server-core';
import Boom from 'boom';
import * as GraphiQL from 'apollo-server-module-graphiql';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraFrameworkRouteOptions,
  InfraResponse,
  InfraTSVBResponse,
  InfraWrappableRequest,
  internalInfraFrameworkRequest,
} from './adapter_types';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';

interface CallWithRequestParams extends GenericParams {
  max_concurrent_shard_requests?: number;
}

export class InfraKibanaBackendFrameworkAdapter implements InfraBackendFrameworkAdapter {
  public version: string;
  private server: Legacy.Server;

  constructor(server: Legacy.Server) {
    this.version = server.config().get('pkg.version');
    this.server = server;
  }

  public config(req: InfraFrameworkRequest<Legacy.Request>): KibanaConfig {
    const internalRequest = req[internalInfraFrameworkRequest];
    return internalRequest.server.config();
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    this.server.route({
      handler: {
        directory: {
          path: dir,
        },
      },
      method: 'GET',
      path: urlPath,
    });
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.route({
      options: {
        tags: ['access:infra'],
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          const query =
            request.method === 'post'
              ? (request.payload as Record<string, any>)
              : (request.query as Record<string, any>);

          const gqlResponse = await runHttpQuery([request], {
            method: request.method.toUpperCase(),
            options: (req: Legacy.Request) => ({
              context: { req: wrapRequest(req) },
              schema,
            }),
            query,
          });

          return h.response(gqlResponse).type('application/json');
        } catch (error) {
          if ('HttpQueryError' !== error.name) {
            const queryError = Boom.boomify(error);

            queryError.output.payload.message = error.message;

            return queryError;
          }

          if (error.isGraphQLError === true) {
            return h
              .response(error.message)
              .code(error.statusCode)
              .type('application/json');
          }

          const genericError = new Boom(error.message, { statusCode: error.statusCode });

          if (error.headers) {
            Object.keys(error.headers).forEach(header => {
              genericError.output.headers[header] = error.headers[header];
            });
          }

          // Boom hides the error when status code is 500
          genericError.output.payload.message = error.message;

          throw genericError;
        }
      },
      method: ['GET', 'POST'],
      path: routePath || '/graphql',
    });

    this.server.route({
      options: {
        tags: ['access:infra'],
      },
      handler: async (request: Request, h: ResponseToolkit) => {
        const graphiqlString = await GraphiQL.resolveGraphiQLString(
          request.query,
          (req: Legacy.Request) => ({
            endpointURL: req ? `${req.getBasePath()}${routePath}` : routePath,
            passHeader: `'kbn-version': '${this.version}'`,
          }),
          request
        );

        return h.response(graphiqlString).type('text/html');
      },
      method: 'GET',
      path: routePath ? `${routePath}/graphiql` : '/graphiql',
    });
  }

  public registerRoute<
    RouteRequest extends InfraWrappableRequest,
    RouteResponse extends InfraResponse
  >(route: InfraFrameworkRouteOptions<RouteRequest, RouteResponse>) {
    const wrappedHandler = (request: any, h: Legacy.ResponseToolkit) =>
      route.handler(wrapRequest(request), h);

    this.server.route({
      handler: wrappedHandler,
      options: route.options,
      method: route.method,
      path: route.path,
    });
  }

  public async callWithRequest(
    req: InfraFrameworkRequest<Legacy.Request>,
    endpoint: string,
    params: CallWithRequestParams,
    ...rest: Array<any>
  ) {
    const internalRequest = req[internalInfraFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const includeFrozen = await internalRequest.getUiSettingsService().get('search:includeFrozen');
    if (endpoint === 'msearch') {
      const maxConcurrentShardRequests = await internalRequest
        .getUiSettingsService()
        .get('courier:maxConcurrentShardRequests');
      if (maxConcurrentShardRequests > 0) {
        params = { ...params, max_concurrent_shard_requests: maxConcurrentShardRequests };
      }
    }

    const frozenIndicesParams = ['search', 'msearch'].includes(endpoint)
      ? {
          ignore_throttled: !includeFrozen,
        }
      : {};

    const fields = await callWithRequest(
      internalRequest,
      endpoint,
      {
        ...params,
        ...frozenIndicesParams,
      },
      ...rest
    );
    return fields;
  }

  public getIndexPatternsService(
    request: InfraFrameworkRequest<Legacy.Request>
  ): Legacy.IndexPatternsService {
    return this.server.indexPatternsServiceFactory({
      callCluster: async (method: string, args: [GenericParams], ...rest: any[]) => {
        const fieldCaps = await this.callWithRequest(
          request,
          method,
          { ...args, allowNoIndices: true } as GenericParams,
          ...rest
        );
        return fieldCaps;
      },
    });
  }

  public getSpaceId(request: InfraFrameworkRequest): string {
    const spacesPlugin = this.server.plugins.spaces;

    if (spacesPlugin && typeof spacesPlugin.getSpaceId === 'function') {
      return spacesPlugin.getSpaceId(request[internalInfraFrameworkRequest]);
    } else {
      return 'default';
    }
  }

  public getSavedObjectsService() {
    return this.server.savedObjects;
  }

  public async makeTSVBRequest(
    req: InfraFrameworkRequest<Legacy.Request>,
    model: TSVBMetricModel,
    timerange: { min: number; max: number },
    filters: any[]
  ) {
    const internalRequest = req[internalInfraFrameworkRequest];
    const server = internalRequest.server;
    const getVisData = get(server, 'plugins.metrics.getVisData');
    if (typeof getVisData !== 'function') {
      throw new Error('TSVB is not available');
    }

    // getBasePath returns randomized base path AND spaces path
    const basePath = internalRequest.getBasePath();
    const url = `${basePath}/api/metrics/vis/data`;

    // For the following request we need a copy of the instnace of the internal request
    // but modified for our TSVB request. This will ensure all the instance methods
    // are available along with our overriden values
    const request = Object.assign(
      Object.create(Object.getPrototypeOf(internalRequest)),
      internalRequest,
      {
        url,
        method: 'POST',
        payload: {
          timerange,
          panels: [model],
          filters,
        },
      }
    );
    const result = await getVisData(request);
    return result as InfraTSVBResponse;
  }
}

export function wrapRequest<InternalRequest extends InfraWrappableRequest>(
  req: InternalRequest
): InfraFrameworkRequest<InternalRequest> {
  const { params, payload, query } = req;

  return {
    [internalInfraFrameworkRequest]: req,
    params,
    payload,
    query,
  };
}
