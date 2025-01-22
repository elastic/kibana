/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

export enum FlyoutType {
  JOB_DETAILS = 'jobDetails',
  DATAFEED_CHART = 'datafeedChart',
}
interface JobInfoFlyoutsContextValue {
  activeJobId: string | null;
  setActiveJobId: (jobId: string | null) => void;
  activeFlyout: FlyoutType | null;
  setActiveFlyout: (flyout: FlyoutType | null) => void;
  isDetailFlyoutOpen: boolean;
  isDatafeedChartFlyoutOpen: boolean;
  closeActiveFlyout: () => void;
}

export const JobInfoFlyoutsContext = createContext<JobInfoFlyoutsContextValue>({
  activeJobId: null,
  setActiveJobId: () => {},
  activeFlyout: null,
  setActiveFlyout: () => {},
  isDetailFlyoutOpen: false,
  isDatafeedChartFlyoutOpen: false,
});

export const useJobInfoFlyouts = () => useContext(JobInfoFlyoutsContext);

export const JobInfoFlyoutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeFlyout, setActiveFlyout] = useState<FlyoutType | null>(null);
  const isDetailFlyoutOpen = useMemo(() => activeFlyout === FlyoutType.JOB_DETAILS, [activeFlyout]);
  const isDatafeedChartFlyoutOpen = useMemo(
    () => activeFlyout === FlyoutType.DATAFEED_CHART,
    [activeFlyout]
  );
  const closeActiveFlyout = useCallback(() => {
    setActiveFlyout(null);
  }, [setActiveFlyout]);

  return (
    <JobInfoFlyoutsContext.Provider
      value={{
        activeJobId,
        setActiveJobId,
        isDetailFlyoutOpen,
        isDatafeedChartFlyoutOpen,
        setActiveFlyout,
        activeFlyout,
        closeActiveFlyout,
      }}
    >
      {children}
    </JobInfoFlyoutsContext.Provider>
  );
};
