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
// import numeral from '@elastic/numeral';
// import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { TimeRange } from '../../../../common/http_api/shared/time_range';
// import { bucketSpan } from '../../../../common/log_analysis';
// import { LoadingOverlayWrapper } from '../../../components/loading_overlay_wrapper';
import { useInterval } from '../../../hooks/use_interval';
import { useTrackPageview } from '../../../hooks/use_track_metric';
// import { useKibanaUiSetting } from '../../../utils/use_kibana_ui_setting';
// import { FirstUseCallout } from './first_use';
import { TopCategoriesSection } from './sections/top_categories';
import { useLogEntryCategoriesModuleContext } from './use_log_entry_categories_module';
// import { useLogEntryRateResults } from './use_log_entry_rate_results';
import {
  StringTimeRange,
  useLogEntryCategoriesResultsUrlState,
} from './use_log_entry_categories_results_url_state';

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
    // sourceConfiguration: { sourceId },
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

  // const { getLogEntryRate, isLoading, logEntryRate } = useLogEntryRateResults({
  //   sourceId,
  //   startTime: queryTimeRange.value.startTime,
  //   endTime: queryTimeRange.value.endTime,
  //   bucketDuration,
  // });

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

  // useEffect(() => {
  //   getLogEntryRate();
  // }, [getLogEntryRate, queryTimeRange.lastChangedTime]);

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
                jobId={jobIds['log-entry-categories-count']}
                onRequestRecreateMlJob={viewSetupForReconfiguration}
                timeRange={queryTimeRange.value}
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

// /**
//  * This function takes the current time range in ms,
//  * works out the bucket interval we'd need to always
//  * display 100 data points, and then takes that new
//  * value and works out the nearest multiple of
//  * 900000 (15 minutes) to it, so that we don't end up with
//  * jaggy bucket boundaries between the ML buckets and our
//  * aggregation buckets.
//  */
// const getBucketDuration = (startTime: number, endTime: number) => {
//   const msRange = moment(endTime).diff(moment(startTime));
//   const bucketIntervalInMs = msRange / 100;
//   const result = bucketSpan * Math.round(bucketIntervalInMs / bucketSpan);
//   const roundedResult = parseInt(Number(result).toFixed(0), 10);
//   return roundedResult < bucketSpan ? bucketSpan : roundedResult;
// };

// This is needed due to the flex-basis: 100% !important; rule that
// kicks in on small screens via media queries breaking when using direction="column"
export const ResultsContentPage = euiStyled(EuiPage)`
  flex: 1 0 0%;

  .euiFlexGroup--responsive > .euiFlexItem {
    flex-basis: auto !important;
  }
`;
