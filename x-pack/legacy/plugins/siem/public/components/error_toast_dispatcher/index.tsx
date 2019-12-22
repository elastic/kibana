/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { appSelectors, State } from '../../store';
import { appActions } from '../../store/app';
import { useStateToaster } from '../toasters';

interface OwnProps {
  toastLifeTimeMs?: number;
}

type Props = OwnProps & PropsFromRedux;

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

const connector = connect(makeMapStateToProps, {
  removeError: appActions.removeError,
});

type PropsFromRedux = ConnectedProps<typeof connector>;

export const ErrorToastDispatcher = connector(ErrorToastDispatcherComponent);
