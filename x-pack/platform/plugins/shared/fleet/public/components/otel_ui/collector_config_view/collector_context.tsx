/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';

interface CollectorContextValue {
  serviceInstanceId?: string;
}

const CollectorContext = createContext<CollectorContextValue>({});

export const CollectorContextProvider: React.FC<{
  serviceInstanceId?: string;
  children: React.ReactNode;
}> = ({ serviceInstanceId, children }) => {
  const value = useMemo(() => ({ serviceInstanceId }), [serviceInstanceId]);
  return <CollectorContext.Provider value={value}>{children}</CollectorContext.Provider>;
};

export const useCollectorContext = () => useContext(CollectorContext);
