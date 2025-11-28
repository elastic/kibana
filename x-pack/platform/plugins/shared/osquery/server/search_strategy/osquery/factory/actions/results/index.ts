/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import type {
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
  OsqueryQueries,
} from '../../../../../../common/search_strategy/osquery';

import { inspectStringifyObject } from '../../../../../../common/utils/build_query';
import type { OsqueryFactory } from '../../types';
import { buildActionResultsQuery } from './query.action_results.dsl';

export const actionResults: OsqueryFactory<OsqueryQueries.actionResults> = {
  buildDsl: (options: ActionResultsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    // Ensure pagination defaults if not provided (match UI default pageSize: 20)
    const optionsWithDefaults = {
      ...options,
      pagination: options.pagination || {
        activePage: 0,
        cursorStart: 0,
        querySize: 20,
      },
    };

    return buildActionResultsQuery(optionsWithDefaults);
  },
  // @ts-expect-error update types
  parse: async (
    options,
    response: ActionResultsStrategyResponse
  ): Promise<ActionResultsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildActionResultsQuery(options))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
