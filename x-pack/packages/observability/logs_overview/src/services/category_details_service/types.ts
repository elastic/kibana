/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ISearchGeneric } from '@kbn/search-types';
import { type DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface LogCategoryDocument {
  row: Pick<DataTableRecord, 'flattened' | 'raw'>;
}

export interface LogCategoryDetailsParams {
  additionalFilters: QueryDslQueryContainer[];
  endTimestamp: string;
  index: string;
  messageField: string;
  startTimestamp: string;
  timeField: string;
  dataView: DataView;
}

export interface CategoryDetailsServiceDependencies {
  search: ISearchGeneric;
}

export type LogCategoryDocumentsParams = LogCategoryDetailsParams & { categoryTerms: string };
