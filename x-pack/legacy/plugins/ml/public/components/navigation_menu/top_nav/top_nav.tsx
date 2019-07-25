/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useState, useEffect } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { TimeHistory, TimeRange } from 'ui/timefilter/time_history';

import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';
import { NavigationMenuContext } from '../../../util/context_utils';

interface Duration {
  start: string;
  end: string;
}

function getRecentlyUsedRangesFactory(timeHistory: TimeHistory) {
  return function(): Duration[] {
    return timeHistory.get().map(({ from, to }: TimeRange) => {
      return {
        start: from,
        end: to,
      };
    });
  };
}

export const TopNav: FC = () => {
  const navigationMenuContext = useContext(NavigationMenuContext);
  const timefilter = navigationMenuContext.timefilter;
  const getRecentlyUsedRanges = getRecentlyUsedRangesFactory(navigationMenuContext.timeHistory);

  const [refreshInterval, setRefreshInterval] = useState(timefilter.getRefreshInterval());
  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges());
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled
  );

  const dateFormat = navigationMenuContext.chrome.getUiSettingsClient().get('dateFormat');

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
    setRecentlyUsedRanges(getRecentlyUsedRanges());
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
            onRefresh={() => mlTimefilterRefresh$.next()}
            onRefreshChange={updateInterval}
            recentlyUsedRanges={recentlyUsedRanges}
            dateFormat={dateFormat}
          />
        </div>
      )}
    </Fragment>
  );
};
