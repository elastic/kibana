/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/array-type */

import { GenericParams } from 'elasticsearch';
import { GraphQLSchema } from 'graphql';
import { Legacy } from 'kibana';
import { runHttpQuery } from 'apollo-server-core';
import { schema, TypeOf, ObjectType } from '@kbn/config-schema';
import {
  InfraRouteConfig,
  InfraTSVBResponse,
  InfraServerPluginDeps,
  CallWithRequestParams,
  InfraDatabaseSearchResponse,
  InfraDatabaseMultiResponse,
  InfraDatabaseFieldCapsResponse,
  InfraDatabaseGetIndicesResponse,
  InfraDatabaseGetIndicesAliasResponse,
} from './adapter_types';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';
import {
  CoreSetup,
  IRouter,
  KibanaRequest,
  RequestHandlerContext,
  KibanaResponseFactory,
  RouteMethod,
} from '../../../../../../../../src/core/server';
import { RequestHandler } from '../../../../../../../../src/core/server';
import { InfraConfig } from '../../../../../../../plugins/infra/server';

export class KibanaFramework {
  public router: IRouter;
  public plugins: InfraServerPluginDeps;

  constructor(core: CoreSetup, config: InfraConfig, plugins: InfraServerPluginDeps) {
    this.router = core.http.createRouter();
    this.plugins = plugins;
  }

  public registerRoute<
    params extends ObjectType = any,
    query extends ObjectType = any,
    body extends ObjectType = any,
    method extends RouteMethod = any
  >(
    config: InfraRouteConfig<params, query, body, method>,
    handler: RequestHandler<params, query, body>
  ) {
    const defaultOptions = {
      tags: ['access:infra'],
    };
    const routeConfig = {
      path: config.path,
      validate: config.validate,
      // Currently we have no use of custom options beyond tags, this can be extended
      // beyond defaultOptions if it's needed.
      options: defaultOptions,
    };
    switch (config.method) {
      case 'get':
        this.router.get(routeConfig, handler);
        break;
      case 'post':
        this.router.post(routeConfig, handler);
        break;
      case 'delete':
        this.router.delete(routeConfig, handler);
        break;
      case 'put':
        this.router.put(routeConfig, handler);
        break;
    }
  }

  public registerGraphQLEndpoint(routePath: string, gqlSchema: GraphQLSchema) {
    // These endpoints are validated by GraphQL at runtime and with GraphQL generated types
    const body = schema.object({}, { allowUnknowns: true });
    type Body = TypeOf<typeof body>;

    const routeOptions = {
      path: `/api/infra${routePath}`,
      validate: {
        body,
      },
      options: {
        tags: ['access:infra'],
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

        const gqlResponse = await runHttpQuery([context, request], {
          method: request.route.method.toUpperCase(),
          options: (req: RequestHandlerContext, rawReq: KibanaRequest) => ({
            context: { req, rawReq },
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
        const errorBody = {
          message: error.message,
        };

        if ('HttpQueryError' !== error.name) {
          return response.internalError({
            body: errorBody,
          });
        }

        if (error.isGraphQLError === true) {
          return response.customError({
            statusCode: error.statusCode,
            body: errorBody,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        const { headers = [], statusCode = 500 } = error;
        return response.customError({
          statusCode,
          headers,
          body: errorBody,
        });
      }
    }
    this.router.post(routeOptions, handler);
    this.router.get(routeOptions, handler);
  }

  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: 'search',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: 'msearch',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'fieldCaps',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseFieldCapsResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'indices.existsAlias',
    options?: CallWithRequestParams
  ): Promise<boolean>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    method: 'indices.getAlias',
    options?: object
  ): Promise<InfraDatabaseGetIndicesAliasResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    method: 'indices.get' | 'ml.getBuckets',
    options?: object
  ): Promise<InfraDatabaseGetIndicesResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: string,
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse>;

  public async callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: string,
    params: CallWithRequestParams
  ) {
    const { elasticsearch, uiSettings } = requestContext.core;

    const includeFrozen = await uiSettings.client.get('search:includeFrozen');
    if (endpoint === 'msearch') {
      const maxConcurrentShardRequests = await uiSettings.client.get(
        'courier:maxConcurrentShardRequests'
      );
      if (maxConcurrentShardRequests > 0) {
        params = { ...params, max_concurrent_shard_requests: maxConcurrentShardRequests };
      }
    }

    const frozenIndicesParams = ['search', 'msearch'].includes(endpoint)
      ? {
          ignore_throttled: !includeFrozen,
        }
      : {};

    return elasticsearch.dataClient.callAsCurrentUser(endpoint, {
      ...params,
      ...frozenIndicesParams,
    });
  }

  public getIndexPatternsService(
    requestContext: RequestHandlerContext
  ): Legacy.IndexPatternsService {
    return this.plugins.indexPatterns.indexPatternsServiceFactory({
      callCluster: async (method: string, args: [GenericParams], ...rest: any[]) => {
        const fieldCaps = await this.callWithRequest(requestContext, method, {
          ...args,
          allowNoIndices: true,
        } as GenericParams);
        return fieldCaps;
      },
    });
  }

  public getSpaceId(request: KibanaRequest): string {
    const spacesPlugin = this.plugins.spaces;

    if (
      spacesPlugin &&
      spacesPlugin.spacesService &&
      typeof spacesPlugin.spacesService.getSpaceId === 'function'
    ) {
      return spacesPlugin.spacesService.getSpaceId(request);
    } else {
      return 'default';
    }
  }

  public async makeTSVBRequest(
    requestContext: RequestHandlerContext,
    model: TSVBMetricModel,
    timerange: { min: number; max: number },
    filters: any[]
  ): Promise<InfraTSVBResponse> {
    const { getVisData } = this.plugins.metrics;
    if (typeof getVisData !== 'function') {
      throw new Error('TSVB is not available');
    }
    const options = {
      timerange,
      panels: [model],
      filters,
    };
    return getVisData(requestContext, options);
  }
}
