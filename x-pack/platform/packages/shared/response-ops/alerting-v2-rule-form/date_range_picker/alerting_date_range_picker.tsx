/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { map } from 'rxjs';
import type {
  ApplicationStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useObservable } from '@kbn/use-observable';
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

const toRecentRanges = (ranges: Array<{ from: string; to: string }>): PresetItem[] =>
  ranges.map(({ from, to }) => ({ start: from, end: to }));

export interface AlertingDateRangePickerServices {
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  http: HttpStart;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
}

export interface AlertingDateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  services: AlertingDateRangePickerServices;
  /** When provided, wires the picker's built-in auto-refresh control. */
  onRefresh?: () => void;
  isLoading?: boolean;
  showTimeWindowButtons?: boolean | TimeWindowButtonsConfig;
  width?: 'auto' | 'restricted' | 'full';
  compressed?: boolean;
  /**
   * Whether saved presets are persisted via `data.dateRangePickerPresets` (shared
   * user storage, also surfaced in Discover/Dashboard). When `false`, presets are
   * the read-only quick-ranges defaults.
   * @default true
   */
  persistPresets?: boolean;
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
  services: { data, notifications, http, application, uiSettings },
  onRefresh,
  isLoading = false,
  showTimeWindowButtons = false,
  width = 'auto',
  compressed = true,
  persistPresets = true,
  'data-test-subj': dataTestSubj,
}: AlertingDateRangePickerProps) => {
  const [dateRangePickerSettings, setDateRangePickerSettings] = useState<DateRangePickerSettings>(
    DEFAULT_DATE_PICKER_SETTINGS
  );
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshSettings>(DEFAULT_AUTO_REFRESH);

  const dateRangePickerPresets = useDateRangePickerPresets({
    service: data.dateRangePickerPresets,
    persistenceEnabled: persistPresets,
    notifications,
  });

  // Same global history used by unified search's query bar (Discover, Dashboard, etc.).
  const timeHistory = data.query.timefilter.history;
  const recentRanges$ = useMemo(() => timeHistory.get$().pipe(map(toRecentRanges)), [timeHistory]);
  const recentTimeRanges = useObservable(recentRanges$, toRecentRanges(timeHistory.get()));

  const value = `${from} to ${to}`;
  const timeZone = uiSettings.get<string>('dateFormat:tz', 'Browser');
  const dateFormat = uiSettings.get<string>('dateFormat');
  const canAccessAdvancedSettings =
    (application.capabilities.advancedSettings?.save as boolean | undefined) ?? false;

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
      timeHistory.add({ from: start, to: end });
    },
    [onChange, timeHistory]
  );

  const handleSettingsChange = useCallback(
    (next: DateRangePickerSettings) => {
      const { autoRefresh: nextAutoRefresh, ...rest } = next;
      setDateRangePickerSettings(rest);
      if (onRefresh && nextAutoRefresh) {
        setAutoRefresh((prev) => {
          // When enabling auto-refresh, clear isPaused so the timer starts immediately.
          if (!prev.isEnabled && nextAutoRefresh.isEnabled) {
            return { ...nextAutoRefresh, isPaused: false };
          }
          return nextAutoRefresh;
        });
      }
    },
    [onRefresh]
  );

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
      dateFormat={dateFormat}
      timeZone={timeZone}
      prependBasePath={http.basePath.prepend}
      canAccessAdvancedSettings={canAccessAdvancedSettings}
      data-test-subj={dataTestSubj}
    />
  );
};
