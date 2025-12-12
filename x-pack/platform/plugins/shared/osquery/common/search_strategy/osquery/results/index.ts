/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse, SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { IEsSearchResponse } from '@kbn/search-types';

import type { Inspect, Maybe, SortField } from '../../common';
import type { RequestOptionsPaginated } from '../..';

export type ResultEdges = SearchResponse<unknown>['hits']['hits'];

export interface ResultsStrategyResponse extends IEsSearchResponse {
  edges: ResultEdges;
  inspect?: Maybe<Inspect>;
  pitId?: string;
  searchAfter?: SortResults;
  hasMore?: boolean;
}

export interface ResultsRequestOptions extends Omit<RequestOptionsPaginated, 'sort'> {
  actionId: string;
  agentId?: string;
  startDate?: string;
  sort: SortField[];
  integrationNamespaces?: string[];
  pitId?: string;
  searchAfter?: SortResults;
}
