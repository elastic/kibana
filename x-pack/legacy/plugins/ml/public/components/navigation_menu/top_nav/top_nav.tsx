/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, FC, Fragment, useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import { EuiSuperDatePicker, EuiSuperDatePickerProps } from '@elastic/eui';
import { TimeHistory } from 'ui/timefilter';
import { TimeRange } from 'src/plugins/data/public';

import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';
import { useUiContext } from '../../../contexts/ui/use_ui_context';

interface ComponentWithConstructor<T> extends Component {
  new (): Component<T>;
}

const MlSuperDatePicker = (EuiSuperDatePicker as any) as ComponentWithConstructor<
  EuiSuperDatePickerProps
>;

// This part fixes a problem with EuiSuperDater picker where it would not reflect
// a prop change of isPaused on the internal interval. This fix will be released
// with EUI 13.7.0 but only 13.6.1 without the fix made it into Kibana 7.4 so
// it's copied here.
export class MlSuperDatePickerWithUpdate extends MlSuperDatePicker {
  componentDidUpdate = () => {
    // @ts-ignore
    this.stopInterval();
    if (!this.props.isPaused) {
      // @ts-ignore
      this.startInterval(this.props.refreshInterval);
    }
  };
}

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
    timefilter.getIsAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.getIsTimeRangeSelectorEnabled()
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
    setIsAutoRefreshSelectorEnabled(timefilter.getIsAutoRefreshSelectorEnabled());
    setIsTimeRangeSelectorEnabled(timefilter.getIsTimeRangeSelectorEnabled());
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
          <MlSuperDatePickerWithUpdate
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
