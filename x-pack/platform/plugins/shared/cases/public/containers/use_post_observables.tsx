/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { AddObservableRequest } from '../../common/types/api';
import { postObservable } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

export const usePostObservable = (caseId: string) => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    (request: AddObservableRequest) => {
      return postObservable(request, caseId);
    },
    {
      mutationKey: casesMutationsKeys.postObservable,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSuccess: () => {
        refreshCaseViewPage();
        showSuccessToast(i18n.OBSERVABLE_CREATED);
      },
    }
  );
};

export type UsePostObservables = ReturnType<typeof usePostObservable>;
