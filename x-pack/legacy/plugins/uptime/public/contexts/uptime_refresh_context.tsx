/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useMemo, useState } from 'react';
import { store } from '../state';
import { triggerAppRefresh } from '../state/actions';

interface UptimeRefreshContext {
  lastRefresh: number;
  refreshApp: () => void;
}

const defaultContext: UptimeRefreshContext = {
  lastRefresh: 0,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
};

export const UptimeRefreshContext = createContext(defaultContext);

export const UptimeRefreshContextProvider: React.FC = ({ children }) => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const refreshApp = () => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
    // @ts-ignore
    store.dispatch(triggerAppRefresh(refreshTime));
  };

  const value = useMemo(() => {
    return { lastRefresh, refreshApp };
  }, [lastRefresh]);

  return <UptimeRefreshContext.Provider value={value} children={children} />;
};
