/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { LogEntryRateBarChart } from './bar_chart';

export const LogRateResults = ({
  isLoading,
  results,
  setTimeRange,
  timeRange,
}: {
  isLoading: boolean;
  results: GetLogEntryRateSuccessResponsePayload['data'] | null;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
}) => {
  const title = i18n.translate('xpack.infra.logs.analysis.logRateSectionTitle', {
    defaultMessage: 'Logs entries',
  });

  const loadingAriaLabel = i18n.translate(
    'xpack.infra.logs.analysis.logRateSectionLoadingAriaLabel',
    { defaultMessage: 'Loading log rate results' }
  );

  const logEntryRateSeries = useMemo(
    () =>
      results && results.histogramBuckets
        ? results.histogramBuckets.reduce<Array<{ group: string; time: number; value: number }>>(
            (buckets, bucket) => {
              return [
                ...buckets,
                ...bucket.partitions.map(partition => ({
                  group: partition.partitionId === '' ? 'unknown' : partition.partitionId,
                  time: bucket.startTime,
                  value: partition.averageActualLogEntryRate,
                })),
              ];
            },
            []
          )
        : [],
    [results]
  );

  return (
    <>
      <EuiTitle size="m" aria-label={title}>
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      {isLoading ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="xl" aria-label={loadingAriaLabel} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : !results || (results && results.histogramBuckets && !results.histogramBuckets.length) ? (
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.infra.logs.analysis.logRateSectionNoDataTitle', {
                defaultMessage: 'There is no data to display.',
              })}
            </h2>
          }
          titleSize="m"
          body={
            <p>
              {i18n.translate('xpack.infra.logs.analysis.logRateSectionNoDataBody', {
                defaultMessage: 'You may want to adjust your time range.',
              })}
            </p>
          }
        />
      ) : (
        <LogEntryRateBarChart
          setTimeRange={setTimeRange}
          timeRange={timeRange}
          series={logEntryRateSeries}
        />
      )}
    </>
  );
};
