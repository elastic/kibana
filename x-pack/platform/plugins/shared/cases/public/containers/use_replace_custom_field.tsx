/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import type { ServerError } from '../types';
import type { CaseUI } from './types';
import { getCase, replaceCustomField } from './api';
import { casesMutationsKeys } from './constants';
import * as i18n from './translations';
import { rebaseCaseMutationOnConflict } from './conflict_rebase';

interface ReplaceCustomField {
  caseId: string;
  customFieldId: string;
  customFieldValue: string | number | boolean | null;
  caseVersion: string;
  caseData: CaseUI;
}

export const useReplaceCustomField = () => {
  const { showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    (request: ReplaceCustomField) =>
      rebaseCaseMutationOnConflict({
        request,
        preRequestServerState: [request.caseData],
        executeRequest: ({ caseId, customFieldId, customFieldValue, caseVersion }) =>
          replaceCustomField({
            caseId,
            customFieldId,
            request: { value: customFieldValue, caseVersion },
          }),
        fetchLatestCase: (caseId) => getCase({ caseId }),
        buildRetryRequest: ({ request: retryRequest, latestCases }) => {
          const latestCase = latestCases.get(retryRequest.caseId);

          if (latestCase == null) {
            return retryRequest;
          }

          return {
            ...retryRequest,
            caseVersion: latestCase.version,
            caseData: {
              ...retryRequest.caseData,
              ...latestCase,
              comments: retryRequest.caseData.comments,
            },
          };
        },
      }),
    {
      mutationKey: casesMutationsKeys.replaceCustomField,
      onSuccess: () => {
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseReplaceCustomField = ReturnType<typeof useReplaceCustomField>;
