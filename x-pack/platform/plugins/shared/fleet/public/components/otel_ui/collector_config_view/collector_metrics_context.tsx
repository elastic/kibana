/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';

interface CollectorMetricsContextValue {
  serviceInstanceId?: string;
}

const CollectorMetricsContext = createContext<CollectorMetricsContextValue>({});

export const CollectorMetricsProvider: React.FC<{
  serviceInstanceId?: string;
  children: React.ReactNode;
}> = ({ serviceInstanceId, children }) => {
  const value = useMemo(() => ({ serviceInstanceId }), [serviceInstanceId]);
  return (
    <CollectorMetricsContext.Provider value={value}>{children}</CollectorMetricsContext.Provider>
  );
};

export const useCollectorMetrics = () => useContext(CollectorMetricsContext);
