/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import {
  // EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiSuperDatePicker,
  EuiPageBody,
  // EuiText,
} from '@elastic/eui';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import euiStyled from '../../../../../../common/eui_styled_components';
import { TimeRange } from '../../../../common/http_api/shared/time_range';
import { useInterval } from '../../../hooks/use_interval';
import { useTrackPageview } from '../../../hooks/use_track_metric';
// import { useKibanaUiSetting } from '../../../utils/use_kibana_ui_setting';
// import { FirstUseCallout } from './first_use';
import { TopCategoriesSection } from './sections/top_categories';
import { useLogEntryCategoriesModuleContext } from './use_log_entry_categories_module';
import {
  StringTimeRange,
  useLogEntryCategoriesResultsUrlState,
} from './use_log_entry_categories_results_url_state';
import { useLogEntryCategoriesResults } from './use_log_entry_categories_results';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

const JOB_STATUS_POLLING_INTERVAL = 30000;

export const LogEntryCategoriesResultsContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_results' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_results', delay: 15000 });

  // const [dateFormat] = useKibanaUiSetting('dateFormat', 'MMMM D, YYYY h:mm A');

  const {
    fetchJobStatus,
    // jobStatus,
    setupStatus,
    viewSetupForReconfiguration,
    // viewSetupForUpdate,
    jobIds,
    sourceConfiguration: { sourceId },
  } = useLogEntryCategoriesModuleContext();

  const {
    timeRange: selectedTimeRange,
    setTimeRange: setSelectedTimeRange,
    autoRefresh,
    setAutoRefresh,
  } = useLogEntryCategoriesResultsUrlState();

  const [queryTimeRange, setQueryTimeRange] = useState<{
    value: TimeRange;
    lastChangedTime: number;
  }>(() => ({
    value: stringToNumericTimeRange(selectedTimeRange),
    lastChangedTime: Date.now(),
  }));

  // const bucketDuration = useMemo(
  //   () => getBucketDuration(queryTimeRange.value.startTime, queryTimeRange.value.endTime),
  //   [queryTimeRange.value.endTime, queryTimeRange.value.startTime]
  // );

  const { services } = useKibana<{}>();

  const showLoadDataErrorNotification = useCallback(
    (error: Error) => {
      // eslint-disable-next-line no-unused-expressions
      services.notifications?.toasts.addError(error, {
        title: loadDataErrorTitle,
      });
    },
    [services.notifications]
  );

  const {
    getLogEntryCategoryDatasets,
    getTopLogEntryCategories,
    isLoadingTopLogEntryCategories,
    logEntryCategoryDatasets,
    topLogEntryCategories,
  } = useLogEntryCategoriesResults({
    sourceId,
    startTime: queryTimeRange.value.startTime,
    endTime: queryTimeRange.value.endTime,
    categoriesCount: 25,
    onGetTopLogEntryCategoriesError: showLoadDataErrorNotification,
  });

  // const hasResults = useMemo(() => (logEntryRate?.histogramBuckets?.length ?? 0) > 0, [
  //   logEntryRate,
  // ]);

  const handleQueryTimeRangeChange = useCallback(
    ({ start: startTime, end: endTime }: { start: string; end: string }) => {
      setQueryTimeRange({
        value: stringToNumericTimeRange({ startTime, endTime }),
        lastChangedTime: Date.now(),
      });
    },
    [setQueryTimeRange]
  );

  const handleSelectedTimeRangeChange = useCallback(
    (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }
      setSelectedTimeRange({
        startTime: selectedTime.start,
        endTime: selectedTime.end,
      });
      handleQueryTimeRangeChange(selectedTime);
    },
    [setSelectedTimeRange, handleQueryTimeRangeChange]
  );

  // const handleChartTimeRangeChange = useCallback(
  //   ({ startTime, endTime }: TimeRange) => {
  //     handleSelectedTimeRangeChange({
  //       end: new Date(endTime).toISOString(),
  //       isInvalid: false,
  //       start: new Date(startTime).toISOString(),
  //     });
  //   },
  //   [handleSelectedTimeRangeChange]
  // );

  const handleAutoRefreshChange = useCallback(
    ({ isPaused, refreshInterval: interval }: { isPaused: boolean; refreshInterval: number }) => {
      setAutoRefresh({
        isPaused,
        interval,
      });
    },
    [setAutoRefresh]
  );

  const isFirstUse = useMemo(() => setupStatus === 'hiddenAfterSuccess', [setupStatus]);

  useEffect(() => {
    getLogEntryCategoryDatasets();
    getTopLogEntryCategories();
  }, [getLogEntryCategoryDatasets, getTopLogEntryCategories, queryTimeRange.lastChangedTime]);

  useInterval(() => {
    fetchJobStatus();
  }, JOB_STATUS_POLLING_INTERVAL);

  useInterval(
    () => {
      handleQueryTimeRangeChange({
        start: selectedTimeRange.startTime,
        end: selectedTimeRange.endTime,
      });
    },
    autoRefresh.isPaused ? null : autoRefresh.interval
  );

  return (
    <ResultsContentPage>
      <EuiPageBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="l">
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem />
                <EuiFlexItem grow={false}>
                  <EuiSuperDatePicker
                    start={selectedTimeRange.startTime}
                    end={selectedTimeRange.endTime}
                    onTimeChange={handleSelectedTimeRangeChange}
                    isPaused={autoRefresh.isPaused}
                    refreshInterval={autoRefresh.interval}
                    onRefreshChange={handleAutoRefreshChange}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="l">
              <TopCategoriesSection
                availableDatasets={logEntryCategoryDatasets}
                isLoading={isLoadingTopLogEntryCategories}
                jobId={jobIds['log-entry-categories-count']}
                onRequestRecreateMlJob={viewSetupForReconfiguration}
                timeRange={queryTimeRange.value}
                topCategories={topLogEntryCategories}
              />
              {/* {isFirstUse && !hasResults ? <FirstUseCallout /> : null}
            <LogRateResults
              isLoading={isLoading}
              results={logEntryRate}
              setTimeRange={handleChartTimeRangeChange}
              timeRange={queryTimeRange.value}
            />
            */}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </ResultsContentPage>
  );
};

const stringToNumericTimeRange = (timeRange: StringTimeRange): TimeRange => ({
  startTime: moment(
    datemath.parse(timeRange.startTime, {
      momentInstance: moment,
    })
  ).valueOf(),
  endTime: moment(
    datemath.parse(timeRange.endTime, {
      momentInstance: moment,
      roundUp: true,
    })
  ).valueOf(),
});

// This is needed due to the flex-basis: 100% !important; rule that
// kicks in on small screens via media queries breaking when using direction="column"
export const ResultsContentPage = euiStyled(EuiPage)`
  flex: 1 0 0%;

  .euiFlexGroup--responsive > .euiFlexItem {
    flex-basis: auto !important;
  }
`;

const loadDataErrorTitle = i18n.translate(
  'xpack.infra.logs.logEntryCategories.loadDataErrorTitle',
  {
    defaultMessage: 'Failed to load category data',
  }
);
