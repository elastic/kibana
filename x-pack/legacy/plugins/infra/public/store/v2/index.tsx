/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, createContext } from 'react';
import {
  useLogEntriesStore,
  logEntriesInitialState,
  logEntriesDependenciesSelector,
} from './log_entries';
import { useLogFilterStore, logFilterInitialState } from './log_filter';
import { useLogPositionStore, logPositionInitialState } from './log_position';

const storeInitialState = {
  logEntries: logEntriesInitialState,
  logPosition: logPositionInitialState,
  logFilter: logFilterInitialState,
};

export const StoreContext = createContext(storeInitialState);

export const StoreProvider = ({ children }) => {
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
