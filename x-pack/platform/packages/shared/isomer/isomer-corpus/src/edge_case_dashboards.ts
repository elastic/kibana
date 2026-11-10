/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfigInput } from '@kbn/lens-embeddable-utils';
import { EDGE_CASE_INDEX, EDGE_CASE_TIME_FIELD, EDGE_CASE_TIME_RANGE } from './edge_case_data';

/** A panel of an edge-case dashboard: grid position and the Lens API config (`type: 'vis'`). */
export interface EdgeCasePanel {
  /** Stable panel ID, so captures from different runs line up. */
  id: string;
  grid: { x: number; y: number; w: number; h: number };
  config: LensApiConfigInput;
}

export interface EdgeCaseDashboard {
  /** Dashboard ID; a valid as-code ID, so `PUT /api/dashboards/{id}` creates it. */
  id: string;
  title: string;
  description: string;
  /** The edge cases this dashboard covers, from design section 8's checklist. */
  covers: readonly EdgeCase[];
  panels: readonly EdgeCasePanel[];
}

export type EdgeCase =
  | 'null'
  | 'negative'
  | 'huge'
  | 'tiny'
  | 'multivalue'
  | 'other_bucket'
  | 'missing_bucket'
  | 'long_titles';

const dataView = {
  type: 'data_view_spec',
  index_pattern: EDGE_CASE_INDEX,
  time_field: EDGE_CASE_TIME_FIELD,
} as const;

const esql = (query: string) => ({ type: 'esql', query } as const);

const LONG_TITLE =
  'A panel title long enough to overflow the panel header at every grid width, so truncation, wrapping and tooltips are exercised by each renderer';

const valuesDashboard: EdgeCaseDashboard = {
  id: 'isomer-corpus-values',
  title: 'Isomer corpus: values',
  description: 'Null, negative, huge and tiny values in metric, xy and table panels.',
  covers: ['null', 'negative', 'huge', 'tiny'],
  panels: [
    {
      id: 'values-metric-null',
      grid: { x: 0, y: 0, w: 12, h: 6 },
      config: {
        type: 'metric',
        title: 'Average of a field that is always null',
        data_source: dataView,
        metrics: [{ type: 'primary', operation: 'average', field: 'always_null' }],
      },
    },
    {
      id: 'values-metric-negative',
      grid: { x: 12, y: 0, w: 12, h: 6 },
      config: {
        type: 'metric',
        title: 'Minimum signed value',
        data_source: dataView,
        metrics: [{ type: 'primary', operation: 'min', field: 'signed' }],
      },
    },
    {
      id: 'values-metric-huge',
      grid: { x: 24, y: 0, w: 12, h: 6 },
      config: {
        type: 'metric',
        title: 'Sum of huge values',
        data_source: dataView,
        metrics: [{ type: 'primary', operation: 'sum', field: 'huge' }],
      },
    },
    {
      id: 'values-metric-tiny',
      grid: { x: 36, y: 0, w: 12, h: 6 },
      config: {
        type: 'metric',
        title: 'Average of tiny values',
        data_source: dataView,
        metrics: [{ type: 'primary', operation: 'average', field: 'tiny' }],
      },
    },
    {
      id: 'values-xy-negative',
      grid: { x: 0, y: 6, w: 24, h: 12 },
      config: {
        type: 'xy',
        title: 'Signed values per 6 hours (crosses zero)',
        layers: [
          {
            type: 'bar',
            data_source: dataView,
            x: {
              operation: 'date_histogram',
              field: EDGE_CASE_TIME_FIELD,
              suggested_interval: '6h',
            },
            y: [{ operation: 'sum', field: 'signed' }],
          },
        ],
      },
    },
    {
      id: 'values-xy-null-gaps',
      grid: { x: 24, y: 6, w: 24, h: 12 },
      config: {
        type: 'xy',
        title: 'Hourly average with null gaps',
        layers: [
          {
            type: 'line',
            data_source: dataView,
            x: {
              operation: 'date_histogram',
              field: EDGE_CASE_TIME_FIELD,
              suggested_interval: '1h',
            },
            y: [{ operation: 'average', field: 'value' }],
          },
        ],
      },
    },
    {
      id: 'values-xy-huge-esql',
      grid: { x: 0, y: 18, w: 24, h: 12 },
      config: {
        type: 'xy',
        title: 'Huge values per day (ES|QL)',
        layers: [
          {
            type: 'area',
            data_source: esql(
              `FROM ${EDGE_CASE_INDEX} | STATS total = SUM(huge) BY day = BUCKET(${EDGE_CASE_TIME_FIELD}, 1 day) | SORT day`
            ),
            x: { column: 'day' },
            y: [{ column: 'total' }],
          },
        ],
      },
    },
    {
      id: 'values-table',
      grid: { x: 24, y: 18, w: 24, h: 12 },
      config: {
        type: 'data_table',
        title: 'Every value kind per day',
        data_source: dataView,
        rows: [
          { operation: 'date_histogram', field: EDGE_CASE_TIME_FIELD, suggested_interval: '1d' },
        ],
        metrics: [
          { operation: 'average', field: 'value' },
          { operation: 'sum', field: 'signed' },
          { operation: 'max', field: 'huge' },
          { operation: 'min', field: 'tiny' },
          { operation: 'average', field: 'always_null' },
        ],
      },
    },
    {
      id: 'values-metric-esql',
      grid: { x: 0, y: 30, w: 12, h: 6 },
      config: {
        type: 'metric',
        title: 'Signed average (ES|QL)',
        data_source: esql(`FROM ${EDGE_CASE_INDEX} | STATS signed = AVG(signed)`),
        metrics: [{ type: 'primary', column: 'signed' }],
      },
    },
  ],
};

const bucketsDashboard: EdgeCaseDashboard = {
  id: 'isomer-corpus-buckets',
  title: 'Isomer corpus: buckets',
  description:
    'Other and missing buckets, and multivalue fields, in xy, partition and table panels.',
  covers: ['other_bucket', 'missing_bucket', 'multivalue'],
  panels: [
    {
      id: 'buckets-xy-other-missing',
      grid: { x: 0, y: 0, w: 24, h: 12 },
      config: {
        type: 'xy',
        title: 'Top 5 categories per day, with Other and missing',
        layers: [
          {
            type: 'bar_stacked',
            data_source: dataView,
            x: {
              operation: 'date_histogram',
              field: EDGE_CASE_TIME_FIELD,
              suggested_interval: '1d',
            },
            y: [{ operation: 'count' }],
            breakdown_by: {
              operation: 'terms',
              fields: ['category'],
              limit: 5,
              other_bucket: { include_documents_without_field: true },
            },
          },
        ],
      },
    },
    {
      id: 'buckets-pie-other',
      grid: { x: 24, y: 0, w: 24, h: 12 },
      config: {
        type: 'pie',
        title: 'Top 3 categories, with Other',
        data_source: dataView,
        metrics: [{ operation: 'count' }],
        group_by: [
          {
            operation: 'terms',
            fields: ['category'],
            limit: 3,
            other_bucket: { include_documents_without_field: false },
          },
        ],
      },
    },
    {
      id: 'buckets-table-multivalue',
      grid: { x: 0, y: 12, w: 24, h: 12 },
      config: {
        type: 'data_table',
        title: 'Documents per tag (multivalue field)',
        data_source: dataView,
        rows: [
          {
            operation: 'terms',
            fields: ['tags'],
            limit: 10,
            other_bucket: { include_documents_without_field: true },
          },
        ],
        metrics: [{ operation: 'count' }, { operation: 'sum', field: 'signed' }],
      },
    },
    {
      id: 'buckets-xy-multivalue-esql',
      grid: { x: 24, y: 12, w: 24, h: 12 },
      config: {
        type: 'xy',
        title: 'Documents per tag (ES|QL, multivalue expanded)',
        layers: [
          {
            type: 'bar_horizontal',
            data_source: esql(
              `FROM ${EDGE_CASE_INDEX} | MV_EXPAND tags | STATS count = COUNT(*) BY tags | SORT count DESC, tags`
            ),
            x: { column: 'tags' },
            y: [{ column: 'count' }],
          },
        ],
      },
    },
    {
      id: 'buckets-table-esql-missing',
      grid: { x: 0, y: 24, w: 48, h: 12 },
      config: {
        type: 'data_table',
        title: 'Counts per category, including the missing value (ES|QL)',
        data_source: esql(
          `FROM ${EDGE_CASE_INDEX} | STATS count = COUNT(*), signed = SUM(signed) BY category | SORT count DESC, category`
        ),
        rows: [{ column: 'category' }],
        metrics: [{ column: 'count' }, { column: 'signed' }],
      },
    },
  ],
};

const longTitlesDashboard: EdgeCaseDashboard = {
  id: 'isomer-corpus-long-titles',
  title:
    'Isomer corpus: long titles, long labels and long legends, to check truncation in every surface',
  description: 'Long panel titles, long axis and legend labels, and non-ASCII text.',
  covers: ['long_titles'],
  panels: [
    {
      id: 'long-xy-labels',
      grid: { x: 0, y: 0, w: 24, h: 12 },
      config: {
        type: 'xy',
        title: LONG_TITLE,
        layers: [
          {
            type: 'bar_horizontal',
            data_source: dataView,
            x: { operation: 'terms', fields: ['long_label'], limit: 10 },
            y: [{ operation: 'count' }],
          },
        ],
      },
    },
    {
      id: 'long-pie-legend',
      grid: { x: 24, y: 0, w: 12, h: 12 },
      config: {
        type: 'pie',
        title: LONG_TITLE,
        data_source: dataView,
        metrics: [{ operation: 'count' }],
        group_by: [{ operation: 'terms', fields: ['long_label'], limit: 10 }],
        styling: { donut_hole: 'm' },
      },
    },
    {
      id: 'long-metric',
      grid: { x: 36, y: 0, w: 12, h: 6 },
      config: {
        type: 'metric',
        title: LONG_TITLE,
        data_source: dataView,
        metrics: [{ type: 'primary', operation: 'count' }],
      },
    },
    {
      id: 'long-table',
      grid: { x: 0, y: 12, w: 48, h: 10 },
      config: {
        type: 'data_table',
        title: LONG_TITLE,
        data_source: dataView,
        rows: [{ operation: 'terms', fields: ['long_label'], limit: 10 }],
        metrics: [{ operation: 'count' }],
      },
    },
  ],
};

/** The authored edge-case dashboards. Their data is `buildEdgeCaseDocuments`. */
export const EDGE_CASE_DASHBOARDS: readonly EdgeCaseDashboard[] = [
  valuesDashboard,
  bucketsDashboard,
  longTitlesDashboard,
];

/** The as-code request body for `PUT /api/dashboards/{id}`. */
export const toDashboardRequestBody = ({ title, description, panels }: EdgeCaseDashboard) => ({
  title,
  description,
  time_range: { ...EDGE_CASE_TIME_RANGE },
  panels: panels.map(({ id, grid, config }) => ({ id, grid, type: 'vis', config })),
});
