/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { CPSPluginStart } from '@kbn/cps/public';
import { getESQLSources, getEsqlColumns, getDatasets, getViews } from '@kbn/esql-utils';
import { getRuleProjectRouting } from '../../utils/get_rule_project_routing';

export interface UseEsqlCallbacksParams {
  /** Application service for capabilities and navigation */
  application: ApplicationStart;
  /** HTTP service for API calls */
  http: HttpSetup;
  /** Search service for executing ES|QL queries */
  search: ISearchStart['search'];
  /** CPS service, used to run the lookups with the rule project routing */
  cps?: CPSPluginStart;
  /** Rule query, used to read its `SET project_routing` for the sources lookup */
  query?: string;
}

/**
 * Hook that creates ES|QL callbacks for autocomplete functionality.
 *
 * These callbacks are used by the YAML rule editor to provide
 * autocomplete suggestions for ES|QL queries.
 *
 * @example
 * ```tsx
 * const esqlCallbacks = useEsqlCallbacks({
 *   application,
 *   http,
 *   search: data.search.search,
 * });
 *
 * return <YamlEditor esqlCallbacks={esqlCallbacks} />;
 * ```
 */
export const useEsqlCallbacks = ({
  application,
  http,
  search,
  cps,
  query,
}: UseEsqlCallbacksParams): ESQLCallbacks => {
  // getSources doesn't receive the query, so read its routing from the rule query
  const sourcesProjectRouting = useMemo(
    () => getRuleProjectRouting(query ?? '', cps),
    [query, cps]
  );

  return useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () =>
        getESQLSources(
          { application, http },
          undefined,
          undefined,
          undefined,
          sourcesProjectRouting
        ),
      getColumnsFor: async ({ query: columnsQuery }: { query?: string } | undefined = {}) =>
        getEsqlColumns({
          esqlQuery: columnsQuery,
          search,
          projectRouting: getRuleProjectRouting(columnsQuery ?? '', cps),
        }),
      getDatasets: async () => getDatasets(http),
      getViews: async () => getViews(http),
    }),
    [application, http, search, cps, sourcesProjectRouting]
  );
};
