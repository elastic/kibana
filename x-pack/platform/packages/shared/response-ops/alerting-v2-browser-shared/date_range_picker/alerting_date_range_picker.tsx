/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { distinctUntilChanged, map } from 'rxjs';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ApplicationStart,
  FeatureFlagsStart,
  HttpStart,
  IUiSettingsClient,
  NotificationsStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useObservable } from '@kbn/use-observable';
import {
  DATE_RANGE_PICKER_FEATURE_FLAG,
  DateRangePicker,
  type AutoRefreshSettings,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
  type TimeWindowButtonsConfig,
} from '@kbn/date-range-picker';
import { useDateRangePickerPresets, type PresetItem } from '@kbn/date-range-picker-presets';
import { LegacyDateRangePicker } from './legacy_date_range_picker';

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

const REFRESH_LABEL = i18n.translate('xpack.alertingV2.dateRangePicker.refreshButtonLabel', {
  defaultMessage: 'Refresh',
});

export interface AlertingDateRangePickerServices {
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  http: HttpStart;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  featureFlags: FeatureFlagsStart;
}

export interface AlertingDateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  services: AlertingDateRangePickerServices;
  onRefresh?: () => void;
  isLoading?: boolean;
  showTimeWindowButtons?: boolean | TimeWindowButtonsConfig;
  width?: 'auto' | 'restricted' | 'full';
  compressed?: boolean;
  /** Hide the date range label and show only the duration badge. @default false */
  collapsed?: boolean;
  persistPresets?: boolean;
  'data-test-subj'?: string;
}

export const AlertingDateRangePicker = ({
  from,
  to,
  onChange,
  services: { data, notifications, http, application, uiSettings, featureFlags },
  onRefresh,
  isLoading = false,
  showTimeWindowButtons = false,
  width = 'auto',
  compressed = true,
  collapsed = false,
  persistPresets = true,
  'data-test-subj': dataTestSubj,
}: AlertingDateRangePickerProps) => {
  const [dateRangePickerSettings, setDateRangePickerSettings] = useState<DateRangePickerSettings>(
    DEFAULT_DATE_PICKER_SETTINGS
  );
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshSettings>(DEFAULT_AUTO_REFRESH);
  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);

  const isDateRangePickerEnabled$ = useMemo(
    () =>
      featureFlags
        .getBooleanValue$(DATE_RANGE_PICKER_FEATURE_FLAG, true)
        .pipe(distinctUntilChanged()),
    [featureFlags]
  );
  const isDateRangePickerEnabled = useObservable(
    isDateRangePickerEnabled$,
    featureFlags.getBooleanValue(DATE_RANGE_PICKER_FEATURE_FLAG, true)
  );

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
  const inputDateFormats = useMemo(() => (dateFormat ? [dateFormat] : undefined), [dateFormat]);
  const canAccessAdvancedSettings =
    (application.capabilities.advancedSettings?.save as boolean | undefined) ?? false;

  const settings = useMemo(
    () => (onRefresh ? { ...dateRangePickerSettings, autoRefresh } : dateRangePickerSettings),
    [dateRangePickerSettings, autoRefresh, onRefresh]
  );

  const handleChange = useCallback(
    ({ start, end, isInvalid }: DateRangePickerOnChangeProps) => {
      setIsDateRangeInvalid(isInvalid);
      if (isInvalid) {
        return;
      }
      onChange({ from: start, to: end });
      timeHistory.add({ from: start, to: end });
    },
    [onChange, timeHistory]
  );

  const handleInputChange = useCallback(() => {
    setIsDateRangeInvalid(false);
  }, []);

  const handleSettingsChange = useCallback(
    (next: DateRangePickerSettings) => {
      const { autoRefresh: nextAutoRefresh, ...rest } = next;
      setDateRangePickerSettings(rest);
      if (onRefresh && nextAutoRefresh) {
        setAutoRefresh((prev) => {
          if (!prev.isEnabled && nextAutoRefresh.isEnabled) {
            return { ...nextAutoRefresh, isPaused: false };
          }
          return nextAutoRefresh;
        });
      }
    },
    [onRefresh]
  );

  const canManuallyRefresh = Boolean(onRefresh);

  if (!isDateRangePickerEnabled) {
    return (
      <LegacyDateRangePicker
        from={from}
        to={to}
        onChange={onChange}
        timeHistory={timeHistory}
        onRefresh={onRefresh}
        isLoading={isLoading}
        width={width}
        compressed={compressed}
        dateFormat={dateFormat}
        data-test-subj={dataTestSubj}
      />
    );
  }

  const picker = (
    <DateRangePicker
      value={value}
      onChange={handleChange}
      onInputChange={handleInputChange}
      isInvalid={isDateRangeInvalid}
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
      collapsed={collapsed}
      inputDateFormats={inputDateFormats}
      timeZone={timeZone}
      prependBasePath={http.basePath.prepend}
      canAccessAdvancedSettings={canAccessAdvancedSettings}
      data-test-subj={dataTestSubj}
    />
  );

  if (!canManuallyRefresh) {
    return picker;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{picker}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={REFRESH_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="refresh"
            display="base"
            size="s"
            aria-label={REFRESH_LABEL}
            onClick={onRefresh}
            isLoading={isLoading}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-refresh` : 'alertingDateRangeRefresh'}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
