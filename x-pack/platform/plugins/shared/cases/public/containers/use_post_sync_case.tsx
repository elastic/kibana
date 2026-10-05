/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';

import { syncCase } from './api';
import * as i18n from './translations';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import type { ServerError } from '../types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

interface SyncCaseRequest {
  caseId: string;
  connectorName: string;
}

export const usePostSyncCase = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation((request: SyncCaseRequest) => syncCase({ caseId: request.caseId }), {
    mutationKey: casesMutationsKeys.syncCase,
    onSuccess: (_, { connectorName }) => {
      showSuccessToast(i18n.SUCCESS_SYNC_FROM_EXTERNAL_SERVICE(connectorName));
      refreshCaseViewPage();
    },
    onError: (error: ServerError) => {
      showErrorToast(error, { title: i18n.ERROR_TITLE });
    },
  });
};

export type UsePostSyncCase = ReturnType<typeof usePostSyncCase>;
