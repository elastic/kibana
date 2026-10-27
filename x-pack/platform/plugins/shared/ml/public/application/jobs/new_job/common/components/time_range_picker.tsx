/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  DateRangePicker,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
} from '@kbn/date-range-picker';
import { useDateRangePickerPresets } from '@kbn/date-range-picker-presets';
import { useMlKibana } from '../../../../contexts/kibana';

const WIDTH = '512px';

const DEFAULT_DATE_RANGE_PICKER_SETTINGS: DateRangePickerSettings = {
  roundRelativeTime: false,
  timePrecision: 'none',
};

export interface TimeRange {
  start: number;
  end: number;
}

interface Props {
  setTimeRange: (d: TimeRange) => void;
  timeRange: TimeRange;
}

export const TimeRangePicker: FC<Props> = ({ setTimeRange, timeRange }) => {
  const {
    services: { uiSettings, data, notifications, http },
  } = useMlKibana();
  const dateFormat: string = uiSettings.get('dateFormat');
  const timeZone: string = uiSettings.get('dateFormat:tz');
  const inputDateFormats = useMemo(() => [dateFormat], [dateFormat]);

  const [isInvalid, setIsInvalid] = useState(false);
  const [settings, setSettings] = useState<DateRangePickerSettings>(
    DEFAULT_DATE_RANGE_PICKER_SETTINGS
  );

  const dateRangePickerPresets = useDateRangePickerPresets({
    service: data.dateRangePickerPresets,
    persistenceEnabled: true,
    notifications,
  });

  // The job needs absolute bounds, so the parent's epoch times are shown as an absolute range.
  const value = `${new Date(timeRange.start).toISOString()} to ${new Date(
    timeRange.end
  ).toISOString()}`;

  const onChange = useCallback(
    ({ startDate, endDate, isInvalid: isRangeInvalid }: DateRangePickerOnChangeProps) => {
      setIsInvalid(isRangeInvalid);
      if (isRangeInvalid || startDate === null || endDate === null) return;
      // Relative input such as "last 7 days" is resolved to absolute times when applied.
      setTimeRange({ start: startDate.getTime(), end: endDate.getTime() });
    },
    [setTimeRange]
  );

  const onInputChange = useCallback(() => {
    setIsInvalid(false);
  }, []);

  return (
    <div style={{ minWidth: WIDTH }} data-test-subj="mlJobWizardDateRange">
      <DateRangePicker
        value={value}
        onChange={onChange}
        onInputChange={onInputChange}
        isInvalid={isInvalid}
        width="full"
        compressed={false}
        presets={dateRangePickerPresets.presets}
        onPresetSave={dateRangePickerPresets.onPresetSave}
        onPresetDelete={dateRangePickerPresets.onPresetDelete}
        settings={settings}
        onSettingsChange={setSettings}
        inputDateFormats={inputDateFormats}
        timeZone={timeZone}
        prependBasePath={http.basePath.prepend}
      />
    </div>
  );
};
