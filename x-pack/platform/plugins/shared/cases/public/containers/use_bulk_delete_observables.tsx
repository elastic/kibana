/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useObservablesDeletedEBT } from '../analytics/observables';
import { bulkDeleteObservables } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

interface MutationArgs {
  observableIds: string[];
}

interface UseBulkDeleteObservablesProps {
  onSuccess?: () => void;
}

export const useBulkDeleteObservables = (
  caseId: string,
  { onSuccess }: UseBulkDeleteObservablesProps = {}
) => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const reportObservablesDeleted = useObservablesDeletedEBT();

  return useMutation(
    ({ observableIds }: MutationArgs) => bulkDeleteObservables(caseId, observableIds),
    {
      mutationKey: casesMutationsKeys.bulkDeleteObservables,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSuccess: (_data, { observableIds }) => {
        showSuccessToast(i18n.OBSERVABLES_BULK_REMOVED(observableIds.length));
        refreshCaseViewPage();
        reportObservablesDeleted({ deleteScope: 'bulk' });
        onSuccess?.();
      },
    }
  );
};

export type UseBulkDeleteObservables = ReturnType<typeof useBulkDeleteObservables>;
