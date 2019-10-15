/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { AnomaliesChart } from './chart';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import {
  getLogEntryRateSeriesForPartition,
  getAnnotationsForPartition,
  formatAnomalyScore,
  getTotalNumberOfLogEntriesForPartition,
} from '../helpers/data_formatters';

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  partitionId: string;
  topAnomalyScore: number;
  results: GetLogEntryRateSuccessResponsePayload['data'];
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
}> = ({ results, timeRange, setTimeRange, topAnomalyScore, partitionId }) => {
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
        <EuiStat
          title={numeral(totalNumberOfLogEntries).format('0.00a')}
          description={i18n.translate(
            'xpack.infra.logs.analysis.anomaliesExpandedRowNumberOfLogEntriesDescription',
            {
              defaultMessage: 'Number of log entries',
            }
          )}
          reverse
        />
        <EuiStat
          title={formatAnomalyScore(topAnomalyScore)}
          description={i18n.translate(
            'xpack.infra.logs.analysis.anomaliesExpandedRowTopAnomalyScoreDescription',
            {
              defaultMessage: 'Max anomaly score',
            }
          )}
          reverse
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
