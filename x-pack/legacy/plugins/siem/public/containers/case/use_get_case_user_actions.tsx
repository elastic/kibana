/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../components/toasters';
import { getCaseUserActions } from './api';
import * as i18n from './translations';
import { CaseUserActions } from './types';

interface CaseUserActionsState {
  caseUserActions: CaseUserActions[];
  isLoading: boolean;
  isError: boolean;
}

const initialData: CaseUserActionsState = {
  caseUserActions: [],
  isLoading: true,
  isError: false,
};

interface UseGetCaseUserActions extends CaseUserActionsState {
  fetchCaseUserActions: (caseId: string) => void;
}

export const useGetCaseUserActions = (caseId: string): UseGetCaseUserActions => {
  const [caseUserActionsState, setCaseUserActionsState] = useState<CaseUserActionsState>(
    initialData
  );

  const [, dispatchToaster] = useStateToaster();

  const fetchCaseUserActions = useCallback(
    (thisCaseId: string) => {
      let didCancel = false;
      const abortCtrl = new AbortController();
      const fetchData = async () => {
        setCaseUserActionsState({
          ...caseUserActionsState,
          isLoading: true,
        });
        try {
          const response = await getCaseUserActions(thisCaseId, abortCtrl.signal);
          if (!didCancel) {
            // Attention Future developer
            // We are removing the first item because it will always the creation of the case
            // and we do not want it to simplify our life
            setCaseUserActionsState({
              caseUserActions: !isEmpty(response) ? response.slice(1) : [],
              isLoading: false,
              isError: false,
            });
          }
        } catch (error) {
          if (!didCancel) {
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
            setCaseUserActionsState({
              caseUserActions: [],
              isLoading: false,
              isError: true,
            });
          }
        }
      };
      fetchData();
      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    [caseUserActionsState]
  );

  useEffect(() => {
    if (!isEmpty(caseId)) {
      fetchCaseUserActions(caseId);
    }
  }, [caseId]);
  return { ...caseUserActionsState, fetchCaseUserActions };
};
