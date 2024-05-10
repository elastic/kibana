/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { FieldValuePair } from '@kbn/ml-agg-utils';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getRangeQuery } from './get_range_query';

export const getTermsQuery = ({ fieldName, fieldValue }: FieldValuePair) => {
  return { term: { [fieldName]: fieldValue } };
};

interface QueryParams {
  params: AiopsLogRateAnalysisSchema<'2'>;
  termFilters?: FieldValuePair[];
  filter?: estypes.QueryDslQueryContainer;
  skipRangeQuery?: boolean;
}
export const getQueryWithParams = ({
  params,
  termFilters,
  filter,
  skipRangeQuery = false,
}: QueryParams): estypes.QueryDslQueryContainer => {
  const searchQuery = JSON.parse(params.searchQuery) as estypes.QueryDslQueryContainer;
  return {
    bool: {
      filter: [
        // Add `searchQuery` if it's not a `match_all` query
        ...(searchQuery.match_all === undefined ? [searchQuery] : []),

        // Add a range query based on `start/end` for the `timeFieldName`, check for skip flag.
        ...(!skipRangeQuery ? [getRangeQuery(params.start, params.end, params.timeFieldName)] : []),

        // Add optional term filters
        ...(Array.isArray(termFilters) ? termFilters.map(getTermsQuery) : []),

        // Add other optional filters
        ...(filter ? [filter] : []),
      ],
    },
  };
};
