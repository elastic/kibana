/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient, useMutation } from '@kbn/react-query';
import * as i18n from './translations';
import { getCase, updateCases } from './api';
import type { CaseUpdateRequest, CasesUI } from './types';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { casesQueriesKeys, casesMutationsKeys } from './constants';
import { rebaseCaseMutationOnConflict } from './conflict_rebase';

interface MutationArgs {
  cases: CaseUpdateRequest[];
  successToasterTitle: string;
  originalCases: CasesUI;
}

/**
 * Executes bulk case updates and retries once on version conflicts caused only by
 * system-managed field drift.
 *
 * `cases` is the minimal patch payload sent to the API. `originalCases` is the
 * pre-update snapshot used to decide whether a 409 can be safely rebased with
 * fresh versions. `originalCases` may be a superset of `cases` when unchanged
 * selected cases are filtered out before the request; only matching ids are used
 * for the rebase check.
 */
export const useUpdateCases = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation(
    (request: MutationArgs) =>
      rebaseCaseMutationOnConflict({
        request,
        staleCases: request.originalCases.filter(({ id }) =>
          request.cases.some((caseToUpdate) => caseToUpdate.id === id)
        ),
        executeRequest: ({ cases }) => updateCases({ cases }),
        fetchLatestCase: (caseId) => getCase({ caseId }),
        buildRetryRequest: ({ request: retryRequest, latestCases }) => ({
          ...retryRequest,
          cases: retryRequest.cases.map((theCase) => ({
            ...theCase,
            version: latestCases.get(theCase.id)?.version ?? theCase.version,
          })),
        }),
      }),
    {
      mutationKey: casesMutationsKeys.updateCases,
      onSuccess: (_, { successToasterTitle }) => {
        queryClient.invalidateQueries(casesQueriesKeys.casesList());
        queryClient.invalidateQueries(casesQueriesKeys.tags());
        queryClient.invalidateQueries(casesQueriesKeys.userProfiles());

        showSuccessToast(successToasterTitle);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_UPDATING });
      },
    }
  );
};

export type UseUpdateCases = ReturnType<typeof useUpdateCases>;
