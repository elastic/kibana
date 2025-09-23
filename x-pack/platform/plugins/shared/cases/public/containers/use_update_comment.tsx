/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useCasesToast } from '../common/use_cases_toast';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import type { ServerError } from '../types';
import { patchComment } from './api';
import { casesMutationsKeys } from './constants';
import * as i18n from './translations';

interface UpdateComment {
  caseId: string;
  commentId: string;
  commentUpdate: string;
  version: string;
}

export const useUpdateComment = () => {
  const { showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  // this hook guarantees that there will be at least one value in the owner array, we'll
  // just use the first entry just in case there are more than one entry
  const owner = useCasesContext().owner[0];

  return useMutation(
    ({ caseId, commentId, commentUpdate, version }: UpdateComment) =>
      patchComment({
        caseId,
        commentId,
        commentUpdate,
        version,
        owner,
      }),
    {
      mutationKey: casesMutationsKeys.updateComment,
      onSuccess: () => {
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseUpdateComment = ReturnType<typeof useUpdateComment>;
