/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { GraphQLSchema } from 'graphql';
import { Lifecycle, ResponseToolkit, RouteOptions } from 'hapi';
import { Legacy } from 'kibana';
import { JsonObject } from '../../../../common/typed_json';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';
import { KibanaRequest, RequestHandlerContext } from '../../../../../../../../src/core/server';

export const internalInfraFrameworkRequest = Symbol('internalInfraFrameworkRequest');

// NP_TODO: Compose real types from plugins we depend on, no "any"
export interface InfraServerPluginDeps {
  spaces: any;
  metrics: {
    getVisData: any;
  };
  indexPatterns: {
    indexPatternsServiceFactory: any;
  };
  savedObjects: any;
  features: any;
}

/* eslint-disable  @typescript-eslint/unified-signatures */
export interface InfraBackendFrameworkAdapter<R = unknown> {
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
  // callWithRequest<Hit = {}, Aggregation = undefined>(
  //   requestContext: RequestHandlerContext,
  //   method: 'search',
  //   options?: object
  // ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
  // callWithRequest<Hit = {}, Aggregation = undefined>(
  //   req: InfraFrameworkRequest,
  //   method: 'msearch',
  //   options?: object
  // ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
  // callWithRequest(
  //   req: InfraFrameworkRequest,
  //   method: 'fieldCaps',
  //   options?: object
  // ): Promise<InfraDatabaseFieldCapsResponse>;
  // callWithRequest(
  //   req: InfraFrameworkRequest,
  //   method: 'indices.existsAlias',
  //   options?: object
  // ): Promise<boolean>;
  // callWithRequest(
  //   req: InfraFrameworkRequest,
  //   method: 'indices.getAlias' | 'indices.get',
  //   options?: object
  // ): Promise<InfraDatabaseGetIndicesResponse>;
  // callWithRequest(
  //   req: InfraFrameworkRequest,
  //   method: 'ml.getBuckets',
  //   options?: object
  // ): Promise<InfraDatabaseGetIndicesResponse>;
  // callWithRequest(
  //   req: InfraFrameworkRequest,
  //   method: string,
  //   options?: object
  // ): Promise<InfraDatabaseSearchResponse>;

  // NP_TODO: using Promise<unknown> here until new platform callAsCurrentUser can return types
  callWithRequest(
    requestContext: RequestHandlerContext,
    method: string,
    options?: object
  ): Promise<unknown>;

  getIndexPatternsService(requestContext: RequestHandlerContext): Legacy.IndexPatternsService;
  getSpaceId(requestContext: RequestHandlerContext): string;
  makeTSVBRequest(
    req: KibanaRequest,
    model: TSVBMetricModel,
    timerange: { min: number; max: number },
    filters: JsonObject[]
  ): Promise<InfraTSVBResponse>;
}
/* eslint-enable  @typescript-eslint/unified-signatures */

export interface InfraFrameworkRequest<
  InternalRequest extends InfraWrappableRequest = InfraWrappableRequest
> {
  [internalInfraFrameworkRequest]: InternalRequest;
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
}

export interface InfraWrappableRequest<Payload = any, Params = any, Query = any> {
  payload: Payload;
  params: Params;
  query: Query;
}

export type InfraResponse = Lifecycle.ReturnValue;

export interface InfraFrameworkPluginOptions {
  register: any;
  options: any;
}

export interface InfraFrameworkRouteOptions<
  RouteRequest extends InfraWrappableRequest,
  RouteResponse extends InfraResponse
> {
  path: string;
  method: string | string[];
  vhost?: string;
  handler: InfraFrameworkRouteHandler<RouteRequest, RouteResponse>;
  options?: Pick<RouteOptions, Exclude<keyof RouteOptions, 'handler'>>;
}

export type InfraFrameworkRouteHandler<
  RouteRequest extends InfraWrappableRequest,
  RouteResponse extends InfraResponse
> = (request: InfraFrameworkRequest<RouteRequest>, h: ResponseToolkit) => RouteResponse;

export interface InfraDatabaseResponse {
  took: number;
  timeout: boolean;
}

export interface InfraDatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends InfraDatabaseResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export interface InfraDatabaseMultiResponse<Hit, Aggregation> extends InfraDatabaseResponse {
  responses: Array<InfraDatabaseSearchResponse<Hit, Aggregation>>;
}

export interface InfraDatabaseFieldCapsResponse extends InfraDatabaseResponse {
  fields: InfraFieldsResponse;
}

export interface InfraDatabaseGetIndicesResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
  };
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

export interface SortedSearchHit extends SearchHit {
  sort: any[];
  _source: {
    [field: string]: any;
  };
}

export type InfraDateRangeAggregationBucket<NestedAggregation extends object = {}> = {
  from?: number;
  to?: number;
  doc_count: number;
  key: string;
} & NestedAggregation;

export interface InfraDateRangeAggregationResponse<NestedAggregation extends object = {}> {
  buckets: Array<InfraDateRangeAggregationBucket<NestedAggregation>>;
}

export interface InfraTopHitsAggregationResponse {
  hits: {
    hits: [];
  };
}

export interface InfraMetadataAggregationBucket {
  key: string;
}

export interface InfraMetadataAggregationResponse {
  buckets: InfraMetadataAggregationBucket[];
}

export interface InfraFieldsResponse {
  [name: string]: InfraFieldDef;
}

export interface InfraFieldDetails {
  searchable: boolean;
  aggregatable: boolean;
  type: string;
}

export interface InfraFieldDef {
  [type: string]: InfraFieldDetails;
}

export interface InfraTSVBResponse {
  [key: string]: InfraTSVBPanel;
}

export interface InfraTSVBPanel {
  id: string;
  series: InfraTSVBSeries[];
}

export interface InfraTSVBSeries {
  id: string;
  label: string;
  data: InfraTSVBDataPoint[];
}

export type InfraTSVBDataPoint = [number, number];
