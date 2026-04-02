/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient, useMutation } from '@kbn/react-query';
import type { ToastInputFields } from '@kbn/core/public';
import * as i18n from './translations';
import { updateCases } from './api';
import type { UpdateSummary } from '../../common/types/api';
import type { CaseUpdateRequest } from './types';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { casesQueriesKeys, casesMutationsKeys } from './constants';

interface MutationArgs {
  cases: CaseUpdateRequest[];
  successToasterTitle?: string;
  getUpdateSuccessToast?: (args: { updateSummary?: UpdateSummary[] }) => {
    title: string;
    text?: ToastInputFields['text'];
  };
}

export const useUpdateCases = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation(({ cases }: MutationArgs) => updateCases({ cases }), {
    mutationKey: casesMutationsKeys.updateCases,
    onSuccess: (data, { successToasterTitle, getUpdateSuccessToast }) => {
      queryClient.invalidateQueries(casesQueriesKeys.casesList());
      queryClient.invalidateQueries(casesQueriesKeys.tags());
      queryClient.invalidateQueries(casesQueriesKeys.userProfiles());

      const customToast = getUpdateSuccessToast?.({
        updateSummary: data
          ?.map((updatedCase) => updatedCase.updateSummary)
          .filter((stats): stats is UpdateSummary => stats !== undefined),
      });

      if (customToast) {
        showSuccessToast(customToast.title, customToast.text);
      } else if (successToasterTitle) {
        showSuccessToast(successToasterTitle);
      }
    },
    onError: (error: ServerError) => {
      showErrorToast(error, { title: i18n.ERROR_UPDATING });
    },
  });
};

export type UseUpdateCases = ReturnType<typeof useUpdateCases>;
