/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiSuperDatePicker,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import { TimeRange } from '../../../../common/http_api/shared/time_range';
import { bucketSpan } from '../../../../common/log_analysis';
import euiStyled from '../../../../../../common/eui_styled_components';
import { LoadingPage } from '../../../components/loading_page';
import {
  StringTimeRange,
  useLogAnalysisResults,
  useLogAnalysisResultsUrlState,
} from '../../../containers/logs/log_analysis';
import { useTrackPageview } from '../../../hooks/use_track_metric';
import { FirstUseCallout } from './first_use';
import { LogRateResults } from './sections/log_rate';
import { AnomaliesResults } from './sections/anomalies';

export const AnalysisResultsContent = ({
  sourceId,
  isFirstUse,
}: {
  sourceId: string;
  isFirstUse: boolean;
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'analysis_results' });
  useTrackPageview({ app: 'infra_logs', path: 'analysis_results', delay: 15000 });

  const {
    timeRange: selectedTimeRange,
    setTimeRange: setSelectedTimeRange,
    autoRefresh,
    setAutoRefresh,
  } = useLogAnalysisResultsUrlState();

  const [queryTimeRange, setQueryTimeRange] = useState<TimeRange>(
    stringToNumericTimeRange(selectedTimeRange)
  );

  const bucketDuration = useMemo(() => {
    // This function takes the current time range in ms,
    // works out the bucket interval we'd need to always
    // display 100 data points, and then takes that new
    // value and works out the nearest multiple of
    // 900000 (15 minutes) to it, so that we don't end up with
    // jaggy bucket boundaries between the ML buckets and our
    // aggregation buckets.
    const msRange = moment(queryTimeRange.endTime).diff(moment(queryTimeRange.startTime));
    const bucketIntervalInMs = msRange / 100;
    const result = bucketSpan * Math.round(bucketIntervalInMs / bucketSpan);
    const roundedResult = parseInt(Number(result).toFixed(0), 10);
    return roundedResult < bucketSpan ? bucketSpan : roundedResult;
  }, [queryTimeRange.startTime, queryTimeRange.endTime]);

  const { isLoading, logEntryRate } = useLogAnalysisResults({
    sourceId,
    startTime: queryTimeRange.startTime,
    endTime: queryTimeRange.endTime,
    bucketDuration,
  });
  const hasResults = useMemo(() => logEntryRate && logEntryRate.histogramBuckets.length > 0, [
    logEntryRate,
  ]);

  const handleQueryTimeRangeChange = useCallback(
    ({ start: startTime, end: endTime }: { start: string; end: string }) => {
      setQueryTimeRange(stringToNumericTimeRange({ startTime, endTime }));
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

  const handleChartTimeRangeChange = useCallback(
    ({ startTime, endTime }: TimeRange) => {
      handleSelectedTimeRangeChange({
        end: new Date(endTime).toISOString(),
        isInvalid: false,
        start: new Date(startTime).toISOString(),
      });
    },
    [handleSelectedTimeRangeChange]
  );

  const handleAutoRefreshChange = useCallback(
    ({ isPaused, refreshInterval: interval }: { isPaused: boolean; refreshInterval: number }) => {
      setAutoRefresh({
        isPaused,
        interval,
      });
    },
    [setAutoRefresh]
  );

  return (
    <>
      {isLoading && !logEntryRate ? (
        <LoadingPage
          message={i18n.translate('xpack.infra.logs.logsAnalysisResults.loadingMessage', {
            defaultMessage: 'Loading results...',
          })}
        />
      ) : (
        <>
          <ResultsContentPage>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiPanel paddingSize="l">
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      {!isLoading && logEntryRate ? (
                        <EuiText size="s">
                          <FormattedMessage
                            id="xpack.infra.logs.analysis.logRateResultsToolbarText"
                            defaultMessage="Analyzed {numberOfLogs} log entries from {startTime} to {endTime}"
                            values={{
                              numberOfLogs: (
                                <EuiBadge color="primary">
                                  <EuiText size="s" color="ghost">
                                    {numeral(logEntryRate.totalNumberOfLogEntries).format('0.00a')}
                                  </EuiText>
                                </EuiBadge>
                              ),
                              startTime: (
                                <b>
                                  {moment(queryTimeRange.startTime).format('MMMM D, YYYY h:mm A')}
                                </b>
                              ),
                              endTime: (
                                <b>
                                  {moment(queryTimeRange.endTime).format('MMMM D, YYYY h:mm A')}
                                </b>
                              ),
                            }}
                          />
                        </EuiText>
                      ) : null}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSuperDatePicker
                        start={selectedTimeRange.startTime}
                        end={selectedTimeRange.endTime}
                        onTimeChange={handleSelectedTimeRangeChange}
                        isPaused={autoRefresh.isPaused}
                        refreshInterval={autoRefresh.interval}
                        onRefreshChange={handleAutoRefreshChange}
                        onRefresh={handleQueryTimeRangeChange}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPanel paddingSize="l">
                  {isFirstUse && !hasResults ? <FirstUseCallout /> : null}
                  <LogRateResults
                    isLoading={isLoading}
                    results={logEntryRate}
                    setTimeRange={handleChartTimeRangeChange}
                    timeRange={queryTimeRange}
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPanel paddingSize="l">
                  <AnomaliesResults
                    isLoading={isLoading}
                    results={logEntryRate}
                    setTimeRange={handleChartTimeRangeChange}
                    timeRange={queryTimeRange}
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </ResultsContentPage>
        </>
      )}
    </>
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
  .euiFlexGroup--responsive > .euiFlexItem {
    flex-basis: auto !important;
  }
`;
