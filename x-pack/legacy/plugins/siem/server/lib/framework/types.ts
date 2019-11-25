/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndicesGetMappingParams } from 'elasticsearch';
import { GraphQLSchema } from 'graphql';
import { RequestAuth } from 'hapi';

import { RequestHandlerContext } from 'src/core/server';
import { ESQuery } from '../../../common/typed_json';
import {
  PaginationInput,
  PaginationInputPaginated,
  SortField,
  SourceConfiguration,
  TimerangeInput,
} from '../../graphql/types';
import { RequestFacade } from '../../types';

export * from '../../utils/typed_resolvers';

export const internalFrameworkRequest = Symbol('internalFrameworkRequest');

export interface FrameworkAdapter {
  version: string;
  registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: FrameworkRequest,
    method: 'search',
    options?: object
  ): Promise<DatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: FrameworkRequest,
    method: 'msearch',
    options?: object
  ): Promise<DatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    req: FrameworkRequest,
    method: 'indices.getMapping',
    options?: IndicesGetMappingParams // eslint-disable-line
  ): Promise<MappingResponse>;
  getIndexPatternsService(req: FrameworkRequest): FrameworkIndexPatternsService;
}

export interface FrameworkRequest<InternalRequest extends WrappableRequest = RequestFacade> {
  [internalFrameworkRequest]: InternalRequest;
  context: RequestHandlerContext;
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
  auth: InternalRequest['auth'];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WrappableRequest<Payload = any, Params = any, Query = any> {
  payload: Payload;
  params: Params;
  query: Query;
  auth: RequestAuth;
}

export interface DatabaseResponse {
  took: number;
  timeout: boolean;
}

export interface DatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends DatabaseResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: number;
    hits: Hit[];
  };
}

export interface DatabaseMultiResponse<Hit, Aggregation> extends DatabaseResponse {
  responses: Array<DatabaseSearchResponse<Hit, Aggregation>>;
}

export interface MappingProperties {
  type: string;
  path: string;
  ignore_above: number;
  properties: Readonly<Record<string, Partial<MappingProperties>>>;
}

export interface MappingResponse {
  [indexName: string]: {
    mappings: {
      _meta: {
        beat: string;
        version: string;
      };
      dynamic_templates: object[];
      date_detection: boolean;
      properties: Readonly<Record<string, Partial<MappingProperties>>>;
    };
  };
}

interface FrameworkIndexFieldDescriptor {
  aggregatable: boolean;
  esTypes: string[];
  name: string;
  readFromDocValues: boolean;
  searchable: boolean;
  type: string;
}

export interface FrameworkIndexPatternsService {
  getFieldsForWildcard(options: {
    pattern: string | string[];
  }): Promise<FrameworkIndexFieldDescriptor[]>;
}

export interface RequestBasicOptions {
  sourceConfiguration: SourceConfiguration;
  timerange: TimerangeInput;
  filterQuery: ESQuery | undefined;
  defaultIndex: string[];
}

export interface RequestOptions extends RequestBasicOptions {
  pagination: PaginationInput;
  fields: readonly string[];
  sortField?: SortField;
}

export interface RequestOptionsPaginated extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
  fields: readonly string[];
  sortField?: SortField;
}
