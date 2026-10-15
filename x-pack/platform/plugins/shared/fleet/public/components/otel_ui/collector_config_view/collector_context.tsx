/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';

interface CollectorContextValue {
  serviceInstanceId?: string;
  enrolledAt?: string;
  /** ISO timestamp of the last check-in for an offline/inactive collector. When set, metric
   * queries cap their upper bound at this time so they show the collector's last reported values
   * rather than leaking live metrics from a newly enrolled collector on the same host. */
  offlineAt?: string;
}

const CollectorContext = createContext<CollectorContextValue>({});

export const CollectorContextProvider: React.FC<{
  serviceInstanceId?: string;
  enrolledAt?: string;
  offlineAt?: string;
  children: React.ReactNode;
}> = ({ serviceInstanceId, enrolledAt, offlineAt, children }) => {
  const value = useMemo(
    () => ({ serviceInstanceId, enrolledAt, offlineAt }),
    [serviceInstanceId, enrolledAt, offlineAt]
  );
  return <CollectorContext.Provider value={value}>{children}</CollectorContext.Provider>;
};

export const useCollectorContext = () => useContext(CollectorContext);
