/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { TimeHistory, TimeRange } from 'src/legacy/ui/public/timefilter/time_history';
import { Timefilter } from 'ui/timefilter';

interface Props {
  dateFormat: string;
  forceRefresh: () => void;
  timeHistory: TimeHistory;
  timefilter: Timefilter;
}

interface Duration {
  start: string;
  end: string;
}

function getRecentlyUsedRanges(timeHistory: TimeHistory): Duration[] {
  return timeHistory.get().map(({ from, to }: TimeRange) => {
    return {
      start: from,
      end: to,
    };
  });
}

export const TopNav: FC<Props> = ({ dateFormat, forceRefresh, timeHistory, timefilter }) => {
  const [refreshInterval, setRefreshInterval] = useState(timefilter.getRefreshInterval());
  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges(timeHistory));
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled
  );

  useEffect(() => {
    timefilter.on('refreshIntervalUpdate', timefilterUpdateListener);
    timefilter.on('timeUpdate', timefilterUpdateListener);
    timefilter.on('enabledUpdated', timefilterUpdateListener);

    return function cleanup() {
      timefilter.off('refreshIntervalUpdate', timefilterUpdateListener);
      timefilter.off('timeUpdate', timefilterUpdateListener);
      timefilter.off('enabledUpdated', timefilterUpdateListener);
    };
  }, []);

  useEffect(() => {
    // Force re-render with up-to-date values when isTimeRangeSelectorEnabled/isAutoRefreshSelectorEnabled are changed.
    timefilterUpdateListener();
  }, [isTimeRangeSelectorEnabled, isAutoRefreshSelectorEnabled]);

  function timefilterUpdateListener() {
    setTime(timefilter.getTime());
    setRefreshInterval(timefilter.getRefreshInterval());
    setIsAutoRefreshSelectorEnabled(timefilter.isAutoRefreshSelectorEnabled);
    setIsTimeRangeSelectorEnabled(timefilter.isTimeRangeSelectorEnabled);
  }

  function updateFilter({ start, end }: Duration) {
    const newTime = { from: start, to: end };
    // Update timefilter for controllers listening for changes
    timefilter.setTime(newTime);
    setTime(newTime);
    setRecentlyUsedRanges(getRecentlyUsedRanges(timeHistory));
  }

  function updateInterval({
    isPaused,
    refreshInterval: interval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    const newInterval = {
      pause: isPaused,
      value: interval,
    };
    // Update timefilter for controllers listening for changes
    timefilter.setRefreshInterval(newInterval);
    // Update state
    setRefreshInterval(newInterval);
  }

  return (
    <Fragment>
      {(isAutoRefreshSelectorEnabled || isTimeRangeSelectorEnabled) && (
        <div className="mlNavigationMenu__topNav">
          <EuiSuperDatePicker
            start={time.from}
            end={time.to}
            isPaused={refreshInterval.pause}
            isAutoRefreshOnly={!isTimeRangeSelectorEnabled}
            refreshInterval={refreshInterval.value}
            onTimeChange={updateFilter}
            onRefresh={forceRefresh}
            onRefreshChange={updateInterval}
            recentlyUsedRanges={recentlyUsedRanges}
            dateFormat={dateFormat}
          />
        </div>
      )}
    </Fragment>
  );
};
