/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { GraphQLSchema } from 'graphql';
import { Lifecycle } from 'hapi';
import { Legacy } from 'kibana';
import { JsonObject } from '../../../../common/typed_json';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';
import { KibanaRequest, RequestHandlerContext } from '../../../../../../../../src/core/server';

interface ApmIndices {
  'apm_oss.transactionIndices': string | undefined;
}

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
  apm: {
    getIndices: () => Promise<ApmIndices>;
  };
}

/* eslint-disable  @typescript-eslint/unified-signatures */
export interface InfraBackendFrameworkAdapter {
  plugins: InfraServerPluginDeps;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: 'search',
    options?: object
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;

  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: RequestHandlerContext,
    endpoint: 'msearch',
    options?: object
  ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'fieldCaps',
    options?: object
  ): Promise<InfraDatabaseFieldCapsResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'indices.existsAlias',
    options?: object
  ): Promise<boolean>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'indices.getAlias' | 'indices.get',
    options?: object
  ): Promise<InfraDatabaseGetIndicesResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: 'ml.getBuckets',
    options?: object
  ): Promise<InfraDatabaseGetIndicesResponse>;
  callWithRequest(
    requestContext: RequestHandlerContext,
    endpoint: string,
    options?: object
  ): Promise<InfraDatabaseSearchResponse>;

  getIndexPatternsService(requestContext: RequestHandlerContext): Legacy.IndexPatternsService;
  getSpaceId(requestContext: RequestHandlerContext): string;
  makeTSVBRequest(
    req: KibanaRequest,
    model: TSVBMetricModel,
    timerange: { min: number; max: number },
    filters: JsonObject[]
  ): Promise<InfraTSVBResponse>;
}
export type InfraResponse = Lifecycle.ReturnValue;

export interface InfraFrameworkPluginOptions {
  register: any;
  options: any;
}

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
