/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import { getThemeResolvedSeverityColor } from '@kbn/ml-anomaly-utils';

interface ChartConfig {
  jobId?: string;
  chartData: Array<{ date: Date | number | string; anomalyScore?: number | string }>;
  entityFields?: MlEntityField[];
  selectedEarliest: number;
  selectedLatest: number;
}

interface TableAnomaly {
  jobId: string;
  severity: number;
  entityName?: string;
  entityValue?: unknown;
  source: { timestamp: number };
}

/**
 * The colour of the severity of the highest anomaly score of the chart within the selected
 * time range, or undefined when there is no anomaly in it. The scores are those of the points of the
 * chart and of the anomalies of the table for the chart's entity, as the chart's points do not
 * always have the scores.
 */
export const getSelectedIntervalColor = (
  config: ChartConfig,
  tableAnomalies: TableAnomaly[] | undefined,
  euiTheme: EuiThemeComputed
): string | undefined => {
  const { chartData, entityFields, jobId, selectedEarliest, selectedLatest } = config;
  const isInRange = (time: number) => time >= selectedEarliest && time <= selectedLatest;

  const chartScores = chartData
    .filter(({ date }) => isInRange(new Date(date).getTime()))
    .map(({ anomalyScore }) => Number(anomalyScore));

  const tableScores = (tableAnomalies ?? [])
    .filter(
      (anomaly) =>
        anomaly.jobId === jobId &&
        isInRange(anomaly.source.timestamp) &&
        (!entityFields?.length ||
          entityFields.some(
            ({ fieldName, fieldValue }) =>
              fieldName === anomaly.entityName && fieldValue === anomaly.entityValue
          ))
    )
    .map(({ severity }) => Number(severity));

  const scores = [...chartScores, ...tableScores].filter((score) => Number.isFinite(score));

  return scores.length > 0
    ? getThemeResolvedSeverityColor(Math.max(...scores), euiTheme)
    : undefined;
};
