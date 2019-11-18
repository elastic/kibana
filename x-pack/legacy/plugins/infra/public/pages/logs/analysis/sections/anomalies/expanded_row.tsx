/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiSpacer } from '@elastic/eui';
import { AnomaliesChart } from './chart';
import { LogRateResults } from '../../../../../containers/logs/log_analysis/log_analysis_results';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import {
  getLogEntryRateSeriesForPartition,
  getAnnotationsForPartition,
  getTotalNumberOfLogEntriesForPartition,
} from '../helpers/data_formatters';
import { AnalyzeInMlButton } from '../analyze_in_ml_button';

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  partitionId: string;
  topAnomalyScore: number;
  results: LogRateResults;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  jobId: string;
}> = ({ results, timeRange, setTimeRange, partitionId, jobId }) => {
  const logEntryRateSeries = useMemo(
    () =>
      results && results.histogramBuckets
        ? getLogEntryRateSeriesForPartition(results, partitionId)
        : [],
    [results, partitionId]
  );
  const anomalyAnnotations = useMemo(
    () =>
      results && results.histogramBuckets
        ? getAnnotationsForPartition(results, partitionId)
        : {
            warning: [],
            minor: [],
            major: [],
            critical: [],
          },
    [results, partitionId]
  );
  const totalNumberOfLogEntries = useMemo(
    () =>
      results && results.histogramBuckets
        ? getTotalNumberOfLogEntriesForPartition(results, partitionId)
        : undefined,
    [results, partitionId]
  );
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={8}>
        <AnomaliesChart
          chartId={`${partitionId}-anomalies`}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          series={logEntryRateSeries}
          annotations={anomalyAnnotations}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiStat
          title={numeral(totalNumberOfLogEntries).format('0.00a')}
          titleSize="m"
          description={i18n.translate(
            'xpack.infra.logs.analysis.anomaliesExpandedRowNumberOfLogEntriesDescription',
            {
              defaultMessage: 'Number of log entries',
            }
          )}
          reverse
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <AnalyzeInMlButton jobId={jobId} timeRange={timeRange} partition={partitionId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
