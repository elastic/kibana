/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, uniqBy } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../components/toasters';
import { getCaseUserActions } from './api';
import * as i18n from './translations';
import { CaseExternalService, CaseUserActions, ElasticUser } from './types';
import { parseString } from './utils';

interface CaseUserActionsState {
  caseServices: CaseService[];
  caseUserActions: CaseUserActions[];
  isError: boolean;
  isLoading: boolean;
  participants: ElasticUser[];
}

interface CaseService {
  connectorId: string;
  firstIndexPushToService: number;
  hasDataToPush: boolean;
  lastIndexPushToService: number;
}

const initialCaseServiceData = {
  connectorId: 'none',
  firstIndexPushToService: -1,
  hasDataToPush: false,
  lastIndexPushToService: -1,
};
export const initialData: CaseUserActionsState = {
  caseServices: [],
  caseUserActions: [],
  isError: false,
  isLoading: true,
  participants: [],
};

export interface UseGetCaseUserActions extends CaseUserActionsState {
  fetchCaseUserActions: (caseId: string) => void;
}

const getPushedInfo = (
  caseUserActions: CaseUserActions[],
  caseConnectorId: string
): {
  caseUserActions: CaseUserActions[];
  firstIndexPushToService: number;
  hasDataToPush: boolean;
  lastIndexPushToService: number;
} => {
  const externalServicesUserActions = caseUserActions.filter(
    cua => cua.action === 'push-to-service'
  );
  const externalServiceHistory = caseUserActions.reduce(
    (acc, cua) => {
      if (cua.action !== 'push-to-service') {
        return acc;
      }
      const possibleExternalService = parseString(`${cua.newValue}`);
      if (possibleExternalService === null) {
        return {
          ...acc,
          externalServiceUserActions: [...acc.externalServiceUserActions, cua],
        };
      }
      return {
        ...acc,
        externalServiceUserActions: [...acc.externalServiceUserActions, cua],
        externalServices: {
          ...acc.externalServices,
          [possibleExternalService.connectorId]: possibleExternalService,
        },
      };
    },
    {
      externalServices: {},
      externalServiceUserActions: [],
    }
  );

  const availableExternalServices = caseUserActions.filter(cua => cua.action === 'push-to-service');

  const caseActionsFiltered = caseUserActions;
  //   .filter(cua => {
  //   if (cua.action !== 'push-to-service') {
  //     return true;
  //   }
  //   return parseString(`${cua.newValue}`).connectorId === caseConnectorId;
  // });
  console.log('filter case actions', {
    caseUserActions,
    caseActionsFiltered,
  });
  const firstIndexPushToService = caseActionsFiltered.findIndex(
    (cua, i) =>
      cua.action === 'push-to-service' &&
      parseString(`${caseActionsFiltered[i].newValue}`).connectorId === caseConnectorId
  );
  const lastIndexPushToService = caseActionsFiltered
    .map(cua => cua.action)
    .lastIndexOf('push-to-service');
  //
  // const isFirstIndexValid =
  //   firstIndexPushToService > -1 &&
  //   caseActionsFiltered[firstIndexPushToService].newValue !== null &&
  //   parseString(`${caseActionsFiltered[firstIndexPushToService].newValue}`).connectorId ===
  //     caseConnectorId;
  // if (
  //   firstIndexPushToService > -1 &&
  //   caseActionsFiltered[firstIndexPushToService].newValue !== null &&
  //   parseString(`${caseActionsFiltered[firstIndexPushToService].newValue}`).connectorId ===
  //     caseConnectorId
  // ) {
  // }
  //
  // const isLastIndexValid =
  //   lastIndexPushToService > -1 &&
  //   caseActionsFiltered[lastIndexPushToService].newValue !== null &&
  //   parseString(`${caseActionsFiltered[lastIndexPushToService].newValue}`).connectorId ===
  //     caseConnectorId;

  const hasDataToPush =
    lastIndexPushToService === -1 || lastIndexPushToService < caseActionsFiltered.length - 1;
  return {
    caseUserActions,
    firstIndexPushToService,
    lastIndexPushToService,
    hasDataToPush,
  };
};

export const useGetCaseUserActions = (
  caseId: string,
  caseConnectorId: string
): UseGetCaseUserActions => {
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
            console.log('caseUserActions!!!!!!!', caseUserActions);
            console.log('getPushedInfo!!!!!!!', getPushedInfo(caseUserActions, caseConnectorId));
            setCaseUserActionsState({
              ...getPushedInfo(caseUserActions, caseConnectorId),
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
    [caseUserActionsState, caseConnectorId]
  );

  useEffect(() => {
    if (!isEmpty(caseId)) {
      fetchCaseUserActions(caseId);
    }
  }, [caseId]);
  return { ...caseUserActionsState, fetchCaseUserActions };
};
