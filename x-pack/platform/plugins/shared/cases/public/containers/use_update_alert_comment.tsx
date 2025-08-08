/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import type { ServerError } from '../types';
import { patchAlertComment } from './api';
import { casesMutationsKeys } from './constants';
import * as i18n from './translations';
import type { AlertAttachment } from '../../common/types/domain';

interface MutationArgs {
  caseId: string;
  commentUpdate: Pick<AlertAttachment, 'alertId' | 'index' | 'rule' | 'owner' | 'type'> & {
    id: string;
    version: string;
  };
  successToasterTitle: string;
}

export const useUpdateAlertComment = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  // this hook guarantees that there will be at least one value in the owner array, we'll
  // just use the first entry just in case there are more than one entry

  return useMutation(
    ({ caseId, commentUpdate }: MutationArgs) =>
      patchAlertComment({
        caseId,
        commentUpdate: {
          id: commentUpdate.id,
          alertId: commentUpdate.alertId,
          index: commentUpdate.index,
          rule: commentUpdate.rule,
          version: commentUpdate.version,
          owner: commentUpdate.owner,
          type: commentUpdate.type,
        },
      }),
    {
      mutationKey: casesMutationsKeys.updateComment,
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

export type UseUpdateComment = ReturnType<typeof useUpdateAlertComment>;
