/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DateRangePicker,
  type AutoRefreshSettings,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
  type TimeWindowButtonsConfig,
} from '@kbn/date-range-picker';
import { useDateRangePickerPresets, type PresetItem } from '@kbn/date-range-picker-presets';

const DEFAULT_DATE_PICKER_SETTINGS: DateRangePickerSettings = {
  roundRelativeTime: false,
  timePrecision: 'none',
};

const DEFAULT_AUTO_REFRESH: AutoRefreshSettings = {
  isEnabled: false,
  isPaused: true,
  intervalMs: 60_000,
  intervalDisplayUnit: 's',
};

const MAX_RECENT_RANGES = 10;

export interface AlertingDateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  /** When provided, wires the picker's built-in auto-refresh control. */
  onRefresh?: () => void;
  isLoading?: boolean;
  showTimeWindowButtons?: boolean | TimeWindowButtonsConfig;
  width?: 'auto' | 'restricted' | 'full';
  compressed?: boolean;
  'data-test-subj'?: string;
}

/**
 * Shared Alerting v2 wrapper around `@kbn/date-range-picker` that owns settings,
 * persisted presets, recent ranges, and optional auto-refresh.
 */
export const AlertingDateRangePicker = ({
  from,
  to,
  onChange,
  data,
  notifications,
  onRefresh,
  isLoading = false,
  showTimeWindowButtons = false,
  width = 'auto',
  compressed = true,
  'data-test-subj': dataTestSubj,
}: AlertingDateRangePickerProps) => {
  const [dateRangePickerSettings, setDateRangePickerSettings] = useState<DateRangePickerSettings>(
    DEFAULT_DATE_PICKER_SETTINGS
  );
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshSettings>(DEFAULT_AUTO_REFRESH);
  const [recentTimeRanges, setRecentTimeRanges] = useState<PresetItem[]>([]);

  const dateRangePickerPresets = useDateRangePickerPresets({
    service: data.dateRangePickerPresets,
    persistenceEnabled: true,
    notifications,
  });

  const value = `${from} to ${to}`;

  const settings = useMemo(
    () => (onRefresh ? { ...dateRangePickerSettings, autoRefresh } : dateRangePickerSettings),
    [dateRangePickerSettings, autoRefresh, onRefresh]
  );

  const handleChange = useCallback(
    ({ start, end, isInvalid }: DateRangePickerOnChangeProps) => {
      if (isInvalid) {
        return;
      }
      onChange({ from: start, to: end });
      setRecentTimeRanges((prev) => {
        const key = `${start}|${end}`;
        const deduped = prev.filter((range) => `${range.start}|${range.end}` !== key);
        return [{ start, end }, ...deduped].slice(0, MAX_RECENT_RANGES);
      });
    },
    [onChange]
  );

  const handleSettingsChange = useCallback((next: DateRangePickerSettings) => {
    const { autoRefresh: nextAutoRefresh, ...rest } = next;
    setDateRangePickerSettings(rest);
    if (nextAutoRefresh) {
      setAutoRefresh((prev) => {
        // When enabling auto-refresh, clear isPaused so the timer starts immediately.
        if (!prev.isEnabled && nextAutoRefresh.isEnabled) {
          return { ...nextAutoRefresh, isPaused: false };
        }
        return nextAutoRefresh;
      });
    }
  }, []);

  return (
    <DateRangePicker
      value={value}
      onChange={handleChange}
      isLoading={isLoading}
      showTimeWindowButtons={showTimeWindowButtons}
      presets={dateRangePickerPresets.presets}
      recent={recentTimeRanges}
      onPresetSave={dateRangePickerPresets.onPresetSave}
      onPresetDelete={dateRangePickerPresets.onPresetDelete}
      settings={settings}
      onSettingsChange={handleSettingsChange}
      onRefresh={onRefresh}
      width={width}
      compressed={compressed}
      data-test-subj={dataTestSubj}
    />
  );
};
