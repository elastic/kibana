/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { MAX_OBSERVABLES_PER_CASE } from '../../common/constants';
import type { ExtractObservablesResponseUI } from '../../common/ui/types';
import { extractObservables } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

interface UseExtractObservablesProps {
  onSuccess?: (result: ExtractObservablesResponseUI) => void;
}

export const useExtractObservables = (
  caseId: string,
  { onSuccess }: UseExtractObservablesProps = {}
) => {
  const { showErrorToast, showSuccessToast, showInfoToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(() => extractObservables(caseId), {
    mutationKey: casesMutationsKeys.extractObservables,
    onError: (error: ServerError) => {
      showErrorToast(error, { title: i18n.ERROR_TITLE });
    },
    onSuccess: (result) => {
      switch (result.status) {
        case 'extracted':
          showSuccessToast(i18n.OBSERVABLES_EXTRACTED(result.newObservablesCount));
          refreshCaseViewPage();
          break;
        case 'cap_reached':
          showInfoToast(i18n.OBSERVABLES_LIMIT_REACHED(MAX_OBSERVABLES_PER_CASE));
          break;
        case 'alerts_not_found':
          showInfoToast(i18n.NO_ALERTS_FOUND_TO_EXTRACT);
          break;
        case 'no_new_observables':
          showInfoToast(i18n.NO_NEW_OBSERVABLES_FOUND);
          break;
      }
      onSuccess?.(result);
    },
  });
};

export type UseExtractObservables = ReturnType<typeof useExtractObservables>;
