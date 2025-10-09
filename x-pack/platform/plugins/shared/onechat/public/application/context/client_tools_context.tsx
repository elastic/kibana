/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren } from 'react';
import type { ClientToolsMap } from '../../embeddable/types';

interface ClientToolsContextValue {
  clientTools?: ClientToolsMap;
}

const ClientToolsContext = createContext<ClientToolsContextValue>({
  clientTools: undefined,
});

export const ClientToolsProvider: React.FC<PropsWithChildren<ClientToolsContextValue>> = ({
  children,
  clientTools,
}) => {
  return (
    <ClientToolsContext.Provider value={{ clientTools }}>
      {children}
    </ClientToolsContext.Provider>
  );
};

export const useClientTools = () => {
  const context = useContext(ClientToolsContext);
  return context.clientTools;
};

