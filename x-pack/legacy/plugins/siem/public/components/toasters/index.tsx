/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiGlobalToastList, EuiGlobalToastListToast as Toast } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { createContext, Dispatch, useContext, useReducer, useState } from 'react';
import styled from 'styled-components';
import uuid from 'uuid';

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

const GlobalToasterListContainer = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
`;

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
        <GlobalToasterListContainer>
          <EuiGlobalToastList
            toasts={[formatToErrorToastIfNeeded(toasts[0], toggle)]}
            dismissToast={({ id }) => {
              dispatch({ type: 'deleteToaster', id });
            }}
            toastLifeTimeMs={toastLifeTimeMs}
          />
        </GlobalToasterListContainer>
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

ErrorToastContainer.displayName = 'ErrorToastContainer';

/**
 * Displays an error toast for the provided title and message
 *
 * @param errorTitle Title of error to display in toaster and modal
 * @param errorMessages Message to display in error modal when clicked
 * @param dispatchToaster provided by useStateToaster()
 */
export const displayErrorToast = (
  errorTitle: string,
  errorMessages: string[],
  dispatchToaster: React.Dispatch<ActionToaster>
): void => {
  const toast: AppToast = {
    id: uuid.v4(),
    title: errorTitle,
    color: 'danger',
    iconType: 'alert',
    errors: errorMessages,
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

/**
 * Displays a success toast for the provided title and message
 *
 * @param title success message to display in toaster and modal
 * @param dispatchToaster provided by useStateToaster()
 */
export const displaySuccessToast = (
  title: string,
  dispatchToaster: React.Dispatch<ActionToaster>
): void => {
  const toast: AppToast = {
    id: uuid.v4(),
    title,
    color: 'success',
    iconType: 'check',
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};
