/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { casesMutationsKeys } from './constants';
import type { ServerError } from '../types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useCasesToast } from '../common/use_cases_toast';
import { deleteAlertComment } from './api';
import * as i18n from './translations';
import type { AlertAttachmentUI } from './types';

interface MutationArgs {
  caseId: string;
  alertId: string;
  successToasterTitle: string;
  alertAttachment: AlertAttachmentUI;
}

export const useRemoveAlertFromCase = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    ({ caseId, alertId, alertAttachment }: MutationArgs) =>
      deleteAlertComment({ caseId, alertId, alertAttachment }),
    {
      mutationKey: casesMutationsKeys.deleteComment,
      onSuccess: (_, { successToasterTitle }) => {
        showSuccessToast(successToasterTitle);
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseRemoveAlertFromCase = ReturnType<typeof useRemoveAlertFromCase>;
