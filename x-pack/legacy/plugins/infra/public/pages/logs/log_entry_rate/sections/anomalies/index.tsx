/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiStat,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import euiStyled from '../../../../../../../../common/eui_styled_components';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { formatAnomalyScore, JobStatus, SetupStatus } from '../../../../../../common/log_analysis';
import {
  getAnnotationsForAll,
  getLogEntryRateCombinedSeries,
  getTopAnomalyScoreAcrossAllPartitions,
} from '../helpers/data_formatters';
import { AnomaliesChart } from './chart';
import { AnomaliesTable } from './table';
import {
  LogAnalysisJobProblemIndicator,
  RecreateJobButton,
} from '../../../../../components/logging/log_analysis_job_status';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';

export const AnomaliesResults: React.FunctionComponent<{
  isLoading: boolean;
  jobStatus: JobStatus;
  results: LogEntryRateResults | null;
  setTimeRange: (timeRange: TimeRange) => void;
  setupStatus: SetupStatus;
  timeRange: TimeRange;
  viewSetupForReconfiguration: () => void;
  viewSetupForUpdate: () => void;
  jobId: string;
}> = ({
  isLoading,
  jobStatus,
  results,
  setTimeRange,
  setupStatus,
  timeRange,
  viewSetupForReconfiguration,
  viewSetupForUpdate,
  jobId,
}) => {
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
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s" aria-label={title}>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RecreateJobButton onClick={viewSetupForUpdate} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AnalyzeInMlButton jobId={jobId} timeRange={timeRange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <LogAnalysisJobProblemIndicator
        jobStatus={jobStatus}
        setupStatus={setupStatus}
        onRecreateMlJobForReconfiguration={viewSetupForReconfiguration}
        onRecreateMlJobForUpdate={viewSetupForUpdate}
      />
      <EuiSpacer size="m" />
      <LoadingOverlayWrapper isLoading={isLoading} loadingChildren={<LoadingOverlayContent />}>
        {!results || (results && results.histogramBuckets && !results.histogramBuckets.length) ? (
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
                  title={numeral(results.totalNumberOfLogEntries).format('0.00a')}
                  titleSize="m"
                  description={i18n.translate(
                    'xpack.infra.logs.analysis.overallAnomaliesNumberOfLogEntriesDescription',
                    {
                      defaultMessage: 'Number of log entries',
                    }
                  )}
                  reverse
                />
                <EuiStat
                  title={topAnomalyScore ? formatAnomalyScore(topAnomalyScore) : null}
                  titleSize="m"
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
            <AnomaliesTable
              results={results}
              setTimeRange={setTimeRange}
              timeRange={timeRange}
              jobId={jobId}
            />
          </>
        )}
      </LoadingOverlayWrapper>
    </>
  );
};

const title = i18n.translate('xpack.infra.logs.analysis.anomaliesSectionTitle', {
  defaultMessage: 'Anomalies',
});

interface ParsedAnnotationDetails {
  anomalyScoresByPartition: Array<{ partitionName: string; maximumAnomalyScore: number }>;
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
    <TooltipWrapper>
      <span>
        <b>{overallAnomalyScoreLabel}</b>
      </span>
      <ul>
        {parsedDetails.anomalyScoresByPartition.map(({ partitionName, maximumAnomalyScore }) => {
          return (
            <li key={`overall-anomaly-chart-${partitionName}`}>
              <span>
                {`${partitionName}: `}
                <b>{maximumAnomalyScore}</b>
              </span>
            </li>
          );
        })}
      </ul>
    </TooltipWrapper>
  );
};

const renderAnnotationTooltip = (details?: string) => {
  // Note: Seems to be necessary to get things typed correctly all the way through to elastic-charts components
  if (!details) {
    return <div />;
  }
  return <AnnotationTooltip details={details} />;
};

const TooltipWrapper = euiStyled('div')`
  white-space: nowrap;
`;

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading anomalies' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
