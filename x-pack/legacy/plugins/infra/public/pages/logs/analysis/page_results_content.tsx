/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPanel,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useCallback, useContext, useMemo, useState } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { TimeRange } from '../../../../common/http_api/shared/time_range';
import { bucketSpan } from '../../../../common/log_analysis';
import { LoadingPage } from '../../../components/loading_page';
import {
  LogAnalysisJobs,
  StringTimeRange,
  useLogAnalysisResults,
  useLogAnalysisResultsUrlState,
} from '../../../containers/logs/log_analysis';
import { useInterval } from '../../../hooks/use_interval';
import { useTrackPageview } from '../../../hooks/use_track_metric';
import { FirstUseCallout } from './first_use';
import { LogRateResults } from './sections/log_rate';

const JOB_STATUS_POLLING_INTERVAL = 10000;

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
    // display 200 data points, and then takes that new
    // value and works out the nearest multiple of
    // 900000 (15 minutes) to it, so that we don't end up with
    // jaggy bucket boundaries between the ML buckets and our
    // aggregation buckets.
    const msRange = moment(queryTimeRange.endTime).diff(moment(queryTimeRange.startTime));
    const bucketIntervalInMs = msRange / 200;
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

  const anomaliesDetected = useMemo(() => {
    if (!logEntryRate) {
      return null;
    } else {
      if (logEntryRate.histogramBuckets && logEntryRate.histogramBuckets.length) {
        return logEntryRate.histogramBuckets.reduce(
          (acc, bucket) => acc + bucket.anomalies.length,
          0
        );
      } else {
        return null;
      }
    }
  }, [logEntryRate]);

  const { fetchJobStatus, jobStatus } = useContext(LogAnalysisJobs.Context);

  useInterval(() => {
    fetchJobStatus();
  }, JOB_STATUS_POLLING_INTERVAL);

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
          <EuiPage>
            <EuiPanel paddingSize="l">
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={7}>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false}>
                      {anomaliesDetected !== null ? (
                        <span>
                          <FormattedMessage
                            id="xpack.infra.logs.analysis.anomaliesDetectedText"
                            defaultMessage="Detected {formattedNumber} {number, plural, one {anomaly} other {anomalies}}"
                            values={{
                              formattedNumber: (
                                <EuiBadge color={anomaliesDetected === 0 ? 'default' : 'warning'}>
                                  {anomaliesDetected}
                                </EuiBadge>
                              ),
                              number: anomaliesDetected,
                            }}
                          />
                        </span>
                      ) : null}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
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
          </EuiPage>
          <ExpandingPage>
            <EuiPageBody>
              <EuiPageContent>
                <EuiPageContentBody>
                  {isFirstUse && !hasResults ? <FirstUseCallout /> : null}
                  <LogRateResults
                    isLoading={isLoading}
                    results={logEntryRate}
                    setTimeRange={handleChartTimeRangeChange}
                    timeRange={queryTimeRange}
                  />
                </EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </ExpandingPage>
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

const ExpandingPage = euiStyled(EuiPage)`
  flex: 1 0 0%;
`;
