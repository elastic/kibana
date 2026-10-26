/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Subscription, map } from 'rxjs';
import { debounce } from 'lodash';

import type { OnRefreshProps } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperUpdateButton,
  EuiToolTip,
} from '@elastic/eui';

import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState } from '@kbn/ml-url-state';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useObservable } from '@kbn/use-observable';
import {
  DateRangePicker,
  type DateRangePickerProps,
  type AutoRefreshIntervalUnit,
  type AutoRefreshSettings,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
} from '@kbn/date-range-picker';
import { useDateRangePickerPresets, type PresetItem } from '@kbn/date-range-picker-presets';

import { useRefreshIntervalUpdates, useTimeRangeUpdates } from '../hooks/use_timefilter';
import { useDatePickerContext } from '../hooks/use_date_picker_context';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

const DEFAULT_REFRESH_INTERVAL_MS = 5000;

const DEFAULT_DATE_RANGE_PICKER_SETTINGS: DateRangePickerSettings = {
  roundRelativeTime: false,
  timePrecision: 'none',
};

const toPresetItems = (ranges: TimeRange[]): PresetItem[] =>
  ranges.map(({ from, to }) => ({ start: from, end: to }));

interface RefreshInterval {
  pause: boolean;
  value: number;
}

function updateLastRefresh(timeRange?: OnRefreshProps) {
  mlTimefilterRefresh$.next({ lastRefresh: Date.now(), ...(timeRange ? { timeRange } : {}) });
}

/**
 * DatePickerWrapper React Component props interface
 */
interface DatePickerWrapperProps {
  /**
   * Boolean flag to only allow controlling auto-refresh, without a time range.
   */
  isAutoRefreshOnly?: boolean;
  /**
   * Boolean flag to indicate loading state.
   */
  isLoading?: boolean;
  /**
   * Boolean flag to enforce showing/hiding the refresh button.
   */
  showRefresh?: boolean;
  /**
   * Width setting to be passed on to `DateRangePicker`
   */
  width?: DateRangePickerProps['width'];
  /**
   * Boolean flag to disable the date picker
   */
  isDisabled?: boolean;
  /**
   * Boolean flag to force change from 'Refresh' to 'Update' state
   */
  needsUpdate?: boolean;
  /**
   * Callback function that gets called
   * when the 'Refresh'|'Update' button is clicked
   */
  onRefresh?: () => void;
  /**
   * Tooltip message for the update button
   */
  tooltipMessage?: string;
  /**
   * Data test subject for the refresh button
   */
  dataTestSubj?: string;
}

/**
 * DatePickerWrapper React Component
 *
 * @type {FC<DatePickerWrapperProps>}
 * @param props - `DatePickerWrapper` component props
 * @returns {React.ReactElement} The DatePickerWrapper component.
 */
export const DatePickerWrapper: FC<DatePickerWrapperProps> = (props) => {
  const {
    isAutoRefreshOnly,
    isLoading = false,
    showRefresh,
    width,
    isDisabled = false,
    needsUpdate,
    onRefresh,
    tooltipMessage,
    dataTestSubj = 'mlDatePickerRefreshPageButton',
  } = props;
  const {
    data,
    notifications: { toasts },
    uiSettings: config,
    userProfile,
    theme,
    i18n: i18nStart,
    http,
    notifications,
  } = useDatePickerContext();

  const { timefilter, history } = data.query.timefilter;

  const [globalState, setGlobalState] = useUrlState('_g');

  const timeFilterRefreshInterval = useRefreshIntervalUpdates();
  const time = useTimeRangeUpdates();

  useEffect(
    function syncTimeRangeFromUrlState() {
      if (globalState?.time !== undefined) {
        timefilter.setTime({
          from: globalState.time.from,
          to: globalState.time.to,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState?.time?.from, globalState?.time?.to, globalState?.time?.ts]
  );

  useEffect(
    function syncRefreshIntervalFromUrlState() {
      if (globalState?.refreshInterval !== undefined) {
        timefilter.setRefreshInterval({
          pause: !!globalState?.refreshInterval?.pause,
          value: globalState?.refreshInterval?.value,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState?.refreshInterval]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setRefreshInterval = useCallback(
    debounce((refreshIntervalUpdate: RefreshInterval) => {
      setGlobalState('refreshInterval', refreshIntervalUpdate, true);
    }, 200),
    [setGlobalState]
  );

  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled()
  );

  const refreshInterval = timeFilterRefreshInterval;

  useEffect(
    function warnAboutShortRefreshInterval() {
      const isResolvedFromUrlState = !!globalState?.refreshInterval;
      const isTooShort = refreshInterval.value < DEFAULT_REFRESH_INTERVAL_MS;

      // Only warn about short interval with enabled auto-refresh.
      if (!isTooShort || refreshInterval.pause) return;

      toasts.addWarning(
        {
          title: isResolvedFromUrlState
            ? i18n.translate('xpack.ml.datePicker.shortRefreshIntervalURLWarningMessage', {
                defaultMessage:
                  'The refresh interval in the URL is shorter than the minimum supported interval.',
              })
            : i18n.translate('xpack.ml.datePicker.shortRefreshIntervalTimeFilterWarningMessage', {
                defaultMessage:
                  'The refresh interval in Advanced Settings is shorter than the minimum supported interval.',
              }),
          text: toMountPoint(
            <EuiButton
              onClick={setRefreshInterval.bind(null, {
                pause: refreshInterval.pause,
                value: DEFAULT_REFRESH_INTERVAL_MS,
              })}
            >
              <FormattedMessage
                id="xpack.ml.datePicker.pageRefreshResetButton"
                defaultMessage="Set to {defaultInterval}"
                values={{
                  defaultInterval: `${DEFAULT_REFRESH_INTERVAL_MS / 1000}s`,
                }}
              />
            </EuiButton>,
            { theme, i18n: i18nStart, userProfile }
          ),
        },
        { toastLifeTimeMs: 30000 }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(refreshInterval),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(globalState?.refreshInterval),
      setRefreshInterval,
    ]
  );

  const dateFormat = config.get('dateFormat');
  const timeZoneName = config.get('dateFormat:tz');

  useEffect(() => {
    const subscriptions = new Subscription();

    const enabledUpdated$ = timefilter.getEnabledUpdated$();
    if (enabledUpdated$ !== undefined) {
      subscriptions.add(
        enabledUpdated$.subscribe((w) => {
          setIsAutoRefreshSelectorEnabled(timefilter.isAutoRefreshSelectorEnabled());
          setIsTimeRangeSelectorEnabled(timefilter.isTimeRangeSelectorEnabled());
        })
      );
    }

    return function cleanup() {
      subscriptions.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTimeFilter = useCallback(
    ({ start, end }: { start: string; end: string }) => {
      setGlobalState('time', {
        from: start,
        to: end,
        ...(start === 'now' || end === 'now' ? { ts: Date.now() } : {}),
      });
    },
    [setGlobalState]
  );

  const updateInterval = useCallback(
    ({
      isPaused: pause,
      refreshInterval: value,
    }: {
      isPaused: boolean;
      refreshInterval: number;
    }) => {
      if (pause === false && value <= 0) {
        setRefreshInterval({ pause, value: 5000 });
      }
      setRefreshInterval({ pause, value });
    },
    [setRefreshInterval]
  );

  const handleRefresh = useCallback(() => {
    updateLastRefresh();
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);
  const dateRangePickerPresets = useDateRangePickerPresets({
    service: data.dateRangePickerPresets,
    persistenceEnabled: true,
    notifications,
  });

  const recentRanges$ = useMemo(() => history.get$().pipe(map(toPresetItems)), [history]);
  const recentRanges = useObservable(recentRanges$, toPresetItems(history.get() ?? []));

  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
  const [dateRangePickerSettings, setDateRangePickerSettings] = useState<DateRangePickerSettings>(
    DEFAULT_DATE_RANGE_PICKER_SETTINGS
  );
  // The play/pause control is only shown once auto-refresh has been enabled, either from the
  // settings panel or because a running refresh interval was restored from the URL.
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(!refreshInterval.pause);
  const [intervalDisplayUnit, setIntervalDisplayUnit] = useState<AutoRefreshIntervalUnit>('s');

  useEffect(
    function enableAutoRefreshWhenUnpaused() {
      if (!refreshInterval.pause) {
        setIsAutoRefreshEnabled(true);
      }
    },
    [refreshInterval.pause]
  );

  const isAutoRefreshOnlyMode = !isTimeRangeSelectorEnabled || isAutoRefreshOnly === true;

  const autoRefresh = useMemo<AutoRefreshSettings>(
    () => ({
      // In auto-refresh-only mode the settings panel is unreachable behind `readOnly`,
      // so the play/pause control has to be visible from the start.
      isEnabled: isAutoRefreshOnlyMode || isAutoRefreshEnabled,
      isPaused: refreshInterval.pause,
      intervalMs: refreshInterval.value || DEFAULT_REFRESH_INTERVAL_MS,
      intervalDisplayUnit,
    }),
    [
      isAutoRefreshOnlyMode,
      isAutoRefreshEnabled,
      refreshInterval.pause,
      refreshInterval.value,
      intervalDisplayUnit,
    ]
  );

  const dateRangePickerSettingsWithAutoRefresh = useMemo<DateRangePickerSettings>(
    () => ({ ...dateRangePickerSettings, autoRefresh }),
    [dateRangePickerSettings, autoRefresh]
  );

  const onDateRangePickerSettingsChange = useCallback(
    (next: DateRangePickerSettings) => {
      const { autoRefresh: nextAutoRefresh, ...rest } = next;
      setDateRangePickerSettings(rest);

      if (!nextAutoRefresh) return;

      // Enabling auto-refresh also starts the timer, so a second click on play is not needed.
      const isEnabling = !autoRefresh.isEnabled && nextAutoRefresh.isEnabled;
      const isPaused = !nextAutoRefresh.isEnabled || (!isEnabling && nextAutoRefresh.isPaused);

      setIsAutoRefreshEnabled(nextAutoRefresh.isEnabled);
      setIntervalDisplayUnit(nextAutoRefresh.intervalDisplayUnit);

      if (
        isPaused !== refreshInterval.pause ||
        nextAutoRefresh.intervalMs !== autoRefresh.intervalMs
      ) {
        updateInterval({ isPaused, refreshInterval: nextAutoRefresh.intervalMs });
      }
    },
    [autoRefresh, refreshInterval.pause, updateInterval]
  );

  const onDateRangeChange = useCallback(
    ({ start, end, isInvalid }: DateRangePickerOnChangeProps) => {
      setIsDateRangeInvalid(isInvalid);
      if (isInvalid) return;
      updateTimeFilter({ start, end });
    },
    [updateTimeFilter]
  );

  const onDateRangeInputChange = useCallback(() => {
    setIsDateRangeInvalid(false);
  }, []);

  // The new picker has no built-in update button, so keep the picker and the button on one row
  // regardless of the layout of the parent container.
  const datePicker = (
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem>
          <DateRangePicker
            value={
              isAutoRefreshOnlyMode
                ? i18n.translate('xpack.ml.datePicker.allTimeLabel', {
                    defaultMessage: 'All time',
                  })
                : `${time.from} to ${time.to}`
            }
            onChange={onDateRangeChange}
            onInputChange={onDateRangeInputChange}
            isInvalid={isDateRangeInvalid}
            disabled={isDisabled}
            readOnly={isAutoRefreshOnlyMode}
            width={width}
            compressed={false}
            showTimeWindowButtons={{ showZoomIn: true }}
            presets={dateRangePickerPresets.presets}
            recent={recentRanges}
            onPresetSave={dateRangePickerPresets.onPresetSave}
            onPresetDelete={dateRangePickerPresets.onPresetDelete}
            settings={dateRangePickerSettingsWithAutoRefresh}
            onSettingsChange={onDateRangePickerSettingsChange}
            onRefresh={handleRefresh}
            inputDateFormats={[dateFormat]}
            timeZone={timeZoneName}
            prependBasePath={http.basePath.prepend}
          />
        </EuiFlexItem>
        {showRefresh === true || !isTimeRangeSelectorEnabled ? null : (
          <EuiFlexItem grow={false}>
            <EuiSuperUpdateButton
              iconOnly
              fill={false}
              needsUpdate={needsUpdate}
              isLoading={isLoading}
              isDisabled={isDisabled || isDateRangeInvalid}
              onClick={handleRefresh}
              toolTipProps={tooltipMessage ? { content: tooltipMessage } : undefined}
              data-test-subj="superDatePickerApplyTimeButton"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  const flexItems = (
    <>
      {datePicker}
      {showRefresh === true || !isTimeRangeSelectorEnabled ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tooltipMessage}>
            <EuiButton
              fill={false}
              color={needsUpdate ? 'accentSecondary' : 'primary'}
              iconType={needsUpdate ? 'kqlFunction' : 'refresh'}
              onClick={handleRefresh}
              data-test-subj={`${dataTestSubj}${isLoading ? ' loading' : ' loaded'}`}
              isLoading={isLoading}
              isDisabled={isDisabled}
            >
              {needsUpdate ? (
                <FormattedMessage
                  id="xpack.ml.datePicker.pageUpdateButton"
                  defaultMessage="Update"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.datePicker.pageRefreshButton"
                  defaultMessage="Refresh"
                />
              )}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </>
  );

  const flexGroup = !isTimeRangeSelectorEnabled || isAutoRefreshOnly === true;

  const wrapped = flexGroup ? (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {flexItems}
    </EuiFlexGroup>
  ) : (
    flexItems
  );

  return isAutoRefreshSelectorEnabled || isTimeRangeSelectorEnabled ? wrapped : null;
};
