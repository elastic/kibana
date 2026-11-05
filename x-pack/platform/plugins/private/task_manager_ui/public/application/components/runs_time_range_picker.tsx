/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import moment from 'moment';
import { map } from 'rxjs';
import { EuiFlexGroup, EuiFlexItem, EuiFormErrorText, EuiIconTip, EuiText } from '@elastic/eui';
import {
  DateRangePicker,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
  type FirstDayOfWeek,
} from '@kbn/date-range-picker';
import { useDateRangePickerPresets, type PresetItem } from '@kbn/date-range-picker-presets';
import { i18n } from '@kbn/i18n';
import { useObservable } from '@kbn/use-observable';
import { useTaskManagerUiAppContext } from '../app_context';
import { getRunsTimeRangeError, type RunsTimeRange } from '../lib/runs_time_range';

const isFirstDayOfWeek = (day: number): day is FirstDayOfWeek => day >= 0 && day <= 6;

const isWithinMaxRunsWindow = ({ start, end }: PresetItem) =>
  getRunsTimeRangeError({ start, end }) === undefined;

const toRecentRanges = (ranges: Array<{ from: string; to: string }>): PresetItem[] =>
  ranges.map(({ from, to }) => ({ start: from, end: to })).filter(isWithinMaxRunsWindow);

interface RejectedInput {
  value: string;
  rangeError?: string;
  /** The applied time range when the input was rejected. */
  appliedValue: string;
}

export const RunsTimeRangePicker: React.FC<{
  timeRange: RunsTimeRange;
  onChange: (timeRange: RunsTimeRange) => void;
}> = ({ timeRange, onChange }) => {
  const { uiSettings, notifications, data } = useTaskManagerUiAppContext();
  const appliedValue = `${timeRange.start} to ${timeRange.end}`;
  const [rejectedInput, setRejectedInput] = useState<RejectedInput>();
  const [settings, setSettings] = useState<DateRangePickerSettings>({ roundRelativeTime: false });

  // A time range applied from outside, such as with the back button, replaces the rejected input.
  const rejected = rejectedInput?.appliedValue === appliedValue ? rejectedInput : undefined;
  const rangeError = rejected?.rangeError;

  const { presets, onPresetSave, onPresetDelete } = useDateRangePickerPresets({
    service: data.dateRangePickerPresets,
    persistenceEnabled: true,
    notifications,
  });
  const presetsWithinMaxRunsWindow = useMemo(
    () => presets.filter(isWithinMaxRunsWindow),
    [presets]
  );

  const timeHistory = data.query.timefilter.history;
  const recentRanges$ = useMemo(() => timeHistory.get$().pipe(map(toRecentRanges)), [timeHistory]);
  const recentRanges = useObservable(recentRanges$, toRecentRanges(timeHistory.get()));

  const timeZone = uiSettings.get<string>('dateFormat:tz', 'Browser');
  const dateFormat = uiSettings.get<string>('dateFormat');
  const dayOfWeekSetting = uiSettings.get<string>('dateFormat:dow');

  const inputDateFormats = useMemo(() => (dateFormat ? [dateFormat] : undefined), [dateFormat]);
  const calendarOptions = useMemo(() => {
    const firstDayOfWeek = moment.weekdays().indexOf(dayOfWeekSetting);
    return isFirstDayOfWeek(firstDayOfWeek) ? { firstDayOfWeek } : undefined;
  }, [dayOfWeekSetting]);

  const handleChange = ({
    start,
    end,
    value: nextValue,
    isInvalid: isInputInvalid,
  }: DateRangePickerOnChangeProps) => {
    const nextRangeError = isInputInvalid ? undefined : getRunsTimeRangeError({ start, end });
    if (isInputInvalid || nextRangeError) {
      setRejectedInput({ value: nextValue, rangeError: nextRangeError, appliedValue });
      return;
    }
    setRejectedInput(undefined);
    onChange({ start, end });
    timeHistory.add({ from: start, to: end });
  };

  return (
    <EuiFlexGroup direction="column" alignItems="flexEnd" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.taskManagerUi.timeRange.label', {
                defaultMessage: 'Run history',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="info"
              color="subdued"
              content={i18n.translate('xpack.taskManagerUi.timeRange.hint', {
                defaultMessage:
                  'Applies to run counts and failures. Task counts, statuses and overdue tasks are always current.',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DateRangePicker
              value={rejected?.value ?? appliedValue}
              onChange={handleChange}
              onInputChange={() => setRejectedInput(undefined)}
              isInvalid={rejected !== undefined}
              presets={presetsWithinMaxRunsWindow}
              recent={recentRanges}
              onPresetSave={onPresetSave}
              onPresetDelete={onPresetDelete}
              settings={settings}
              onSettingsChange={setSettings}
              inputDateFormats={inputDateFormats}
              timeZone={timeZone}
              calendarOptions={calendarOptions}
              compressed
              width="auto"
              data-test-subj="taskManagerUiTimeRangePicker"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {rangeError && (
        <EuiFlexItem grow={false}>
          <EuiFormErrorText data-test-subj="taskManagerUiTimeRangeError">
            {rangeError}
          </EuiFormErrorText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
