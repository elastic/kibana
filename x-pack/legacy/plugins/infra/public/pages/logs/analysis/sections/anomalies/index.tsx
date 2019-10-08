/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RectAnnotationDatum } from '@elastic/charts';
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
import { AnomaliesChart } from './chart';
import { AnomaliesTable } from './table';

export const AnomaliesResults = ({
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
  const title = i18n.translate('xpack.infra.logs.analysis.anomaliesSectionTitle', {
    defaultMessage: 'Anomalies',
  });

  const loadingAriaLabel = i18n.translate(
    'xpack.infra.logs.analysis.anomaliesSectionLoadingAriaLabel',
    { defaultMessage: 'Loading anomalies' }
  );

  const hasAnomalies = useMemo(() => {
    return results && results.histogramBuckets
      ? results.histogramBuckets.some(bucket => {
          return bucket.partitions.some(partition => {
            return partition.anomalies.length > 0;
          });
        })
      : false;
  }, [results]);

  const logEntryRateSeries = useMemo(
    () =>
      results && results.histogramBuckets
        ? results.histogramBuckets.reduce<Array<{ time: number; value: number }>>(
            (buckets, bucket) => {
              return [
                ...buckets,
                {
                  time: bucket.startTime,
                  value: bucket.partitions.reduce((accumulatedValue, partition) => {
                    return accumulatedValue + partition.averageActualLogEntryRate;
                  }, 0),
                },
              ];
            },
            []
          )
        : [],
    [results]
  );
  // TODO: Convert to correct data (anomaly scores), also base on severity score
  const logEntryRateAnomalyAnnotations = useMemo(
    () =>
      results && results.histogramBuckets
        ? results.histogramBuckets.reduce<RectAnnotationDatum[]>((annotatedBuckets, bucket) => {
            const anomalies = bucket.partitions.reduce<typeof bucket['partitions'][0]['anomalies']>(
              (accumulatedAnomalies, partition) => [
                ...accumulatedAnomalies,
                ...partition.anomalies,
              ],
              []
            );
            if (anomalies.length <= 0) {
              return annotatedBuckets;
            }
            return [
              ...annotatedBuckets,
              {
                coordinates: {
                  x0: bucket.startTime,
                  x1: bucket.startTime + results.bucketDuration,
                },
                details: i18n.translate(
                  'xpack.infra.logs.analysis.anomalySectionAnomalyCountTooltipLabel',
                  {
                    defaultMessage: `{anomalyCount, plural, one {# anomaly} other {# anomalies}}`,
                    values: {
                      anomalyCount: anomalies.length,
                    },
                  }
                ),
              },
            ];
          }, [])
        : [],
    [results]
  );

  return (
    <>
      <EuiTitle size="s" aria-label={title}>
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
              {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataTitle', {
                defaultMessage: 'There is no data to display.',
              })}
            </h2>
          }
          titleSize="m"
          body={
            <p>
              {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataBody', {
                defaultMessage: 'You may want to adjust your time range.',
              })}
            </p>
          }
        />
      ) : !hasAnomalies ? (
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoAnomaliesTitle', {
                defaultMessage: 'No anomalies were detected.',
              })}
            </h2>
          }
          titleSize="m"
        />
      ) : (
        <>
          <AnomaliesChart
            chartId="overall"
            setTimeRange={setTimeRange}
            timeRange={timeRange}
            series={logEntryRateSeries}
            annotations={logEntryRateAnomalyAnnotations}
          />
          <EuiSpacer size="l" />
          <AnomaliesTable results={results} setTimeRange={setTimeRange} timeRange={timeRange} />
        </>
      )}
    </>
  );
};
