/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPortal, EuiProgress } from '@elastic/eui';
import React, { Fragment, useMemo, useReducer } from 'react';
import { useDelayedVisibility } from '../components/shared/useDelayedVisibility';

export const LoadingIndicatorContext = React.createContext({
  statuses: {},
  dispatchStatus: (action: Action) => undefined as void
});

interface State {
  [key: string]: boolean;
}

interface Action {
  isLoading: boolean;
  id: number;
}

function reducer(statuses: State, action: Action) {
  // add loading status
  if (action.isLoading) {
    return { ...statuses, [action.id]: true };
  }

  // remove loading status
  const { [action.id]: statusToRemove, ...restStatuses } = statuses;
  return restStatuses;
}

function getIsAnyLoading(statuses: State) {
  return Object.values(statuses).some(isLoading => isLoading);
}

export function LoadingIndicatorProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [statuses, dispatchStatus] = useReducer(reducer, {});
  const isLoading = useMemo(() => getIsAnyLoading(statuses), [statuses]);
  const shouldShowLoadingIndicator = useDelayedVisibility(isLoading);
  const contextValue = React.useMemo(() => ({ statuses, dispatchStatus }), [
    statuses
  ]);

  return (
    <Fragment>
      {shouldShowLoadingIndicator && (
        <EuiPortal>
          <EuiProgress size="xs" position="fixed" />
        </EuiPortal>
      )}

      <LoadingIndicatorContext.Provider
        value={contextValue}
        children={children}
      />
    </Fragment>
  );
}
