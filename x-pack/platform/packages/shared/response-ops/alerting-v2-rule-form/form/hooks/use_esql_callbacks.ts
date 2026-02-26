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
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';

export interface UseEsqlCallbacksParams {
  /** Application service for capabilities and navigation */
  application: ApplicationStart;
  /** HTTP service for API calls */
  http: HttpSetup;
  /** Search service for executing ES|QL queries */
  search: ISearchStart['search'];
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
}: UseEsqlCallbacksParams): ESQLCallbacks => {
  return useMemo<ESQLCallbacks>(
    () => ({
      getSources: async () => getESQLSources({ application, http }, undefined),
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) =>
        getEsqlColumns({ esqlQuery: query, search }),
    }),
    [application, http, search]
  );
};
