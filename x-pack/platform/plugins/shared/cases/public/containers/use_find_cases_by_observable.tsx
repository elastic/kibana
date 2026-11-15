/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { FindCasesByObservableRequest } from '../../common/types/api';
import type { CasesByObservableResponseUI } from '../../common/ui/types';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { findCasesByObservable } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

/** One page of the cases holding an observable, or only their total with `perPage: 0`. */
export const useFindCasesByObservable = (
  params: FindCasesByObservableRequest,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<CasesByObservableResponseUI> => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.casesByObservable(params),
    ({ signal }) => findCasesByObservable(params, signal),
    {
      enabled,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
