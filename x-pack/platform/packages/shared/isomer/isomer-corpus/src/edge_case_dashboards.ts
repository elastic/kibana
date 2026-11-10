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

const BY_CATEGORY = `FROM ${EDGE_CASE_INDEX} | STATS count = COUNT(*) BY category | SORT count DESC, category`;
const BY_SIGN_AND_CATEGORY = `FROM ${EDGE_CASE_INDEX} | EVAL sign = CASE(signed >= 0, "positive", "negative") | STATS count = COUNT(*) BY sign, category | SORT sign, count DESC, category`;

const chartsDashboard: EdgeCaseDashboard = {
  id: 'isomer-corpus-charts',
  title: 'Isomer corpus: chart types',
  description:
    'ES|QL data table, pie, donut, treemap, mosaic, waffle, heat map, gauge and tag cloud panels, and a data view legacy metric, with their styling options.',
  covers: ['missing_bucket', 'negative', 'multivalue'],
  panels: [
    {
      id: 'charts-table-esql',
      grid: { x: 0, y: 0, w: 24, h: 15 },
      config: {
        type: 'data_table',
        title: 'Counts and signed averages per category',
        data_source: esql(
          `FROM ${EDGE_CASE_INDEX} | STATS count = COUNT(*), signed = ROUND(AVG(signed), 1), total = SUM(value) BY category | SORT count DESC, category`
        ),
        rows: [{ column: 'category', label: 'Category', apply_color_to: 'badge' }],
        metrics: [
          { column: 'count', label: 'Documents', summary: { type: 'sum' }, width: 120 },
          {
            column: 'signed',
            label: 'Signed average',
            alignment: 'center',
            apply_color_to: 'background',
            color: {
              type: 'dynamic',
              range: 'absolute',
              steps: [
                { lt: -20, color: '#E7664C' },
                { gte: -20, lt: 0, color: '#D6BF57' },
                { gte: 0, color: '#54B399' },
              ],
            },
          },
          { column: 'total', visible: false },
        ],
        styling: { density: { mode: 'compact' }, paging: 10 },
      },
    },
    {
      id: 'charts-pie-esql',
      grid: { x: 24, y: 0, w: 12, h: 15 },
      config: {
        type: 'pie',
        title: 'Documents per category',
        data_source: esql(BY_CATEGORY),
        metrics: [{ column: 'count' }],
        group_by: [
          {
            column: 'category',
            color: {
              mode: 'categorical',
              palette: 'default',
              mapping: [{ values: ['alpha'], color: { type: 'color_code', value: '#E7664C' } }],
            },
          },
        ],
        legend: { visibility: 'visible' },
        styling: { values: { mode: 'percentage', percent_decimals: 1 } },
      },
    },
    {
      id: 'charts-donut-esql',
      grid: { x: 36, y: 0, w: 12, h: 15 },
      config: {
        type: 'pie',
        title: 'Documents per sign and category',
        data_source: esql(BY_SIGN_AND_CATEGORY),
        metrics: [{ column: 'count' }],
        group_by: [{ column: 'sign' }, { column: 'category' }],
        legend: { visibility: 'visible', nested: true },
        styling: { donut_hole: 'm', labels: { position: 'inside' } },
      },
    },
    {
      id: 'charts-treemap-esql',
      grid: { x: 0, y: 15, w: 16, h: 15 },
      config: {
        type: 'treemap',
        title: 'Treemap of signs and categories',
        data_source: esql(BY_SIGN_AND_CATEGORY),
        metrics: [{ column: 'count' }],
        group_by: [{ column: 'sign' }, { column: 'category' }],
        styling: { values: { mode: 'absolute' } },
      },
    },
    {
      id: 'charts-mosaic-esql',
      grid: { x: 16, y: 15, w: 16, h: 15 },
      config: {
        type: 'mosaic',
        title: 'Mosaic of signs by category',
        data_source: esql(BY_SIGN_AND_CATEGORY),
        metric: { column: 'count' },
        group_by: [{ column: 'sign' }],
        group_breakdown_by: [{ column: 'category' }],
        legend: { visibility: 'visible' },
      },
    },
    {
      id: 'charts-waffle-esql',
      grid: { x: 32, y: 15, w: 16, h: 15 },
      config: {
        type: 'waffle',
        title: 'Waffle of documents per category',
        data_source: esql(BY_CATEGORY),
        metrics: [{ column: 'count' }],
        group_by: [{ column: 'category' }],
        legend: { values: ['absolute'] },
      },
    },
    {
      id: 'charts-heatmap-esql',
      grid: { x: 0, y: 30, w: 32, h: 15 },
      config: {
        type: 'heatmap',
        title: 'Documents per day and category',
        data_source: esql(
          `FROM ${EDGE_CASE_INDEX} | STATS count = COUNT(*) BY day = BUCKET(${EDGE_CASE_TIME_FIELD}, 1 day), category | SORT day, category`
        ),
        x: { column: 'day' },
        y: { column: 'category' },
        metric: { column: 'count' },
        axis: { y: { title: { visible: true, text: 'Category' } } },
        legend: { visibility: 'visible', position: 'bottom' },
        styling: { cells: { labels: { visible: true } } },
      },
    },
    {
      id: 'charts-gauge-bullet-esql',
      grid: { x: 32, y: 30, w: 16, h: 8 },
      config: {
        type: 'gauge',
        title: 'Average value against its maximum',
        data_source: esql(
          `FROM ${EDGE_CASE_INDEX} | STATS average = ROUND(AVG(value), 2), ceiling = MAX(value) | EVAL target = 20`
        ),
        metric: {
          column: 'average',
          label: 'Average value',
          max: { column: 'ceiling' },
          goal: { column: 'target' },
        },
      },
    },
    {
      id: 'charts-gauge-arc-esql',
      grid: { x: 32, y: 38, w: 16, h: 7 },
      config: {
        type: 'gauge',
        title: 'Signed average on an arc',
        data_source: esql(
          `FROM ${EDGE_CASE_INDEX} | STATS signed = ROUND(AVG(signed), 2) | EVAL low = -100, high = 100`
        ),
        metric: {
          column: 'signed',
          min: { column: 'low' },
          max: { column: 'high' },
          subtitle: 'per document',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { gte: -100, lt: 0, color: '#E7664C' },
              { gte: 0, lte: 100, color: '#54B399' },
            ],
          },
        },
        styling: { shape: { type: 'arc' } },
      },
    },
    {
      id: 'charts-tagcloud-esql',
      grid: { x: 0, y: 45, w: 24, h: 12 },
      config: {
        type: 'tag_cloud',
        title: 'Tags (multivalue expanded)',
        data_source: esql(
          `FROM ${EDGE_CASE_INDEX} | MV_EXPAND tags | WHERE tags IS NOT NULL | STATS count = COUNT(*) BY tags | SORT count DESC, tags`
        ),
        metric: { column: 'count' },
        tag_by: { column: 'tags' },
        styling: { font_size: { min: 14, max: 48 } },
      },
    },
    {
      id: 'charts-legacy-metric',
      grid: { x: 24, y: 45, w: 24, h: 12 },
      config: {
        type: 'legacy_metric',
        title: 'Documents (legacy metric)',
        data_source: dataView,
        metric: {
          operation: 'count',
          label: 'Documents',
          size: 'xl',
          apply_color_to: 'background',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { lt: 100, color: '#E7664C' },
              { gte: 100, color: '#54B399' },
            ],
          },
        },
      },
    },
  ],
};

/** The authored edge-case dashboards. Their data is `buildEdgeCaseDocuments`. */
export const EDGE_CASE_DASHBOARDS: readonly EdgeCaseDashboard[] = [
  valuesDashboard,
  bucketsDashboard,
  longTitlesDashboard,
  chartsDashboard,
];

/** The as-code request body for `PUT /api/dashboards/{id}`. */
export const toDashboardRequestBody = ({ title, description, panels }: EdgeCaseDashboard) => ({
  title,
  description,
  time_range: { ...EDGE_CASE_TIME_RANGE },
  panels: panels.map(({ id, grid, config }) => ({ id, grid, type: 'vis', config })),
});
