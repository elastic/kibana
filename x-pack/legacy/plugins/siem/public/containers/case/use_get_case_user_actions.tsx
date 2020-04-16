/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import { useCallback, useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../components/toasters';
import { getCaseUserActions } from './api';
import * as i18n from './translations';
import { CaseUserActions, ElasticUser } from './types';

interface CaseUserActionsState {
  caseUserActions: CaseUserActions[];
  firstIndexPushToService: number;
  hasDataToPush: boolean;
  participants: ElasticUser[];
  isLoading: boolean;
  isError: boolean;
  lastIndexPushToService: number;
}

export const initialData: CaseUserActionsState = {
  caseUserActions: [],
  firstIndexPushToService: -1,
  lastIndexPushToService: -1,
  hasDataToPush: false,
  isLoading: true,
  isError: false,
  participants: [],
};

export interface UseGetCaseUserActions extends CaseUserActionsState {
  fetchCaseUserActions: (caseId: string) => void;
}

const getPushedInfo = (
  caseUserActions: CaseUserActions[]
): { firstIndexPushToService: number; lastIndexPushToService: number; hasDataToPush: boolean } => {
  const firstIndexPushToService = caseUserActions.findIndex(
    cua => cua.action === 'push-to-service'
  );
  const lastIndexPushToService = caseUserActions
    .map(cua => cua.action)
    .lastIndexOf('push-to-service');

  const hasDataToPush =
    lastIndexPushToService === -1 || lastIndexPushToService < caseUserActions.length - 1;
  return {
    firstIndexPushToService,
    lastIndexPushToService,
    hasDataToPush,
  };
};

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
            // We are removing the first item because it will always be the creation of the case
            // and we do not want it to simplify our life
            const participants = !isEmpty(response)
              ? uniqBy('actionBy.username', response).map(cau => cau.actionBy)
              : [];

            const caseUserActions = !isEmpty(response) ? response.slice(1) : [];
            setCaseUserActionsState({
              caseUserActions,
              ...getPushedInfo(caseUserActions),
              isLoading: false,
              isError: false,
              participants,
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
              firstIndexPushToService: -1,
              lastIndexPushToService: -1,
              hasDataToPush: false,
              isLoading: false,
              isError: true,
              participants: [],
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
