/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useContext, createContext } from 'react';
import {
  useLogEntriesStore,
  logEntriesInitialState,
  logEntriesDependenciesSelector,
  LogEntriesState,
} from './log_entries';
import { useLogFilterStore, logFilterInitialState, LogFilterState } from './log_filter';
import { useLogPositionStore, logPositionInitialState, LogPositionState } from './log_position';

export interface State {
  logEntries: LogEntriesState;
  logPosition: LogPositionState;
  logFilter: LogFilterState;
}
export { LogEntriesState, LogFilterState, LogPositionState };

const storeInitialState: State = {
  logEntries: logEntriesInitialState,
  logPosition: logPositionInitialState,
  logFilter: logFilterInitialState,
};

const StoreContext = createContext(storeInitialState);

export const StoreProvider: React.FunctionComponent = ({ children }) => {
  const [logEntriesState, updateLogEntriesState] = useLogEntriesStore();
  const logPositionState = useLogPositionStore();
  const logFilterState = useLogFilterStore();

  const store = {
    logEntries: logEntriesState,
    logPosition: logPositionState,
    logFilter: logFilterState,
  };

  useEffect(() => updateLogEntriesState(logEntriesDependenciesSelector(store)), [
    logPositionState,
    logFilterState,
  ]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};

export const useStore = () => useContext(StoreContext);
