/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import { EuiSuperDatePicker } from '@elastic/eui';
import { TimeHistory } from 'ui/timefilter';
import { TimeRange } from 'src/plugins/data/public';

import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';
import { useUiContext } from '../../../contexts/ui/use_ui_context';

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
  const { chrome, timefilter, timeHistory } = useUiContext();
  const getRecentlyUsedRanges = getRecentlyUsedRangesFactory(timeHistory);

  const [refreshInterval, setRefreshInterval] = useState(timefilter.getRefreshInterval());
  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges());
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled()
  );

  const dateFormat = chrome.getUiSettingsClient().get('dateFormat');

  useEffect(() => {
    const subscriptions = new Subscription();
    subscriptions.add(timefilter.getRefreshIntervalUpdate$().subscribe(timefilterUpdateListener));
    subscriptions.add(timefilter.getTimeUpdate$().subscribe(timefilterUpdateListener));
    subscriptions.add(timefilter.getEnabledUpdated$().subscribe(timefilterUpdateListener));

    return function cleanup() {
      subscriptions.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Force re-render with up-to-date values when isTimeRangeSelectorEnabled/isAutoRefreshSelectorEnabled are changed.
    timefilterUpdateListener();
  }, [isTimeRangeSelectorEnabled, isAutoRefreshSelectorEnabled]);

  function timefilterUpdateListener() {
    setTime(timefilter.getTime());
    setRefreshInterval(timefilter.getRefreshInterval());
    setIsAutoRefreshSelectorEnabled(timefilter.isAutoRefreshSelectorEnabled());
    setIsTimeRangeSelectorEnabled(timefilter.isTimeRangeSelectorEnabled());
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
