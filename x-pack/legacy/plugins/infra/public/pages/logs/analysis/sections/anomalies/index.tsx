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
  EuiStat,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { AnomaliesChart } from './chart';
import { AnomaliesTable } from './table';
import {
  getLogEntryRateCombinedSeries,
  getAnnotationsForAll,
  getTopAnomalyScoreAcrossAllPartitions,
} from '../helpers/data_formatters';

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
    () => (results && results.histogramBuckets ? getLogEntryRateCombinedSeries(results) : []),
    [results]
  );
  const anomalyAnnotations = useMemo(
    () =>
      results && results.histogramBuckets
        ? getAnnotationsForAll(results)
        : {
            warning: [],
            minor: [],
            major: [],
            critical: [],
          },
    [results]
  );

  const topAnomalyScore = useMemo(
    () =>
      results && results.histogramBuckets
        ? getTopAnomalyScoreAcrossAllPartitions(results)
        : undefined,
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
          <EuiFlexGroup>
            <EuiFlexItem grow={8}>
              <AnomaliesChart
                chartId="overall"
                setTimeRange={setTimeRange}
                timeRange={timeRange}
                series={logEntryRateSeries}
                annotations={anomalyAnnotations}
                renderAnnotationTooltip={renderAnnotationTooltip}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiStat
                title={numeral(results.totalNumberOfLogs).format('0.00a')}
                description={i18n.translate(
                  'xpack.infra.logs.analysis.overallAnomaliesNumberOfLogsDescription',
                  {
                    defaultMessage: 'Number of logs',
                  }
                )}
                reverse
              />
              <EuiStat
                title={Number(topAnomalyScore).toFixed(0)}
                description={i18n.translate(
                  'xpack.infra.logs.analysis.overallAnomaliesTopAnomalyScoreDescription',
                  {
                    defaultMessage: 'Max anomaly score',
                  }
                )}
                reverse
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <AnomaliesTable results={results} setTimeRange={setTimeRange} timeRange={timeRange} />
        </>
      )}
    </>
  );
};

interface ParsedAnnotationDetails {
  anomalyScoresByPartition: Record<string, number>;
}

const overallAnomalyScoreLabel = i18n.translate(
  'xpack.infra.logs.analysis.overallAnomalyChartMaxScoresLabel',
  {
    defaultMessage: 'Max anomaly scores:',
  }
);
const AnnotationTooltip: React.FunctionComponent<{ details: string }> = ({ details }) => {
  const parsedDetails: ParsedAnnotationDetails = JSON.parse(details);
  return (
    <div>
      <span>{overallAnomalyScoreLabel}</span>
      <ul>
        {Object.entries(parsedDetails.anomalyScoresByPartition).map((entry, index) => {
          return (
            <li key={`${index}-overall-anomaly-chart-${entry[0]}-partition-score-${entry[1]}`}>
              <span>
                {`${entry[0]}: `}
                <b>{entry[1]}</b>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const renderAnnotationTooltip = (details?: string) => {
  // Note: Seems to be necessary to get things typed correctly all the way through to elastic-charts components
  if (!details) {
    return <div></div>;
  }
  return <AnnotationTooltip details={details} />;
};
