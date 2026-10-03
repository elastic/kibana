/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { GOLDEN_TOOL_PATH } from './golden_tool_path';

/** Slicing keys stored on every example so golden-cluster results can be split by chart family. */
export interface ExampleMetadata {
  chartFamily: ChartFamily;
  dataSource?: DataSource;
  /** Config API features the gold pins beyond the basic column roles. */
  configFeatures?: ConfigFeature[];
  [key: string]: unknown;
}

export type ChartFamily =
  | 'xy'
  | 'metric'
  | 'gauge'
  | 'pie'
  | 'treemap'
  | 'tag_cloud'
  | 'data_table'
  | 'heatmap'
  | 'vega'
  | 'query_only'
  | 'refusal';

export type DataSource = 'logs' | 'ecommerce' | 'host_metrics';

export type ConfigFeature = 'breakdown_by' | 'secondary_metric' | 'multi_series';

const features = (list: Array<ConfigFeature | false>): { configFeatures?: ConfigFeature[] } => {
  const present = list.filter((feature): feature is ConfigFeature => feature !== false);
  return present.length === 0 ? {} : { configFeatures: present };
};

/**
 * Two-turn example: `create` is asked first, `edit` continues the conversation,
 * and `gold` describes the chart after the edit. Only the edited chart is scored.
 */
export const editExample = ({
  create,
  edit,
  gold,
}: {
  create: string;
  edit: string;
  gold: VisualizationDatasetExample;
}): VisualizationDatasetExample => ({
  ...gold,
  input: { question: create, followUp: edit },
  metadata: { ...(gold.metadata ?? {}), multiTurn: true },
});

/** Stamps the data source onto every example of a dataset file. */
export const withDataSource = (
  dataSource: DataSource,
  examples: VisualizationDatasetExample[]
): VisualizationDatasetExample[] =>
  examples.map((example) => ({
    ...example,
    metadata: { ...(example.metadata ?? {}), dataSource },
  }));

/** One STATS output: the alias the chart binds to and the aggregation behind it. */
export interface GoldMetric {
  alias: string;
  expression: string;
}

interface QuerySource {
  index: string;
  metrics: GoldMetric[];
  timeField?: string;
}

const statsList = (metrics: GoldMetric[]): string =>
  metrics.map(({ alias, expression }) => `\`${alias}\` = ${expression}`).join(', ');

const timeWindow = (timeField: string): string =>
  `| WHERE ${timeField} >= ?_tstart AND ${timeField} < ?_tend`;

/** Top-N by category in the agent's idiom: time window, STATS ... BY, SORT first metric, LIMIT. */
export const categoricalQuery = ({
  index,
  metrics,
  groupBy,
  timeField = '@timestamp',
  limit = 10,
}: QuerySource & { groupBy: string; limit?: number }): string =>
  `FROM ${index}
${timeWindow(timeField)}
| STATS ${statsList(metrics)} BY ${groupBy}
| SORT \`${metrics[0].alias}\` DESC
| LIMIT ${limit}`;

/** Time series in the agent's idiom: auto-bucket count over the bind-param window. */
export const timeSeriesQuery = ({
  index,
  metrics,
  timeField = '@timestamp',
  splitBy,
}: QuerySource & { splitBy?: string }): string =>
  `FROM ${index}
| STATS ${statsList(metrics)} BY \`Time Bucket\` = BUCKET(${timeField}, 75, ?_tstart, ?_tend)${
    splitBy === undefined ? '' : `, ${splitBy}`
  }`;

/** Single-row totals for metric and gauge charts. */
export const totalsQuery = ({ index, metrics, timeField = '@timestamp' }: QuerySource): string =>
  `FROM ${index}
${timeWindow(timeField)}
| STATS ${statsList(metrics)}`;

export const TIME_BUCKET_COLUMN = 'Time Bucket';

const column = (name: string) => ({ column: name });
const esql = (query: string) => ({ type: 'esql' as const, query });

export type XySeriesType = 'area' | 'bar' | 'bar_horizontal' | 'bar_stacked' | 'line';

export const xyExample = ({
  question,
  seriesType,
  query,
  x,
  y,
  breakdownBy,
}: {
  question: string;
  seriesType: XySeriesType | readonly XySeriesType[];
  query: string;
  x: string;
  y: string[];
  /** Column that splits each series, e.g. one line per response code. */
  breakdownBy?: string;
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: {
    chartFamily: 'xy',
    ...features([breakdownBy !== undefined && 'breakdown_by', y.length > 1 && 'multi_series']),
  },
  output: {
    config: {
      type: 'xy',
      layers: [
        {
          type: seriesType,
          data_source: esql(query),
          x: column(x),
          y: y.map(column),
          ...(breakdownBy === undefined ? {} : { breakdown_by: column(breakdownBy) }),
        },
      ],
    },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});

export const metricExample = ({
  question,
  query,
  metrics,
  breakdownBy,
}: {
  question: string;
  query: string;
  /**
   * Primary metric first; a second entry is the secondary metric. Each gold item
   * pins its `type`, because array items are matched regardless of order.
   */
  metrics: string[];
  /** Column that renders one metric tile per value. */
  breakdownBy?: string;
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: {
    chartFamily: 'metric',
    ...features([
      breakdownBy !== undefined && 'breakdown_by',
      metrics.length > 1 && 'secondary_metric',
    ]),
  },
  output: {
    config: {
      type: 'metric',
      data_source: esql(query),
      metrics: metrics.map((name, index) => ({
        type: index === 0 ? ('primary' as const) : ('secondary' as const),
        ...column(name),
      })),
      ...(breakdownBy === undefined ? {} : { breakdown_by: column(breakdownBy) }),
    },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});

export const gaugeExample = ({
  question,
  query,
  metric,
}: {
  question: string;
  query: string;
  metric: string;
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: { chartFamily: 'gauge' },
  output: {
    config: { type: 'gauge', data_source: esql(query), metric: column(metric) },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});

/** Pie and treemap share the partition shape: metrics sliced by group_by. */
export const partitionExample = ({
  question,
  type,
  query,
  metrics,
  groupBy,
}: {
  question: string;
  type: 'pie' | 'treemap';
  query: string;
  metrics: string[];
  groupBy: string[];
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: { chartFamily: type },
  output: {
    config: {
      type,
      data_source: esql(query),
      metrics: metrics.map(column),
      group_by: groupBy.map(column),
    },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});

export const tagCloudExample = ({
  question,
  query,
  metric,
  tagBy,
}: {
  question: string;
  query: string;
  metric: string;
  tagBy: string;
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: { chartFamily: 'tag_cloud' },
  output: {
    config: {
      type: 'tag_cloud',
      data_source: esql(query),
      metric: column(metric),
      tag_by: column(tagBy),
    },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});

export const dataTableExample = ({
  question,
  query,
  rows,
  metrics,
}: {
  question: string;
  query: string;
  rows: string[];
  metrics: string[];
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: { chartFamily: 'data_table' },
  output: {
    config: {
      type: 'data_table',
      data_source: esql(query),
      rows: rows.map(column),
      metrics: metrics.map(column),
    },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});

export const heatmapExample = ({
  question,
  query,
  x,
  y,
  metric,
}: {
  question: string;
  query: string;
  x: string;
  y: string;
  metric: string;
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: { chartFamily: 'heatmap' },
  output: {
    config: {
      type: 'heatmap',
      data_source: esql(query),
      x: column(x),
      y: column(y),
      metric: column(metric),
    },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});

/** Scores only ES|QL equivalence; use when several chart forms are legitimate answers. */
export const queryOnlyExample = ({
  question,
  query,
}: {
  question: string;
  query: string;
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: { chartFamily: 'query_only' },
  output: {
    config: { data_source: esql(query) },
    goldenToolPath: GOLDEN_TOOL_PATH,
  },
});
