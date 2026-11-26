/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointAggregationFunction } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import { escapeStringValue, sanitazeESQLInput } from '@kbn/esql-utils';

const CHANGE_POINT_ESQL_BUCKET_COUNT = 75;

const ESQL_AGGREGATION_FUNCTIONS = {
  avg: 'AVG',
  sum: 'SUM',
  min: 'MIN',
  max: 'MAX',
} as const satisfies Record<ChangePointAggregationFunction, string>;

export interface BuildChangePointEsqlParams {
  readonly indexPattern?: string;
  readonly timeField?: string;
  readonly aggregationFunction: ChangePointAggregationFunction;
  readonly metricField?: string;
  readonly splitField?: string;
  readonly partitions?: readonly string[];
  readonly onlyChangePoints?: boolean;
}

const quoteIdentifier = (identifier: string): string =>
  sanitazeESQLInput(identifier) ?? `\`${identifier.replace(/`/g, '``')}\``;

/** Builds a CHANGE_POINT ES|QL query from the dashboard form selections, or undefined if incomplete. */
export const buildChangePointEsql = ({
  indexPattern,
  timeField,
  aggregationFunction,
  metricField,
  splitField,
  partitions,
  onlyChangePoints = false,
}: BuildChangePointEsqlParams): string | undefined => {
  const trimmedIndexPattern = indexPattern?.trim();
  if (!trimmedIndexPattern || !timeField || !metricField) {
    return undefined;
  }

  const normalizedSplit = splitField || undefined;
  const metricAliasName = `${aggregationFunction}_${metricField}`;
  const metricAlias = quoteIdentifier(
    normalizedSplit === metricAliasName ? `${metricAliasName}_value` : metricAliasName
  );
  const escapedTime = quoteIdentifier(timeField);
  const escapedMetric = quoteIdentifier(metricField);
  const esqlFn = ESQL_AGGREGATION_FUNCTIONS[aggregationFunction];
  const escapedSplit = normalizedSplit ? quoteIdentifier(normalizedSplit) : undefined;
  const bucketColumn = normalizedSplit === 'bucket' ? 'time_bucket' : 'bucket';

  const partitionClause =
    escapedSplit && partitions && partitions.length > 0
      ? ` AND ${escapedSplit} IN (${partitions.map(escapeStringValue).join(', ')})`
      : '';

  const statsByPrefix = escapedSplit ? `${escapedSplit}, ` : '';
  const needsOutputAlias = normalizedSplit === 'type' || normalizedSplit === 'pvalue';
  const typeColumnName = needsOutputAlias ? 'change_point_type' : 'type';
  const pvalueColumnName = needsOutputAlias ? 'change_point_pvalue' : 'pvalue';
  const asClause = needsOutputAlias ? ` AS ${typeColumnName}, ${pvalueColumnName}` : '';
  const changePointByClause = escapedSplit ? ` BY ${escapedSplit}` : '';

  const lines = [
    `FROM ${trimmedIndexPattern}`,
    `| WHERE ${escapedTime} >= ?_tstart AND ${escapedTime} <= ?_tend${partitionClause}`,
    `| STATS ${metricAlias} = ${esqlFn}(${escapedMetric}) BY ${statsByPrefix}${bucketColumn} = BUCKET(${escapedTime}, ${CHANGE_POINT_ESQL_BUCKET_COUNT}, ?_tstart, ?_tend)`,
    `| CHANGE_POINT ${metricAlias} ON ${bucketColumn}${asClause}${changePointByClause}`,
  ];

  if (onlyChangePoints) {
    lines.push(`| WHERE ${quoteIdentifier(typeColumnName)} IS NOT NULL`);
  }

  return lines.join('\n');
};
