/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@kbn/std';
import type { AllCasesSelectorModalProps } from '../../all_cases/selector_modal';
import type { CreateCaseFlyoutProps } from '../../create/flyout';
import type { RemoveAlertModalProps } from '../../case_view/components/remove_alert_from_case_modal';

export const getInitialCasesContextState = (): CasesContextState => {
  return {
    createCaseFlyout: {
      isFlyoutOpen: false,
    },
    selectCaseModal: {
      isModalOpen: false,
    },
    removeAlertModal: {
      isModalOpen: false,
    },
  };
};

export interface CasesContextState {
  createCaseFlyout: {
    isFlyoutOpen: boolean;
    props?: CreateCaseFlyoutProps;
  };
  selectCaseModal: {
    isModalOpen: boolean;
    props?: AllCasesSelectorModalProps;
  };
  removeAlertModal: {
    isModalOpen: boolean;
    props?: RemoveAlertModalProps;
  };
}

export enum CasesContextStoreActionsList {
  OPEN_CREATE_CASE_FLYOUT,
  CLOSE_CREATE_CASE_FLYOUT,
  OPEN_ADD_TO_CASE_MODAL,
  CLOSE_ADD_TO_CASE_MODAL,
  OPEN_REMOVE_ALERT_MODAL,
  CLOSE_REMOVE_ALERT_MODAL,
}

export type CasesContextStoreAction =
  | {
      type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT;
      payload: CreateCaseFlyoutProps;
    }
  | { type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT }
  | {
      type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL;
      payload: AllCasesSelectorModalProps;
    }
  | { type: CasesContextStoreActionsList.CLOSE_ADD_TO_CASE_MODAL }
  | {
      type: CasesContextStoreActionsList.OPEN_REMOVE_ALERT_MODAL;
      payload: RemoveAlertModalProps;
    }
  | { type: CasesContextStoreActionsList.CLOSE_REMOVE_ALERT_MODAL };

export const casesContextReducer: React.Reducer<CasesContextState, CasesContextStoreAction> = (
  state: CasesContextState,
  action: CasesContextStoreAction
): CasesContextState => {
  switch (action.type) {
    case CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT: {
      return { ...state, createCaseFlyout: { isFlyoutOpen: true, props: action.payload } };
    }
    case CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT: {
      return { ...state, createCaseFlyout: { isFlyoutOpen: false } };
    }
    case CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL: {
      return { ...state, selectCaseModal: { isModalOpen: true, props: action.payload } };
    }
    case CasesContextStoreActionsList.CLOSE_ADD_TO_CASE_MODAL: {
      return { ...state, selectCaseModal: { isModalOpen: false } };
    }
    case CasesContextStoreActionsList.OPEN_REMOVE_ALERT_MODAL: {
      return { ...state, removeAlertModal: { isModalOpen: true, props: action.payload } };
    }
    case CasesContextStoreActionsList.CLOSE_REMOVE_ALERT_MODAL: {
      return { ...state, removeAlertModal: { isModalOpen: false } };
    }
    default:
      assertNever(action);
  }
};
