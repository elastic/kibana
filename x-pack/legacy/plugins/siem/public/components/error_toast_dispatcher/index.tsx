/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { appModel, appSelectors, State } from '../../store';
import { appActions } from '../../store/app';
import { useStateToaster } from '../toasters';

interface OwnProps {
  toastLifeTimeMs?: number;
}

interface ReduxProps {
  errors?: appModel.Error[];
}

interface DispatchProps {
  removeError: ActionCreator<{ id: string }>;
}

type Props = OwnProps & ReduxProps & DispatchProps;

const ErrorToastDispatcherComponent = ({
  toastLifeTimeMs = 5000,
  errors = [],
  removeError,
}: Props) => {
  const [{ toasts }, dispatchToaster] = useStateToaster();
  useEffect(() => {
    errors.forEach(({ id, title, message }) => {
      if (!toasts.some(toast => toast.id === id)) {
        dispatchToaster({
          type: 'addToaster',
          toast: {
            color: 'danger',
            id,
            iconType: 'alert',
            title,
            errors: message,
            toastLifeTimeMs,
          },
        });
      }
      removeError({ id });
    });
  });
  return null;
};

const makeMapStateToProps = () => {
  const getErrorSelector = appSelectors.errorsSelector();
  return (state: State) => getErrorSelector(state);
};

export const ErrorToastDispatcher = connect(makeMapStateToProps, {
  removeError: appActions.removeError,
})(ErrorToastDispatcherComponent);
