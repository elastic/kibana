/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { CaseStatusDefinition } from '../../common/types/domain';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { putCaseStatuses } from './api';
import { casesMutationsKeys, casesQueriesKeys } from './constants';
import * as i18n from './translations';

/** Saves the statuses of the current space. */
export const usePersistCaseStatuses = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation(
    ({ statuses }: { statuses: CaseStatusDefinition[] }) => putCaseStatuses({ statuses }),
    {
      mutationKey: casesMutationsKeys.persistCaseStatuses,
      onSuccess: (savedStatuses) => {
        queryClient.setQueryData(casesQueriesKeys.caseStatusDefinitions(), savedStatuses);
        queryClient.invalidateQueries(casesQueriesKeys.caseStatusDefinitions());
        showSuccessToast(i18n.STATUSES_SAVED);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_SAVING_STATUSES });
      },
    }
  );
};

export type UsePersistCaseStatuses = ReturnType<typeof usePersistCaseStatuses>;
