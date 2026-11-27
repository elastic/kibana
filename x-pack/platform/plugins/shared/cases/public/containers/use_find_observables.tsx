/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { FindObservablesRequest, FindObservablesResponse } from '../../common/types/api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { findObservables } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

/** One page of a case's observables, sorted and filtered on the server. */
export const useFindObservables = (
  caseId: string,
  params: FindObservablesRequest
): UseQueryResult<FindObservablesResponse> => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.caseObservables(caseId, params),
    ({ signal }) => findObservables(caseId, params, signal),
    {
      keepPreviousData: true,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
