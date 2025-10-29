/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient, useMutation } from '@tanstack/react-query';
import * as i18n from './translations';
import { updateCases } from './api';
import type { CaseUpdateRequest } from './types';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { casesQueriesKeys, casesMutationsKeys } from './constants';

interface MutationArgs {
  cases: CaseUpdateRequest[];
  successToasterTitle: string;
}

export const useUpdateCases = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation(({ cases }: MutationArgs) => updateCases({ cases }), {
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
  });
};

export type UseUpdateCases = ReturnType<typeof useUpdateCases>;
