/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { UpdateObservableRequest } from '../../common/types/api';
import { patchObservable } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

export const usePatchObservable = (caseId: string, observableId: string) => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    (request: UpdateObservableRequest) => {
      return patchObservable(request, caseId, observableId);
    },
    {
      mutationKey: casesMutationsKeys.patchObservable,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSuccess: () => {
        showSuccessToast(i18n.OBSERVABLE_UPDATED);
        refreshCaseViewPage();
      },
    }
  );
};

export type UsePatchObservables = ReturnType<typeof usePatchObservable>;
