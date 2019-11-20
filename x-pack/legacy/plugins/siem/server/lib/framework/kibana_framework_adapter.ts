/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericParams } from 'elasticsearch';
import * as GraphiQL from 'apollo-server-module-graphiql';
import Boom from 'boom';
import { GraphQLSchema } from 'graphql';
import { runHttpQuery } from 'apollo-server-core';
import { schema as configSchema } from '@kbn/config-schema';
import { CoreSetup, IRouter, KibanaResponseFactory, RequestHandlerContext } from 'src/core/server';
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
  private isProductionMode: boolean;
  private router: IRouter;

  constructor(core: CoreSetup, private __legacy: ServerFacade) {
    this.version = __legacy.config().get('pkg.version');
    this.isProductionMode = process.env.NODE_ENV === 'production';
    this.router = core.http.createRouter();
  }

  public async callWithRequest(
    req: FrameworkRequest,
    endpoint: string,
    params: CallWithRequestParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: any[]
  ) {
    const { elasticsearch, uiSettings } = req.context.core;
    const includeFrozen = await uiSettings.client.get('search:includeFrozen');
    const maxConcurrentShardRequests =
      endpoint === 'msearch'
        ? await uiSettings.client.get('courier:maxConcurrentShardRequests')
        : 0;
    const fields = await elasticsearch.dataClient.callAsCurrentUser(
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

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.router.get(
      {
        path: routePath,
        validate: false,
        options: {
          tags: ['access:siem'],
        },
      },
      async (context, request, response) => {
        try {
          const { query } = request;
          const gqlResponse = await runHttpQuery([request], {
            method: 'GET',
            options: (req: RequestFacade) => ({
              context: { req: wrapRequest(req, context) },
              schema,
            }),
            query,
          });

          return response.ok({
            body: gqlResponse,
            headers: {
              'content-type': 'application/json',
            },
          });
        } catch (error) {
          return this.handleError(error, response);
        }
      }
    );

    this.router.post(
      {
        path: routePath,
        validate: {
          body: configSchema.object({
            operationName: configSchema.string(),
            query: configSchema.string(),
            variables: configSchema.any(),
          }),
        },
        options: {
          tags: ['access:siem'],
        },
      },
      async (context, request, response) => {
        try {
          const gqlResponse = await runHttpQuery([request], {
            method: 'POST',
            options: (req: RequestFacade) => ({
              context: { req: wrapRequest(req, context) },
              schema,
            }),
            query: request.body,
          });

          return response.ok({
            body: gqlResponse,
            headers: {
              'content-type': 'application/json',
            },
          });
        } catch (error) {
          return this.handleError(error, response);
        }
      }
    );

    if (!this.isProductionMode) {
      this.router.get(
        {
          path: `${routePath}/graphiql`,
          validate: false,
          options: {
            tags: ['access:siem'],
          },
        },
        async (context, request, response) => {
          const graphiqlString = await GraphiQL.resolveGraphiQLString(
            request.query,
            {
              endpointURL: routePath,
              passHeader: `'kbn-version': '${this.version}'`,
            },
            request
          );

          return response.ok({
            body: graphiqlString,
            headers: {
              'content-type': 'application/json',
            },
          });
        }
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(error: any, response: KibanaResponseFactory) {
    // TODO(rylnd): address this case
    // if ('HttpQueryError' !== error.name) {
    //   const queryError = Boom.boomify(error);

    //   queryError.output.payload.message = error.message;

    //   return queryError;
    // }

    if (error.isGraphQLError === true) {
      return response.badRequest({
        // TODO(rylnd): make this dynamic on error code
        body: error.message,
        headers: {
          'content-type': 'application/json',
        },
      });
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

  public getIndexPatternsService(request: FrameworkRequest): FrameworkIndexPatternsService {
    return this.__legacy.indexPatternsServiceFactory({
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
    return this.__legacy.savedObjects;
  }
}

export function wrapRequest<InternalRequest extends WrappableRequest>(
  req: InternalRequest,
  context: RequestHandlerContext
): FrameworkRequest<InternalRequest> {
  const { auth, params, payload, query } = req;

  return {
    [internalFrameworkRequest]: req,
    auth,
    context,
    params,
    payload,
    query,
  };
}
