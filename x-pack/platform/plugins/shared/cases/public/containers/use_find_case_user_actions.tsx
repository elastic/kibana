/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { CaseUserActionTypeWithAll, InternalFindCaseUserActions } from '../../common/ui/types';
import { findCaseUserActions } from './api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

interface UseFindCasesUserActionsParam {
  caseId: string;
  params: {
    type: CaseUserActionTypeWithAll;
    sortOrder: 'asc' | 'desc';
    page: number;
    perPage: number;
  };
  isEnabled: boolean;
}

/**
 * Iteratively fetches data for a list of caseIds.
 */
export const useFindCasesUserActions = (args: UseFindCasesUserActionsParam[]): UseQueryResult[] => {
  const { showErrorToast } = useCasesToast();

  return useQueries<Array<{ caseId: string } & InternalFindCaseUserActions>>({
    queries: args.map(({ caseId, params, isEnabled }) => ({
      queryKey: casesQueriesKeys.caseUserActions(caseId, params),
      queryFn: async ({ signal }) => {
        // Return an object that includes both the caseId and the response
        return { caseId, ...(await findCaseUserActions(caseId, params, signal)) };
      },
      enabled: isEnabled,
      onError: (error: unknown) => {
        if (error instanceof Error) {
          showErrorToast(error, { title: ERROR_TITLE });
        }
      },
    })),
  });
};

export const useFindCaseUserActions = (
  caseId: string,
  params: {
    type: CaseUserActionTypeWithAll;
    sortOrder: 'asc' | 'desc';
    page: number;
    perPage: number;
  },
  isEnabled: boolean
) => {
  const { showErrorToast } = useCasesToast();

  return useQuery<InternalFindCaseUserActions, ServerError>(
    casesQueriesKeys.caseUserActions(caseId, params),
    async ({ signal }) => findCaseUserActions(caseId, params, signal),
    {
      enabled: isEnabled,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: ERROR_TITLE });
      },
    }
  );
};

export type UseFindCaseUserActions = ReturnType<typeof useFindCaseUserActions>;
