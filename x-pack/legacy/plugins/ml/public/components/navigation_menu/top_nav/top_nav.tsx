/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useState, useEffect } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { TimeHistory, TimeRange } from 'src/legacy/ui/public/timefilter/time_history';
import { timefilter } from '../../../../common/timefilter';

interface Props {
  dateFormat: string;
  timeHistory: TimeHistory;
}

function getRecentlyUsedRanges(timeHistory: TimeHistory): Array<{ start: string; end: string }> {
  return timeHistory.get().map(({ from, to }: TimeRange) => {
    return {
      start: from,
      end: to,
    };
  });
}

export const TopNav: SFC<Props> = ({ dateFormat, timeHistory }) => {
  const [refreshInterval, setRefreshInterval] = useState(timefilter.getRefreshInterval());
  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges(timeHistory));

  useEffect(() => {
    const subscription = timefilter.subscribeToUpdates(timefilterUpdateListener);

    return function cleanup() {
      subscription.unsubscribe();
    };
  }, []);

  function timefilterUpdateListener() {
    setTime(timefilter.getTime());
    setRefreshInterval(timefilter.getRefreshInterval());
  }

  function updateFilter({ start, end }: { start: string; end: string }) {
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
    (timefilter.isAutoRefreshSelectorEnabled || timefilter.isTimeRangeSelectorEnabled) && (
      <EuiSuperDatePicker
        start={time.from}
        end={time.to}
        isPaused={refreshInterval.pause}
        isAutoRefreshOnly={!timefilter.isAutoRefreshSelectorEnabled()}
        refreshInterval={refreshInterval.value}
        onTimeChange={updateFilter}
        onRefresh={updateFilter}
        onRefreshChange={updateInterval}
        recentlyUsedRanges={recentlyUsedRanges}
        dateFormat={dateFormat}
      />
    )
  );
};
