/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScheduledActionResultsRequestOptions,
  ScheduledActionResultsStrategyResponse,
  OsqueryQueries,
} from '../../../../../../common/search_strategy/osquery';

import { inspectStringifyObject } from '../../../../../../common/utils/build_query';
import type { OsqueryFactory } from '../../types';
import { buildScheduledActionResultsQuery } from './query.scheduled_action_results.dsl';

export const scheduledActionResults: OsqueryFactory<OsqueryQueries.scheduledActionResults> = {
  buildDsl: (options: ScheduledActionResultsRequestOptions) => {
    const optionsWithDefaults = {
      ...options,
      pagination: options.pagination || {
        activePage: 0,
        cursorStart: 0,
        querySize: 100,
      },
    };

    return buildScheduledActionResultsQuery(optionsWithDefaults);
  },
  parse: async (
    options: ScheduledActionResultsRequestOptions,
    response
  ): Promise<ScheduledActionResultsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildScheduledActionResultsQuery(options))],
    };

    return {
      ...(response as ScheduledActionResultsStrategyResponse),
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
