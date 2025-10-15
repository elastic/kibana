/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type {
  ActionsStrategyResponse,
  ActionsRequestOptions,
  OsqueryQueries,
} from '../../../../../../common/search_strategy/osquery';
import { inspectStringifyObject } from '../../../../../../common/utils/build_query';
import type { OsqueryFactory } from '../../types';
import { buildActionsQuery } from './query.all_actions.dsl';

export const allActions: OsqueryFactory<OsqueryQueries.actions> = {
  buildDsl: (options: ActionsRequestOptions) => {
    return buildActionsQuery(options);
  },
  parse: async (
    options: ActionsRequestOptions,
    response: IEsSearchResponse<object>
  ): Promise<ActionsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildActionsQuery(options))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
