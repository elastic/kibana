/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useContext, createContext } from 'react';
import type { CoreStart } from '@kbn/core/public';

const navigationContext = createContext<CoreStart | null>(null);

export const NavigationProvider: React.FC<{ core: CoreStart }> = ({ core, children }) => (
  <navigationContext.Provider value={core}>{children}</navigationContext.Provider>
);

export const useNavigationContext = (): CoreStart => {
  const services = useContext(navigationContext);
  if (!services) {
    throw new Error('Kibana services not found in navigation context');
  }
  return services;
};
