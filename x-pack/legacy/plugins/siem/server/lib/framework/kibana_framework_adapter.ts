/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericParams } from 'elasticsearch';
import * as GraphiQL from 'apollo-server-module-graphiql';
import Boom from 'boom';
import { ResponseToolkit } from 'hapi';
import { EnvironmentMode } from 'kibana/public';
import { GraphQLSchema } from 'graphql';
import { runHttpQuery } from 'apollo-server-core';
import { ServerFacade, RequestFacade } from '../../types';

import {
  FrameworkAdapter,
  FrameworkIndexPatternsService,
  FrameworkRequest,
  internalFrameworkRequest,
  WrappableRequest,
} from './types';

interface CallWithRequestParams extends GenericParams {
  max_concurrent_shard_requests?: number;
}

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
  public version: string;
  public envMode: EnvironmentMode;

  constructor(private server: ServerFacade, mode: EnvironmentMode) {
    this.version = server.config().get('pkg.version');
    this.envMode = mode;
  }

  public async callWithRequest(
    req: FrameworkRequest,
    endpoint: string,
    params: CallWithRequestParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: any[]
  ) {
    const internalRequest = req[internalFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const includeFrozen = await internalRequest.getUiSettingsService().get('search:includeFrozen');
    const maxConcurrentShardRequests =
      endpoint === 'msearch'
        ? await internalRequest.getUiSettingsService().get('courier:maxConcurrentShardRequests')
        : 0;
    const fields = await callWithRequest(
      internalRequest,
      endpoint,
      {
        ...params,
        ignore_throttled: !includeFrozen,
        ...(maxConcurrentShardRequests > 0
          ? { max_concurrent_shard_requests: maxConcurrentShardRequests }
          : {}),
      },
      ...rest
    );
    return fields;
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
        tags: ['access:siem'],
      },
      handler: async (request: RequestFacade, h: ResponseToolkit) => {
        try {
          const query =
            request.method === 'post'
              ? (request.payload as Record<string, any>) // eslint-disable-line @typescript-eslint/no-explicit-any
              : (request.query as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any

          const gqlResponse = await runHttpQuery([request], {
            method: request.method.toUpperCase(),
            options: (req: RequestFacade) => ({
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
      path: routePath,
      vhost: undefined,
    });

    if (!this.envMode.prod) {
      this.server.route({
        options: {
          tags: ['access:siem'],
        },
        handler: async (request: RequestFacade, h: ResponseToolkit) => {
          const graphiqlString = await GraphiQL.resolveGraphiQLString(
            request.query,
            {
              endpointURL: routePath,
              passHeader: `'kbn-version': '${this.version}'`,
            },
            request
          );

          return h.response(graphiqlString).type('text/html');
        },
        method: 'GET',
        path: `${routePath}/graphiql`,
      });
    }
  }

  public getIndexPatternsService(request: FrameworkRequest): FrameworkIndexPatternsService {
    return this.server.indexPatternsServiceFactory({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  public getSavedObjectsService() {
    return this.server.savedObjects;
  }
}

export function wrapRequest<InternalRequest extends WrappableRequest>(
  req: InternalRequest
): FrameworkRequest<InternalRequest> {
  const { auth, params, payload, query } = req;

  return {
    [internalFrameworkRequest]: req,
    auth,
    params,
    payload,
    query,
  };
}
