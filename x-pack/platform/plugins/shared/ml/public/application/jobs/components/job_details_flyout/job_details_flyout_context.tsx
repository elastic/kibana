/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState } from 'react';

interface JobDetailsContextValue {
  activeJobId: string | null;
  setActiveJobId: (jobId: string | null) => void;
  isFlyoutOpen: boolean;
  setIsFlyoutOpen: (isOpen: boolean) => void;
}

export const JobDetailsContext = createContext<JobDetailsContextValue>({
  activeJobId: null,
  setActiveJobId: () => {},
  isFlyoutOpen: false,
  setIsFlyoutOpen: () => {},
});

export const useJobDetailFlyout = () => useContext(JobDetailsContext);

export const JobDetailsFlyoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  return (
    <JobDetailsContext.Provider
      value={{
        activeJobId,
        setActiveJobId,
        isFlyoutOpen,
        setIsFlyoutOpen,
      }}
    >
      {children}
    </JobDetailsContext.Provider>
  );
};
