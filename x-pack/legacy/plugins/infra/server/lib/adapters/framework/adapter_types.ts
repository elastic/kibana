/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse, GenericParams } from 'elasticsearch';
import { Lifecycle } from 'hapi';
import { ObjectType } from '@kbn/config-schema';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { RouteMethod, RouteConfig } from '../../../../../../../../src/core/server';
import { APMPluginContract } from '../../../../../../../plugins/apm/server';

// NP_TODO: Compose real types from plugins we depend on, no "any"
export interface InfraServerPluginDeps {
  usageCollection: UsageCollectionSetup;
  spaces: any;
  metrics: {
    getVisData: any;
  };
  indexPatterns: {
    indexPatternsServiceFactory: any;
  };
  features: any;
  apm: APMPluginContract;
  ___legacy: any;
}

export interface CallWithRequestParams extends GenericParams {
  max_concurrent_shard_requests?: number;
  name?: string;
  index?: string | string[];
  ignore_unavailable?: boolean;
  allow_no_indices?: boolean;
  size?: number;
  terminate_after?: number;
  fields?: string | string[];
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
  indices: string[];
  fields: InfraFieldsResponse;
}

export interface InfraDatabaseGetIndicesAliasResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
  };
}

export interface InfraDatabaseGetIndicesResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
    mappings: {
      _meta: object;
      dynamic_templates: any[];
      date_detection: boolean;
      properties: {
        [fieldName: string]: any;
      };
    };
    settings: { index: object };
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

export type InfraRouteConfig<
  params extends ObjectType,
  query extends ObjectType,
  body extends ObjectType,
  method extends RouteMethod
> = {
  method: RouteMethod;
} & RouteConfig<params, query, body, method>;
