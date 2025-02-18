/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TransportRequestParams } from '@elastic/elasticsearch';
import { CoreSetup, IRouter, RouteMethod } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import type {
  LogsSharedPluginRequestHandlerContext,
  LogsSharedServerPluginSetupDeps,
  LogsSharedServerPluginStartDeps,
} from '../../../types';
import {
  CallWithRequestParams,
  LogsSharedDatabaseGetIndicesAliasResponse,
  LogsSharedDatabaseGetIndicesResponse,
  LogsSharedDatabaseMultiResponse,
  LogsSharedDatabaseSearchResponse,
  LogsSharedVersionedRouteConfig,
} from './adapter_types';

interface FrozenIndexParams {
  ignore_throttled?: boolean;
}

export class KibanaFramework {
  public router: IRouter;
  public plugins: LogsSharedServerPluginSetupDeps;

  constructor(
    core: CoreSetup<LogsSharedServerPluginStartDeps>,
    plugins: LogsSharedServerPluginSetupDeps
  ) {
    this.router = core.http.createRouter();
    this.plugins = plugins;
  }

  public registerVersionedRoute<Method extends RouteMethod = any>(
    config: LogsSharedVersionedRouteConfig<Method>
  ) {
    const routeConfig = {
      access: config.access,
      path: config.path,
      security: {
        authz: {
          requiredPrivileges: ['infra'],
        },
      },
    };
    switch (config.method) {
      case 'get':
        return this.router.versioned.get(routeConfig);
      case 'post':
        return this.router.versioned.post(routeConfig);
      case 'delete':
        return this.router.versioned.delete(routeConfig);
      case 'put':
        return this.router.versioned.put(routeConfig);
      case 'patch':
        return this.router.versioned.patch(routeConfig);
      default:
        throw new RangeError(
          `#registerVersionedRoute: "${config.method}" is not an accepted method`
        );
    }
  }

  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: LogsSharedPluginRequestHandlerContext,
    endpoint: 'search',
    options?: CallWithRequestParams
  ): Promise<LogsSharedDatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: LogsSharedPluginRequestHandlerContext,
    endpoint: 'msearch',
    options?: CallWithRequestParams
  ): Promise<LogsSharedDatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    requestContext: LogsSharedPluginRequestHandlerContext,
    endpoint: 'indices.existsAlias',
    options?: CallWithRequestParams
  ): Promise<boolean>;
  callWithRequest(
    requestContext: LogsSharedPluginRequestHandlerContext,
    method: 'indices.getAlias',
    options?: object
  ): Promise<LogsSharedDatabaseGetIndicesAliasResponse>;
  callWithRequest(
    requestContext: LogsSharedPluginRequestHandlerContext,
    method: 'indices.get' | 'ml.getBuckets',
    options?: object
  ): Promise<LogsSharedDatabaseGetIndicesResponse>;
  callWithRequest(
    requestContext: LogsSharedPluginRequestHandlerContext,
    method: 'transport.request',
    options?: CallWithRequestParams
  ): Promise<unknown>;
  callWithRequest(
    requestContext: LogsSharedPluginRequestHandlerContext,
    endpoint: string,
    options?: CallWithRequestParams
  ): Promise<LogsSharedDatabaseSearchResponse>;
  public async callWithRequest(
    requestContext: LogsSharedPluginRequestHandlerContext,
    endpoint: string,
    params: CallWithRequestParams
  ) {
    const { elasticsearch, uiSettings } = await requestContext.core;

    const includeFrozen = await uiSettings.client.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
    if (endpoint === 'msearch') {
      const maxConcurrentShardRequests = await uiSettings.client.get(
        UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
      );
      if (maxConcurrentShardRequests > 0) {
        params = { ...params, max_concurrent_shard_requests: maxConcurrentShardRequests };
      }
    }

    // Only set the "ignore_throttled" value (to false) if the Kibana setting
    // for "search:includeFrozen" is true (i.e. don't ignore throttled indices, a triple negative!)
    // More information:
    // - https://github.com/elastic/kibana/issues/113197
    // - https://github.com/elastic/elasticsearch/pull/77479
    //
    // NOTE: these params only need to be spread onto the search and msearch calls below
    const frozenIndicesParams: FrozenIndexParams = {};
    if (includeFrozen) {
      frozenIndicesParams.ignore_throttled = false;
    }

    let apiResult;
    switch (endpoint) {
      case 'search':
        apiResult = elasticsearch.client.asCurrentUser.search({
          ...params,
          ...frozenIndicesParams,
        });
        break;
      case 'msearch':
        apiResult = elasticsearch.client.asCurrentUser.msearch({
          ...params,
          ...frozenIndicesParams,
        } as estypes.MsearchRequest);
        break;
      case 'indices.existsAlias':
        apiResult = elasticsearch.client.asCurrentUser.indices.existsAlias({
          ...params,
        } as estypes.IndicesExistsAliasRequest);
        break;
      case 'indices.getAlias':
        apiResult = elasticsearch.client.asCurrentUser.indices.getAlias({
          ...params,
        });
        break;
      case 'indices.get':
        apiResult = elasticsearch.client.asCurrentUser.indices.get({
          ...params,
        } as estypes.IndicesGetRequest);
        break;
      case 'transport.request':
        apiResult = elasticsearch.client.asCurrentUser.transport.request({
          ...params,
        } as TransportRequestParams);
        break;
      case 'ml.getBuckets':
        apiResult = elasticsearch.client.asCurrentUser.ml.getBuckets({
          ...params,
        } as estypes.MlGetBucketsRequest);
        break;
    }
    return apiResult ? await apiResult : undefined;
  }
}
