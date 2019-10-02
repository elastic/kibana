/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericParams } from 'elasticsearch';
import { GraphQLSchema } from 'graphql';
import { Legacy } from 'kibana';
import { get } from 'lodash';
import { runHttpQuery } from 'apollo-server-core';
import { schema, TypeOf, ObjectType } from '@kbn/config-schema';
import { first } from 'rxjs/operators';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraTSVBResponse,
  InfraWrappableRequest,
  internalInfraFrameworkRequest,
  InfraServerPluginDeps,
  InfraDatabaseSearchResponse,
} from './adapter_types';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';
import {
  InternalCoreSetup,
  IRouter,
  KibanaRequest,
  RequestHandler,
  RequestHandlerContext,
  KibanaResponseFactory,
  RouteConfig,
} from '../../../../../../../../src/core/server';
import { InfraConfig } from '../../../new_platform_config.schema';

interface CallWithRequestParams extends GenericParams {
  max_concurrent_shard_requests?: number;
}

const anyObject = schema.object({}, { allowUnknowns: true });

const VALIDATE_PLACEHOLDER = {
  body: anyObject,
  params: anyObject,
  query: anyObject,
};

type AnyObject = typeof anyObject;

interface BasicRoute<
  P extends ObjectType = AnyObject,
  Q extends ObjectType = AnyObject,
  B extends ObjectType = AnyObject
> {
  method: 'get' | 'put' | 'post' | 'delete';
  path: string;
  handler: RequestHandler<P, Q, B>;
  options?: any;
}

export class InfraKibanaBackendFrameworkAdapter
  implements InfraBackendFrameworkAdapter<BasicRoute> {
  public router: IRouter;
  private core: InternalCoreSetup;
  private plugins: InfraServerPluginDeps;

  constructor(core: InternalCoreSetup, config: InfraConfig, plugins: InfraServerPluginDeps) {
    this.router = core.http.createRouter('/api/infra');
    this.core = core;
    this.plugins = plugins;
  }

  public registerGraphQLEndpoint(routePath: string, gqlSchema: GraphQLSchema): void {
    const body = schema.object({
      operationName: schema.string(),
      query: schema.string(),
      variables: schema.object({
        sourceId: schema.string(),
      }),
    });
    type Body = TypeOf<typeof body>;

    const routeOptions = {
      path: routePath,
      validate: {
        body,
      },
    };
    async function handler(
      context: RequestHandlerContext,
      request: KibanaRequest<unknown, unknown, Body>,
      response: KibanaResponseFactory
    ) {
      try {
        const query =
          request.route.method === 'post'
            ? (request.body as Record<string, any>)
            : (request.query as Record<string, any>);

        const gqlResponse = await runHttpQuery([request], {
          method: request.route.method.toUpperCase(),
          options: (req: Legacy.Request) => ({
            context: { req: wrapRequest(req) },
            schema: gqlSchema,
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
        return response.badRequest({ body: error });
        // NP_TODO handle errors! (see below for previously handled error cases)
      }

      //   if ('HttpQueryError' !== error.name) {
      //     const queryError = Boom.boomify(error);

      //     queryError.output.payload.message = error.message;

      //     return queryError;
      //   }

      //   if (error.isGraphQLError === true) {
      //     return h
      //       .response(error.message)
      //       .code(error.statusCode)
      //       .type('application/json');
      //   }

      //   const genericError = new Boom(error.message, { statusCode: error.statusCode });

      //   if (error.headers) {
      //     Object.keys(error.headers).forEach(header => {
      //       genericError.output.headers[header] = error.headers[header];
      //     });
      //   }

      //   // Boom hides the error when status code is 500
      //   genericError.output.payload.message = error.message;

      //   throw genericError;
      // }
    }
    this.router.post(routeOptions, handler);
    this.router.get(routeOptions, handler);

    // NP_TODO: Re-enable graphiql endpoint?
    // this.server.route({
    //   options: {
    //     tags: ['access:infra'],
    //   },
    //   handler: async (request: Request, h: ResponseToolkit) => {
    //     const graphiqlString = await GraphiQL.resolveGraphiQLString(
    //       request.query,
    //       (req: Legacy.Request) => ({
    //         endpointURL: req ? `${req.getBasePath()}${routePath}` : routePath,
    //         // passHeader: `'kbn-version': '${this.version}'`, // not sure this is necessary, removing for now
    //       }),
    //       request
    //     );

    //     return h.response(graphiqlString).type('text/html');
    //   },
    //   method: 'GET',
    //   path: routePath ? `${routePath}/graphiql` : '/graphiql',
    // });
  }

  // public registerRoute<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
  //   route: RouteConfig<P, Q, B>,
  //   handler: RequestHandler<P, Q, B>
  // ) {
  //   // NP_TODO: Our current routes all use POST, but we need to expand this,
  //   // but the types make it hell so I'm skipping for now
  //   this.router.post(
  //     {
  //       validate: VALIDATE_PLACEHOLDER,
  //       path: route.path,
  //     },
  //     route.handler
  //   );
  //   // this.legacyServer.route({
  //   //   handler: wrappedHandler,
  //   //   options: route.options,
  //   //   method: route.method,
  //   //   path: route.path,
  //   // });
  // }

  public async callWithRequest<Hit = {}, Aggregation = undefined>(
    request: KibanaRequest | Legacy.Request,
    endpoint: string,
    params: CallWithRequestParams,
    ...rest: Array<any>
  ) {
    const client = (await this.core.elasticsearch.dataClient$.pipe(first()).toPromise()).asScoped(
      request
    );

    // NP_TODO: mocking out uiSettings b/c I have no idea how to shim it woot
    const uiSettings = {
      get: (value: string) =>
        new Promise((resolve, reject) => {
          if (value === 'search:includeFrozen') {
            return resolve(false);
          }
          if (value === 'courier:maxConcurrentShardRequests') {
            return resolve(3);
          }
          return reject(new Error(`unknown ui setting key ${value}`));
        }),
    };

    const includeFrozen = (await uiSettings.get('search:includeFrozen')) as boolean; // NP_TODO when we get real uiSettings, remove casting as boolean!
    if (endpoint === 'msearch') {
      const maxConcurrentShardRequests = (await uiSettings.get(
        'courier:maxConcurrentShardRequests'
      )) as number; // NP_TODO when we get real uiSettings, remove casting as number!
      if (maxConcurrentShardRequests > 0) {
        params = { ...params, max_concurrent_shard_requests: maxConcurrentShardRequests };
      }
    }

    const frozenIndicesParams = ['search', 'msearch'].includes(endpoint)
      ? {
          ignore_throttled: !includeFrozen,
        }
      : {};

    const fields = await client.callAsCurrentUser(
      endpoint,
      {
        ...params,
        ...frozenIndicesParams,
      },
      ...rest
    );
    return fields as Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
  }

  public getIndexPatternsService(
    request: InfraFrameworkRequest<Legacy.Request>
  ): Legacy.IndexPatternsService {
    return this.plugins.indexPatterns.indexPatternsServiceFactory({
      callCluster: async (method: string, args: [GenericParams], ...rest: any[]) => {
        const fieldCaps = await this.callWithRequest(
          request[internalInfraFrameworkRequest],
          method,
          { ...args, allowNoIndices: true } as GenericParams,
          ...rest
        );
        return fieldCaps;
      },
    });
  }

  public getSpaceId(request: InfraFrameworkRequest): string {
    const spacesPlugin = this.plugins.spaces;

    if (spacesPlugin && typeof spacesPlugin.getSpaceId === 'function') {
      return spacesPlugin.getSpaceId(request[internalInfraFrameworkRequest]);
    } else {
      return 'default';
    }
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
