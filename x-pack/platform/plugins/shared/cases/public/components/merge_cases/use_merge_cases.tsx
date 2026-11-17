/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { MergeCasesRequest, MergeCasesResponse } from '../../../common/types/api';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useToasts } from '../../common/lib/kibana';
import { useCasesToast } from '../../common/use_cases_toast';
import { mergeCases } from '../../containers/api';
import { casesMutationsKeys, casesQueriesKeys } from '../../containers/constants';
import type { ServerError } from '../../types';
import { getCaseReference } from './utils';
import * as i18n from './translations';

/**
 * Merges cases. Toasts are raised here rather than in the flyout so the result is reported even
 * when the flyout is closed while the merge runs.
 */
export const useMergeCases = () => {
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const { showSuccessToast, showErrorToast } = useCasesToast();
  const { getCaseViewUrl } = useCaseViewNavigation();

  return useMutation<MergeCasesResponse, ServerError, MergeCasesRequest>(
    (request: MergeCasesRequest) => mergeCases({ request }),
    {
      mutationKey: casesMutationsKeys.mergeCases,
      onSuccess: ({ destination, mergedCaseIds, failures }) => {
        const caseRef = getCaseReference(destination);
        const actionProps = {
          primary: {
            href: getCaseViewUrl({ detailName: destination.id }),
            target: '_blank',
            iconType: 'external',
            iconSide: 'right' as const,
            'aria-label': i18n.OPEN_CASE_IN_NEW_TAB(caseRef),
            children: i18n.OPEN_CASE(caseRef),
            'data-test-subj': 'merge-cases-toast-open-case',
          },
        };

        if (failures.length === 0) {
          showSuccessToast(
            i18n.SUCCESS_TOAST(mergedCaseIds.length, caseRef),
            undefined,
            actionProps
          );
          return;
        }

        toasts.addWarning({
          title: i18n.PARTIAL_TOAST_TITLE(caseRef),
          text: i18n.PARTIAL_TOAST_BODY(caseRef),
          actionProps,
        });
      },
      onError: (error: ServerError) => {
        showErrorToast(error, {
          title: i18n.FAILURE_TOAST_TITLE,
          toastMessage: i18n.FAILURE_TOAST_BODY,
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries(casesQueriesKeys.all);
      },
    }
  );
};
