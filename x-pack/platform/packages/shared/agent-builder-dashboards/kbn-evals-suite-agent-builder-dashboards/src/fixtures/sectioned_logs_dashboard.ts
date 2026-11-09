/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

const LOGS = 'kibana_sample_data_logs';
const TIME_WINDOW = '| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
const TIME_BUCKET = '`Time Bucket` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';
const IS_ERROR = '| EVAL is_error = CASE(TO_INTEGER(response.keyword) >= 400, 1, 0)';

const esql = (query: string) => ({ type: 'esql', query });

const lensPanel = (
  id: string,
  grid: AttachmentPanel['grid'],
  config: Record<string, unknown>
): AttachmentPanel => ({ type: LENS_EMBEDDABLE_TYPE, id, grid, config });

const markdownPanel = (id: string, grid: AttachmentPanel['grid'], content: string) => ({
  type: 'markdown',
  id,
  grid,
  config: { content },
});

const metricPanel = (
  id: string,
  grid: AttachmentPanel['grid'],
  { where = '', expression }: { where?: string; expression: string }
) =>
  lensPanel(id, grid, {
    type: 'metric',
    data_source: esql(`FROM ${LOGS}\n${TIME_WINDOW}${where}\n| STATS \`Value\` = ${expression}`),
    metrics: [{ type: 'primary', column: 'Value' }],
  });

const timeSeriesPanel = (
  id: string,
  grid: AttachmentPanel['grid'],
  {
    title,
    layer,
    where = '',
    expression,
  }: { title: string; layer: 'area' | 'line'; where?: string; expression: string }
) =>
  lensPanel(id, grid, {
    type: 'xy',
    title,
    layers: [
      {
        type: layer,
        data_source: esql(
          `FROM ${LOGS}${where}\n| STATS \`Value\` = ${expression} BY ${TIME_BUCKET}`
        ),
        x: { column: 'Time Bucket' },
        y: [{ column: 'Value' }],
      },
    ],
    axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
    legend: { position: 'bottom', visibility: 'visible' },
    ...(layer === 'area' ? { styling: { areas: { fill: 'gradient' } } } : {}),
  });

const barPanel = (id: string, grid: AttachmentPanel['grid'], title: string, field: string) =>
  lensPanel(id, grid, {
    type: 'xy',
    title,
    layers: [
      {
        type: 'bar',
        data_source: esql(`FROM ${LOGS}
${TIME_WINDOW}
| STATS \`Requests\` = COUNT(*) BY ${field}
| SORT \`Requests\` DESC
| LIMIT 10`),
        x: { column: field },
        y: [{ column: 'Requests' }],
      },
    ],
    axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
    legend: { position: 'bottom', visibility: 'visible' },
  });

const tablePanel = (
  id: string,
  grid: AttachmentPanel['grid'],
  { title, where = '', field }: { title: string; where?: string; field: string }
) =>
  lensPanel(id, grid, {
    type: 'data_table',
    title,
    data_source: esql(`FROM ${LOGS}
${TIME_WINDOW}${where}
| STATS \`Requests\` = COUNT(*) BY ${field}
| SORT \`Requests\` DESC
| LIMIT 15`),
    metrics: [{ column: 'Requests' }],
    rows: [{ column: field }],
  });

const section = (
  id: string,
  title: string,
  y: number,
  panels: AttachmentPanel[]
): DashboardSection => ({ id, title, collapsed: false, grid: { y }, panels });

const IS_4XX = '\n| WHERE STARTS_WITH(response.keyword, "4")';
const IS_5XX = '\n| WHERE STARTS_WITH(response.keyword, "5")';
const IS_4XX_OR_5XX = '\n| WHERE TO_INTEGER(response.keyword) >= 400';

/**
 * A clean logs dashboard with sections, the seed of the layout edit examples.
 * Top level: an intro markdown and four KPIs, then Traffic, a note, Errors and
 * Visitors. It breaks no layout or chart rule, so any gap, overlap or styling
 * miss in a result comes from the edit. Ids are readable, so the gold can name
 * the panels and sections a prompt moves.
 */
export const SECTIONED_LOGS_DASHBOARD: DashboardAttachmentData = {
  title: 'Web traffic, errors and visitors',
  time_range: { from: 'now-7d', to: 'now' },
  panels: [
    markdownPanel(
      'intro',
      { x: 0, y: 0, w: 48, h: 6 },
      '# Web traffic\nRequest volume, transferred bytes, errors and visitors of the sample web logs.'
    ),
    metricPanel('kpi-requests', { x: 0, y: 6, w: 12, h: 5 }, { expression: 'COUNT(*)' }),
    metricPanel('kpi-bytes', { x: 12, y: 6, w: 12, h: 5 }, { expression: 'SUM(bytes)' }),
    metricPanel(
      'kpi-errors',
      { x: 24, y: 6, w: 12, h: 5 },
      { where: IS_4XX_OR_5XX, expression: 'COUNT(*)' }
    ),
    metricPanel(
      'kpi-error-rate',
      { x: 36, y: 6, w: 12, h: 5 },
      { where: IS_ERROR, expression: 'ROUND(100 * AVG(is_error), 2)' }
    ),
    section('traffic', 'Traffic', 11, [
      timeSeriesPanel(
        'requests-over-time',
        { x: 0, y: 0, w: 24, h: 10 },
        { title: 'Requests over time', layer: 'area', expression: 'COUNT(*)' }
      ),
      timeSeriesPanel(
        'bytes-over-time',
        { x: 24, y: 0, w: 24, h: 10 },
        { title: 'Bytes over time', layer: 'area', expression: 'SUM(bytes)' }
      ),
      barPanel(
        'requests-by-os',
        { x: 0, y: 10, w: 24, h: 10 },
        'Requests by OS',
        'machine.os.keyword'
      ),
      barPanel(
        'requests-by-country',
        { x: 24, y: 10, w: 24, h: 10 },
        'Requests by country',
        'geo.dest'
      ),
      lensPanel(
        'response-codes',
        { x: 0, y: 20, w: 12, h: 14 },
        {
          type: 'pie',
          title: 'Response codes',
          data_source: esql(`FROM ${LOGS}
${TIME_WINDOW}
| STATS \`Requests\` = COUNT(*) BY response.keyword
| SORT \`Requests\` DESC
| LIMIT 10`),
          metrics: [{ column: 'Requests' }],
          group_by: [{ column: 'response.keyword' }],
        }
      ),
      tablePanel(
        'top-urls',
        { x: 12, y: 20, w: 36, h: 14 },
        { title: 'Top URLs', field: 'url.keyword' }
      ),
    ]),
    markdownPanel(
      'note',
      { x: 0, y: 12, w: 48, h: 4 },
      'Errors are responses with a 4xx or 5xx status code.'
    ),
    section('errors', 'Errors', 16, [
      metricPanel(
        'error-rate',
        { x: 0, y: 0, w: 12, h: 10 },
        { where: IS_ERROR, expression: 'ROUND(100 * AVG(is_error), 2)' }
      ),
      timeSeriesPanel(
        'errors-4xx',
        { x: 12, y: 0, w: 36, h: 10 },
        { title: '4xx errors over time', layer: 'line', where: IS_4XX, expression: 'COUNT(*)' }
      ),
      timeSeriesPanel(
        'errors-5xx',
        { x: 0, y: 10, w: 48, h: 10 },
        { title: '5xx errors over time', layer: 'line', where: IS_5XX, expression: 'COUNT(*)' }
      ),
      tablePanel(
        'errors-by-host',
        { x: 0, y: 20, w: 24, h: 14 },
        { title: 'Errors by host', where: IS_4XX_OR_5XX, field: 'host.keyword' }
      ),
      tablePanel(
        'errors-by-url',
        { x: 24, y: 20, w: 24, h: 14 },
        { title: 'Errors by URL', where: IS_4XX_OR_5XX, field: 'url.keyword' }
      ),
    ]),
    section('visitors', 'Visitors', 17, [
      metricPanel(
        'unique-visitors',
        { x: 0, y: 0, w: 12, h: 10 },
        { expression: 'COUNT_DISTINCT(clientip)' }
      ),
      timeSeriesPanel(
        'visitors-over-time',
        { x: 12, y: 0, w: 36, h: 10 },
        {
          title: 'Unique visitors over time',
          layer: 'line',
          expression: 'COUNT_DISTINCT(clientip)',
        }
      ),
      tablePanel(
        'top-referrers',
        { x: 0, y: 10, w: 48, h: 14 },
        { title: 'Top referrers', field: 'referer' }
      ),
    ]),
  ],
};

/** The same dashboard with the Visitors section collapsed. */
export const SECTIONED_LOGS_DASHBOARD_VISITORS_COLLAPSED: DashboardAttachmentData = {
  ...SECTIONED_LOGS_DASHBOARD,
  panels: SECTIONED_LOGS_DASHBOARD.panels.map((widget) =>
    isSection(widget) && widget.id === 'visitors' ? { ...widget, collapsed: true } : widget
  ),
};
