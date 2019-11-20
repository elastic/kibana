/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import {
  getAnnotationsForPartition,
  getLogEntryRateSeriesForPartition,
  getTotalNumberOfLogEntriesForPartition,
} from '../helpers/data_formatters';
import { AnomaliesChart } from './chart';

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  partitionId: string;
  topAnomalyScore: number;
  results: LogEntryRateResults;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  jobId: string;
}> = ({ results, timeRange, setTimeRange, partitionId, jobId }) => {
  const logEntryRateSeries = useMemo(
    () =>
      results?.histogramBuckets ? getLogEntryRateSeriesForPartition(results, partitionId) : [],
    [results, partitionId]
  );
  const anomalyAnnotations = useMemo(
    () =>
      results?.histogramBuckets
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
      results?.histogramBuckets
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
