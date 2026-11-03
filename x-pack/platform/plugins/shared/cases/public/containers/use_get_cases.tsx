/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { casesQueriesKeys, DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './constants';
import type { CasesFindResponseUI, FilterOptions, QueryParams } from './types';
import { useToasts } from '../common/lib/kibana';
import { isTopLevelAppEnabled } from '../common/top_level_app';
import * as i18n from './translations';
import { getCases } from './api';
import type { ServerError } from '../types';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../components/app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../utils/permissions';
import { getIncrementalIdSearchOverrides, parseExtendedFieldSearch } from './utils';

export const initialData: CasesFindResponseUI = {
  cases: [],
  countClosedCases: 0,
  countInProgressCases: 0,
  countOpenCases: 0,
  mttr: null,
  page: 0,
  perPage: 0,
  total: 0,
};

export const useGetCases = (
  params: {
    queryParams?: Partial<QueryParams>;
    filterOptions?: Partial<FilterOptions>;
  } = {}
): UseQueryResult<CasesFindResponseUI> => {
  const toasts = useToasts();
  const { owner } = useCasesContext();
  // The top-level app lists every case the user can read; ownerless embeds keep listing only the
  // owners the user can fully work with.
  const availableSolutions = useAvailableCasesOwners(
    isTopLevelAppEnabled() ? ['read'] : getAllPermissionsExceptFrom('delete')
  );

  // In the top-level app's world a host app's owner no longer scopes which cases a list shows.
  const hasOwner = !!owner.length && !isTopLevelAppEnabled();
  const initialOwner = hasOwner ? owner : availableSolutions;

  const ownerFilter =
    params.filterOptions?.owner != null && params.filterOptions.owner.length > 0
      ? { owner: params.filterOptions.owner }
      : { owner: initialOwner };

  const rawSearch = params.filterOptions?.search ?? '';

  // overrides for incremental_id search
  const overrides = getIncrementalIdSearchOverrides(rawSearch);

  const extendedFieldOverrides = (() => {
    if (Object.keys(overrides).length > 0) {
      return {};
    }
    const { extendedFieldFilters: parsedSearchFilters, freeText } =
      parseExtendedFieldSearch(rawSearch);
    if (parsedSearchFilters.length === 0) {
      return {};
    }
    const searchFilters = parsedSearchFilters.filter(({ value }) => value.length > 0);
    const pickerFilters = params.filterOptions?.extendedFieldFilters ?? [];
    const seen = new Set(
      pickerFilters.map((entry) => `${entry.label.toLowerCase()}\0${entry.value}`)
    );
    const merged = [
      ...pickerFilters,
      ...searchFilters.filter((entry) => {
        const key = `${entry.label.toLowerCase()}\0${entry.value}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      }),
    ];
    return { search: freeText, extendedFieldFilters: merged };
  })();

  return useQuery(
    // The owners come from the server in the top-level app, so they belong in the key.
    casesQueriesKeys.cases({ ...params, owner: ownerFilter.owner }),
    ({ signal }) => {
      return getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          ...(params.filterOptions ?? {}),
          ...ownerFilter,
          ...overrides,
          ...extendedFieldOverrides,
        },
        queryParams: {
          ...DEFAULT_QUERY_PARAMS,
          ...(params.queryParams ?? {}),
        },
        signal,
      });
    },
    {
      keepPreviousData: true,
      enabled: ownerFilter.owner.length > 0 || !isTopLevelAppEnabled(),
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
      },
    }
  );
};
