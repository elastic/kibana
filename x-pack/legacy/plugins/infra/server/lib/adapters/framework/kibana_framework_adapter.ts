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
import { schema, TypeOf } from '@kbn/config-schema';
import {
  InfraTSVBResponse,
  InfraServerPluginDeps,
  CallWithRequestParams,
  InfraDatabaseSearchResponse,
  InfraDatabaseMultiResponse,
  InfraDatabaseFieldCapsResponse,
  InfraDatabaseGetIndicesResponse,
} from './adapter_types';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';
import {
  CoreSetup,
  IRouter,
  KibanaRequest,
  RequestHandlerContext,
  KibanaResponseFactory,
} from '../../../../../../../../src/core/server';
import { InfraConfig } from '../../../../../../../plugins/infra/server';

// const anyObject = schema.object({}, { allowUnknowns: true });

// type AnyObject = typeof anyObject;

// interface BasicRoute<
//   P extends ObjectType = AnyObject,
//   Q extends ObjectType = AnyObject,
//   B extends ObjectType = AnyObject
// > {
//   method: 'get' | 'put' | 'post' | 'delete';
//   path: string;
//   handler: RequestHandler<P, Q, B>;
//   options?: any;
// }

export class KibanaFramework {
  public router: IRouter;
  private core: CoreSetup;
  public plugins: InfraServerPluginDeps;

  constructor(core: CoreSetup, config: InfraConfig, plugins: InfraServerPluginDeps) {
    this.router = core.http.createRouter();
    this.core = core;
    this.plugins = plugins;
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
          options: (req: Legacy.Request) => ({
            context: { req },
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

        // NP_TODO: Do we still need to re-throw this error in this case? if we do, can we
        // still call the response.customError method to control the HTTP response?
        // throw error;
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
    endpoint: 'indices.getAlias' | 'indices.get' | 'ml.getBuckets',
    options?: CallWithRequestParams
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

  // NP_TODO: Does this function still work with legacy getSpaceId(requestContext)?
  // When can we switch to NP plugin for spaces, with associated exported types???
  public getSpaceId(requestContext: RequestHandlerContext): string {
    const spacesPlugin = this.plugins.spaces;

    if (spacesPlugin && typeof spacesPlugin.getSpaceId === 'function') {
      return spacesPlugin.getSpaceId(requestContext);
    } else {
      return 'default';
    }
  }

  // NP_TODO: This method needs to no longer require full KibanaRequest
  public async makeTSVBRequest(
    request: KibanaRequest,
    model: TSVBMetricModel,
    timerange: { min: number; max: number },
    filters: any[],
    requestContext: RequestHandlerContext
  ): Promise<InfraTSVBResponse> {
    const { getVisData } = this.plugins.metrics;
    if (typeof getVisData !== 'function') {
      throw new Error('TSVB is not available');
    }
    const url = this.core.http.basePath.prepend('/api/metrics/vis/data');
    // For the following request we need a copy of the instnace of the internal request
    // but modified for our TSVB request. This will ensure all the instance methods
    // are available along with our overriden values
    const requestCopy = Object.assign(request, {
      url,
      method: 'POST',
      payload: {
        timerange,
        panels: [model],
        filters,
      },
      // NP_NOTE: [TSVB_GROUP] Huge hack to make TSVB (getVisData()) work with raw requests that
      // originate from the New Platform router (and are very different to the old request object).
      // Once TSVB has migrated over to NP, and can work with the new raw requests, or ideally just
      // the requestContext, this can be removed.
      server: {
        plugins: {
          elasticsearch: this.plugins.___legacy.tsvb.elasticsearch,
        },
        newPlatform: {
          __internals: this.plugins.___legacy.tsvb.__internals,
        },
      },
      getUiSettingsService: () => requestContext.core.uiSettings.client,
      getSavedObjectsClient: () => requestContext.core.savedObjects.client,
    });
    return getVisData(requestCopy);
  }
}
