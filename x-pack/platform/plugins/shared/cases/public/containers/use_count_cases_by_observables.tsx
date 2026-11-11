/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type {
  CountCasesByObservablesRequest,
  CountCasesByObservablesResponse,
} from '../../common/types/api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { countCasesByObservables } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

/** For each observable of a page, how many cases of the owner hold it. */
export const useCountCasesByObservables = (
  params: CountCasesByObservablesRequest,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<CountCasesByObservablesResponse> => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.casesByObservableCounts(params),
    ({ signal }) => countCasesByObservables(params, signal),
    {
      enabled: enabled && params.observables.length > 0,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
