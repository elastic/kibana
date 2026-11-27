/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { MergeCasesRequest, MergeCasesResponse } from '../../../common/types/api';
import type { MergeBlockedErrorAttributes } from '../../../common/constants/error_codes';
import {
  CASES_API_ERROR_CODES,
  isCasesApiErrorAttributes,
} from '../../../common/constants/error_codes';
import { useCaseViewNavigation } from '../../common/navigation/hooks';
import { useToasts } from '../../common/lib/kibana';
import { useCasesToast } from '../../common/use_cases_toast';
import { mergeCases } from '../../containers/api';
import { casesMutationsKeys, casesQueriesKeys } from '../../containers/constants';
import type { ServerError } from '../../types';
import { formatCaseList, getCaseReference } from './utils';
import * as i18n from './translations';

/** Where the merge started: the case list stays put, a case page moves to the destination. */
export type MergeOrigin = 'list' | 'casePage';

export interface MergeCasesVariables {
  request: MergeCasesRequest;
  origin: MergeOrigin;
}

/** The typed attributes of a 400 that refused the merge before writing, if this is one. */
export const getMergeBlockedAttributes = (
  error: ServerError | null | undefined
): MergeBlockedErrorAttributes | undefined => {
  const attributes = error?.body?.attributes;
  return isCasesApiErrorAttributes(attributes) &&
    attributes.code === CASES_API_ERROR_CODES.MERGE_BLOCKED
    ? attributes
    : undefined;
};

export const useMergeCases = () => {
  const queryClient = useQueryClient();
  const toasts = useToasts();
  const { showSuccessToast, showErrorToast } = useCasesToast();
  const { getCaseViewUrl } = useCaseViewNavigation();

  return useMutation<MergeCasesResponse, ServerError, MergeCasesVariables>(
    ({ request }: MergeCasesVariables) => mergeCases({ request }),
    {
      mutationKey: casesMutationsKeys.mergeCases,
      onSuccess: ({ destination, sources, failures }, { origin }) => {
        const caseRef = getCaseReference(destination);
        // From a case page the user lands on the destination, so the toast needs no link.
        const actionProps =
          origin === 'list'
            ? {
                primary: {
                  href: getCaseViewUrl({ detailName: destination.id }),
                  target: '_blank',
                  iconType: 'external',
                  iconSide: 'right' as const,
                  'aria-label': i18n.OPEN_CASE_IN_NEW_TAB(caseRef),
                  children: i18n.OPEN_CASE(caseRef),
                  'data-test-subj': 'merge-cases-toast-open-case',
                },
              }
            : undefined;
        const notMerged = sources.filter(({ outcome }) => outcome === 'notMerged');

        if (notMerged.length > 0) {
          toasts.addWarning({
            title: i18n.PARTIAL_TOAST_TITLE(caseRef),
            text: i18n.PARTIAL_NOT_MERGED_BODY(
              notMerged.length,
              formatCaseList(notMerged.map((source) => getCaseReference(source))),
              caseRef
            ),
            actionProps,
            'data-test-subj': 'merge-cases-partial-toast',
          });
          return;
        }

        if (failures.length > 0) {
          toasts.addWarning({
            title: i18n.PARTIAL_TOAST_TITLE(caseRef),
            text: i18n.PARTIAL_STEPS_BODY(caseRef),
            actionProps,
            'data-test-subj': 'merge-cases-partial-toast',
          });
          return;
        }

        showSuccessToast(i18n.SUCCESS_TOAST(sources.length, caseRef), undefined, actionProps);
      },
      onError: (error: ServerError) => {
        // The flyout refreshes the preview and marks what to resolve, so no toast.
        if (getMergeBlockedAttributes(error) != null) {
          return;
        }
        showErrorToast(error, {
          title: i18n.FAILURE_TOAST_TITLE,
          toastMessage: i18n.FAILURE_TOAST_BODY,
        });
      },
      onSettled: () => {
        // Also refetches an open merge preview, which a refused merge needs.
        queryClient.invalidateQueries(casesQueriesKeys.all);
      },
    }
  );
};
