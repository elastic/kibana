/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ISearchGeneric } from '@kbn/search-types';

export interface CategorizeLogsServiceDependencies {
  search: ISearchGeneric;
}

export interface LogCategorizationParams {
  documentFilters: QueryDslQueryContainer[];
  endTimestamp: string;
  index: string;
  messageField: string;
  startTimestamp: string;
  timeField: string;
}
