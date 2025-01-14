/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { casesQueriesKeys, DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './constants';
import type { CasesFindResponseUI, FilterOptions, QueryParams } from './types';
import { useToasts } from '../common/lib/kibana';
import * as i18n from './translations';
import { getCases } from './api';
import type { ServerError } from '../types';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../components/app/use_available_owners';
import { getAllPermissionsExceptFrom } from '../utils/permissions';

export const initialData: CasesFindResponseUI = {
  cases: [],
  countClosedCases: 0,
  countInProgressCases: 0,
  countOpenCases: 0,
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
  const availableSolutions = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));

  const hasOwner = !!owner.length;
  const initialOwner = hasOwner ? owner : availableSolutions;

  const ownerFilter =
    params.filterOptions?.owner != null && params.filterOptions.owner.length > 0
      ? { owner: params.filterOptions.owner }
      : { owner: initialOwner };

  return useQuery(
    casesQueriesKeys.cases(params),
    ({ signal }) => {
      return getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          ...(params.filterOptions ?? {}),
          ...ownerFilter,
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
