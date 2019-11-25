/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useContext, createContext } from 'react';
import {
  useLogEntriesStore,
  logEntriesInitialState,
  logEntriesInitialCallbacks,
  logEntriesDependenciesSelector,
  LogEntriesState,
  LogEntriesCallbacks,
} from './log_entries';
import { useLogFilterStore, logFilterInitialState, LogFilterState } from './log_filter';
import { useLogPositionStore, logPositionInitialState, LogPositionState } from './log_position';

export interface State {
  logEntries: LogEntriesState;
  logPosition: LogPositionState;
  logFilter: LogFilterState;
}
interface Callbacks {
  logEntriesCallbacks: LogEntriesCallbacks;
}
export { LogEntriesState, LogFilterState, LogPositionState, LogEntriesCallbacks };

const storeInitialState: State = {
  logEntries: logEntriesInitialState,
  logPosition: logPositionInitialState,
  logFilter: logFilterInitialState,
};

const storeInitialCallbacks = {
  logEntriesCallbacks: logEntriesInitialCallbacks,
};

const StoreContext = createContext(storeInitialState);
const StoreCallbackContext = createContext(storeInitialCallbacks);

export const StoreProvider: React.FunctionComponent = ({ children }) => {
  const [logEntriesState, updateLogEntriesState, logEntriesCallbacks] = useLogEntriesStore();
  const logPositionState = useLogPositionStore();
  const logFilterState = useLogFilterStore();

  const store = {
    logEntries: logEntriesState,
    logPosition: logPositionState,
    logFilter: logFilterState,
  };

  const callbacks = {
    logEntriesCallbacks,
  };

  useEffect(() => updateLogEntriesState(logEntriesDependenciesSelector(store)), [
    logPositionState,
    logFilterState,
  ]);

  return (
    <StoreContext.Provider value={store}>
      <StoreCallbackContext.Provider value={callbacks}>{children}</StoreCallbackContext.Provider>
    </StoreContext.Provider>
  );
};

export const useStore: () => [State, Callbacks] = () => [
  useContext(StoreContext),
  useContext(StoreCallbackContext),
];
