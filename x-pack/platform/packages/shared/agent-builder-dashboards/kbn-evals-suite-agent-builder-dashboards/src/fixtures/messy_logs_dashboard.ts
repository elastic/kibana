/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { EnhanceDefectId } from '../evaluators/seed_defects';

const LOGS = 'kibana_sample_data_logs';
const TIME_WINDOW = '| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
const REQUESTS_BY_RESPONSE = `FROM ${LOGS}
${TIME_WINDOW}
| STATS \`Requests\` = COUNT(*) BY response.keyword
| SORT \`Requests\` DESC
| LIMIT 10`;

const esql = (query: string) => ({ type: 'esql', query });

const lensPanel = (
  id: string,
  grid: AttachmentPanel['grid'],
  config: Record<string, unknown>
): AttachmentPanel => ({ type: LENS_EMBEDDABLE_TYPE, id, grid, config });

const metricPanel = (
  id: string,
  grid: AttachmentPanel['grid'],
  expression: string,
  { primary = {}, ...extra }: { primary?: Record<string, unknown> } & Record<string, unknown> = {}
) =>
  lensPanel(id, grid, {
    type: 'metric',
    data_source: esql(`FROM ${LOGS}\n${TIME_WINDOW}\n| STATS \`Value\` = ${expression}`),
    metrics: [{ type: 'primary', column: 'Value', ...primary }],
    ...extra,
  });

const barByResponsePanel = (id: string, grid: AttachmentPanel['grid']) =>
  lensPanel(id, grid, {
    type: 'xy',
    layers: [
      {
        type: 'bar',
        data_source: esql(REQUESTS_BY_RESPONSE),
        x: { column: 'response.keyword' },
        y: [{ column: 'Requests' }],
      },
    ],
  });

/**
 * A working but badly arranged logs dashboard. Layout: charts before the KPIs,
 * a full-width metric, nine charts with no sections, a placeholder title.
 * Charts: a titled metric, untitled xy and pie panels, xy axis
 * titles and a right-hand legend, a solid area fill, a static series color, a
 * legacy pie palette and a pie legend, a metric colored on the background, a
 * percent format on a 0–100 column, and markdown with edit notes to rewrite.
 * Content: the same bar chart twice and no controls. Every chart is an ES|QL
 * Lens config over `kibana_sample_data_logs`, so appearance mode can enhance
 * all of them in place. The narrating markdown may be rewritten or deleted
 * in either mode.
 */
export const MESSY_LOGS_DASHBOARD: DashboardAttachmentData = {
  title: 'Untitled dashboard',
  time_range: { from: 'now-7d', to: 'now' },
  panels: [
    lensPanel(
      'requests-over-time',
      { x: 0, y: 0, w: 24, h: 10 },
      {
        type: 'xy',
        layers: [
          {
            type: 'area',
            data_source: esql(
              `FROM ${LOGS}\n| STATS \`Requests\` = COUNT(*) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`
            ),
            x: { column: 'Time Bucket' },
            y: [{ column: 'Requests', color: { type: 'static', color: '#ff0000' } }],
          },
        ],
        axis: {
          x: { title: { text: 'Time', visible: true } },
          y: { title: { text: 'Count', visible: true } },
        },
        legend: { position: 'right', visibility: 'visible' },
        styling: { areas: { fill: 'solid' } },
      }
    ),
    barByResponsePanel('requests-by-response', { x: 24, y: 0, w: 24, h: 10 }),
    metricPanel('total-requests', { x: 0, y: 10, w: 48, h: 5 }, 'COUNT(*)', {
      title: 'Total Requests',
    }),
    metricPanel('unique-visitors', { x: 0, y: 15, w: 12, h: 5 }, 'COUNT_DISTINCT(clientip)'),
    metricPanel('average-bytes', { x: 12, y: 15, w: 12, h: 5 }, 'AVG(bytes)', {
      primary: { color: { type: 'static', color: '#54B399' }, apply_color_to: 'background' },
    }),
    lensPanel(
      'requests-by-os',
      { x: 24, y: 15, w: 24, h: 10 },
      {
        type: 'pie',
        data_source: esql(`FROM ${LOGS}
${TIME_WINDOW}
| STATS \`Requests\` = COUNT(*) BY machine.os.keyword
| SORT \`Requests\` DESC
| LIMIT 10`),
        metrics: [{ column: 'Requests' }],
        group_by: [
          {
            column: 'machine.os.keyword',
            color: { mode: 'categorical', palette: 'eui_amsterdam', mapping: [] },
          },
        ],
        legend: { visibility: 'visible' },
      }
    ),
    barByResponsePanel('response-breakdown', { x: 0, y: 25, w: 48, h: 10 }),
    lensPanel(
      'top-countries',
      { x: 0, y: 35, w: 24, h: 10 },
      {
        type: 'tag_cloud',
        title: 'Top source countries',
        data_source: esql(`FROM ${LOGS}
${TIME_WINDOW}
| STATS \`Requests\` = COUNT(*) BY geo.src
| SORT \`Requests\` DESC
| LIMIT 20`),
        metric: { column: 'Requests' },
        tag_by: { column: 'geo.src' },
      }
    ),
    lensPanel(
      'error-rate',
      { x: 24, y: 35, w: 12, h: 5 },
      {
        type: 'metric',
        data_source: esql(`FROM ${LOGS}
${TIME_WINDOW}
| EVAL is_error = CASE(TO_INTEGER(response.keyword) >= 400, 1, 0)
| STATS \`Error rate\` = 100 * AVG(is_error)`),
        metrics: [{ type: 'primary', column: 'Error rate', format: { type: 'percent' } }],
      }
    ),
    {
      type: 'markdown',
      id: 'notes',
      grid: { x: 0, y: 45, w: 48, h: 4 },
      config: { content: 'I rearranged the panels and added a pie chart for operating systems.' },
    },
  ],
};

/**
 * Rules the seeded dashboard breaks; each mode is scored on the ones it may fix.
 * The placeholder title is declared once, as `title_not_rewritten`, which holds
 * for any seed title; Dashboard Titles & Labels still flags a placeholder result.
 */
export const MESSY_LOGS_DASHBOARD_DEFECTS: EnhanceDefectId[] = [
  'title_not_rewritten',
  'full_width_kpi',
  'summary_not_first',
  'summary_panel_titled',
  'chart_panel_untitled',
  'xy_axis_title',
  'markdown_not_rewritten',
  'area_solid_fill',
  'xy_legend',
  'pie_legend_set',
  'metric_colors_background',
  'legacy_palette',
  'static_color_override',
  'percent_format_on_0_100',
  'duplicate_measure',
  'no_controls',
];
