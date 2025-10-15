/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type {
  ResultsStrategyResponse,
  ResultsRequestOptions,
  OsqueryQueries,
} from '../../../../../common/search_strategy/osquery';
import { inspectStringifyObject } from '../../../../../common/utils/build_query';
import type { OsqueryFactory } from '../types';
import { buildResultsQuery } from './query.all_results.dsl';

export const allResults: OsqueryFactory<OsqueryQueries.results> = {
  buildDsl: (options: ResultsRequestOptions) => {
    return buildResultsQuery(options);
  },
  parse: async (
    options: ResultsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<ResultsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildResultsQuery(options))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
