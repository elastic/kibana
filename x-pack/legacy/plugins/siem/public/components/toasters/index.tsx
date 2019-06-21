/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList, Toast, EuiButton } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { createContext, Dispatch, useReducer, useContext, useState } from 'react';
import styled from 'styled-components';

import { ModalAllErrors } from './modal_all_errors';
import * as i18n from './translations';

export interface AppToast extends Toast {
  errors?: string[];
}

interface ToastState {
  toasts: AppToast[];
}

const initialToasterState: ToastState = {
  toasts: [],
};

export type ActionToaster =
  | { type: 'addToaster'; toast: AppToast }
  | { type: 'deleteToaster'; id: string }
  | { type: 'toggleWaitToShowNextToast' };

export const StateToasterContext = createContext<[ToastState, Dispatch<ActionToaster>]>([
  initialToasterState,
  () => noop,
]);

export const useStateToaster = () => useContext(StateToasterContext);

interface ManageGlobalToasterProps {
  children: React.ReactNode;
}

export const ManageGlobalToaster = ({ children }: ManageGlobalToasterProps) => {
  const reducerToaster = (state: ToastState, action: ActionToaster) => {
    switch (action.type) {
      case 'addToaster':
        return { ...state, toasts: [...state.toasts, action.toast] };
      case 'deleteToaster':
        return { ...state, toasts: state.toasts.filter(msg => msg.id !== action.id) };
      default:
        return state;
    }
  };

  return (
    <StateToasterContext.Provider value={useReducer(reducerToaster, initialToasterState)}>
      {children}
    </StateToasterContext.Provider>
  );
};

interface GlobalToasterProps {
  toastLifeTimeMs?: number;
}

export const GlobalToaster = ({ toastLifeTimeMs = 5000 }: GlobalToasterProps) => {
  const [{ toasts }, dispatch] = useStateToaster();
  const [isShowing, setIsShowing] = useState(false);
  const [toastInModal, setToastInModal] = useState<AppToast | null>(null);

  const toggle = (toast: AppToast) => {
    if (isShowing) {
      dispatch({ type: 'deleteToaster', id: toast.id });
      setToastInModal(null);
    } else {
      setToastInModal(toast);
    }
    setIsShowing(!isShowing);
  };

  return (
    <>
      {toasts.length > 0 && !isShowing && (
        <EuiGlobalToastList
          toasts={[formatToErrorToastIfNeeded(toasts[0], toggle)]}
          dismissToast={({ id }) => {
            dispatch({ type: 'deleteToaster', id });
          }}
          toastLifeTimeMs={toastLifeTimeMs}
        />
      )}
      {toastInModal != null && (
        <ModalAllErrors isShowing={isShowing} toast={toastInModal} toggle={toggle} />
      )}
    </>
  );
};

const formatToErrorToastIfNeeded = (
  toast: AppToast,
  toggle: (toast: AppToast) => void
): AppToast => {
  if (toast != null && toast.errors != null && toast.errors.length > 0) {
    toast.text = (
      <ErrorToastContainer>
        <EuiButton
          data-test-subj="toaster-show-all-error-modal"
          size="s"
          color="danger"
          onClick={() => toast != null && toggle(toast)}
        >
          {i18n.SEE_ALL_ERRORS}
        </EuiButton>
      </ErrorToastContainer>
    );
  }
  return toast;
};

const ErrorToastContainer = styled.div`
  text-align: right;
`;
