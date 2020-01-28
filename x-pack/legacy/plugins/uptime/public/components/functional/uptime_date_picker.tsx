/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React, { useContext } from 'react';
import { useUrlParams } from '../../hooks';
import { CLIENT_DEFAULTS } from '../../../common/constants';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../contexts';

// TODO: when EUI exports types for this, this should be replaced
interface SuperDateRangePickerRangeChangedEvent {
  start: string;
  end: string;
}

interface SuperDateRangePickerRefreshChangedEvent {
  isPaused: boolean;
  refreshInterval?: number;
}

export interface CommonlyUsedRange {
  from: string;
  to: string;
  display: string;
}

export const UptimeDatePicker = () => {
  const [getUrlParams, updateUrl] = useUrlParams();
  const { autorefreshInterval, autorefreshIsPaused, dateRangeStart, dateRangeEnd } = getUrlParams();
  const { commonlyUsedRanges } = useContext(UptimeSettingsContext);
  const { refreshApp } = useContext(UptimeRefreshContext);

  const euiCommonlyUsedRanges = commonlyUsedRanges
    ? commonlyUsedRanges.map(
        ({ from, to, display }: { from: string; to: string; display: string }) => {
          return {
            start: from,
            end: to,
            label: display,
          };
        }
      )
    : CLIENT_DEFAULTS.COMMONLY_USED_DATE_RANGES;

  return (
    <EuiSuperDatePicker
      start={dateRangeStart}
      end={dateRangeEnd}
      commonlyUsedRanges={euiCommonlyUsedRanges}
      isPaused={autorefreshIsPaused}
      refreshInterval={autorefreshInterval}
      onTimeChange={({ start, end }: SuperDateRangePickerRangeChangedEvent) => {
        updateUrl({ dateRangeStart: start, dateRangeEnd: end });
        refreshApp();
      }}
      onRefresh={refreshApp}
      onRefreshChange={({ isPaused, refreshInterval }: SuperDateRangePickerRefreshChangedEvent) => {
        updateUrl({
          autorefreshInterval:
            refreshInterval === undefined ? autorefreshInterval : refreshInterval,
          autorefreshIsPaused: isPaused,
        });
      }}
    />
  );
};
