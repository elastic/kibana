/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useMemo, useState } from 'react';
import { History } from 'history';
import { useHistory, useLocation } from 'react-router-dom';
import { store } from '../state';
import { triggerAppRefresh } from '../state/actions';

interface Location {
  pathname: string;
  search: string;
}

interface UMRefreshContext {
  lastRefresh: number;
  history: History | undefined;
  location: Location | undefined;
  refreshApp: () => void;
}

const defaultContext: UMRefreshContext = {
  lastRefresh: 0,
  history: undefined,
  location: undefined,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
};

export const UptimeRefreshContext = createContext(defaultContext);

interface ContextProps {
  lastRefresh: number;
}

export const UptimeRefreshContextProvider: React.FC<ContextProps> = ({ children }) => {
  const history = useHistory();
  const location = useLocation();

  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const refreshApp = () => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
    store.dispatch(triggerAppRefresh(refreshTime));
  };

  const value = useMemo(() => {
    return { lastRefresh, history, location, refreshApp };
  }, [history, location, lastRefresh]);

  return <UptimeRefreshContext.Provider value={value} children={children} />;
};
