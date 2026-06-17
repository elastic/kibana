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
  DATA_FRAME_ANALYTICS_DETAILS = 'dataFrameAnalyticsDetails',
}
interface JobInfoFlyoutsContextValue {
  activeJobId: string | null;
  setActiveJobId: (jobId: string | null) => void;
  activeFlyout: FlyoutType | null;
  setActiveFlyout: (flyout: FlyoutType | null) => void;
  isDetailFlyoutOpen: boolean;
  isDatafeedChartFlyoutOpen: boolean;
  closeActiveFlyout: () => void;
  isDataFrameAnalyticsDetailsFlyoutOpen: boolean;
}

export const JobInfoFlyoutsContext = createContext<JobInfoFlyoutsContextValue>({
  activeJobId: null,
  setActiveJobId: () => {},
  activeFlyout: null,
  setActiveFlyout: () => {},
  isDetailFlyoutOpen: false,
  isDatafeedChartFlyoutOpen: false,
  closeActiveFlyout: () => {},
  isDataFrameAnalyticsDetailsFlyoutOpen: false,
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
  const isDataFrameAnalyticsDetailsFlyoutOpen = useMemo(
    () => activeFlyout === FlyoutType.DATA_FRAME_ANALYTICS_DETAILS,
    [activeFlyout]
  );
  const closeActiveFlyout = useCallback(() => {
    setActiveJobId(null);
    setActiveFlyout(null);
  }, [setActiveJobId, setActiveFlyout]);

  return (
    <JobInfoFlyoutsContext.Provider
      value={{
        activeJobId,
        setActiveJobId,
        isDetailFlyoutOpen,
        isDatafeedChartFlyoutOpen,
        isDataFrameAnalyticsDetailsFlyoutOpen,
        setActiveFlyout,
        activeFlyout,
        closeActiveFlyout,
      }}
    >
      {children}
    </JobInfoFlyoutsContext.Provider>
  );
};
