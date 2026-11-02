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
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

export const GRID_COLUMNS = 48;

/** Plain-object guard for walking untyped tool payloads and panel configs. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Panels that share one coordinate space: the top level, or one section. */
export interface PanelContainer {
  /** `undefined` for the top level. */
  sectionTitle?: string;
  panels: AttachmentPanel[];
}

export const getPanelContainers = (dashboard: DashboardAttachmentData): PanelContainer[] => [
  { panels: dashboard.panels.filter((widget): widget is AttachmentPanel => !isSection(widget)) },
  ...dashboard.panels.filter(isSection).map(({ title, panels }) => ({
    sectionTitle: title,
    panels,
  })),
];

export const getLeafPanels = (dashboard: DashboardAttachmentData): AttachmentPanel[] =>
  getPanelContainers(dashboard).flatMap(({ panels }) => panels);

export const getSectionTitles = (dashboard: DashboardAttachmentData): string[] =>
  dashboard.panels.filter(isSection).map(({ title }) => title);

/** Lens chart type (`metric`, `xy`, …) for Lens panels, the embeddable type otherwise. */
export const getPanelKind = ({ type, config }: AttachmentPanel): string =>
  type === LENS_EMBEDDABLE_TYPE && typeof config.type === 'string' ? config.type : type;

const SUMMARY_KINDS = new Set(['metric', 'gauge']);
const NON_CHART_KINDS = new Set(['markdown']);

export const isSummaryPanel = (panel: AttachmentPanel): boolean =>
  SUMMARY_KINDS.has(getPanelKind(panel));

export const isChartPanel = (panel: AttachmentPanel): boolean =>
  !NON_CHART_KINDS.has(getPanelKind(panel));

const getDataSourceQuery = (value: unknown): string | undefined =>
  isRecord(value) && isRecord(value.data_source) && typeof value.data_source.query === 'string'
    ? value.data_source.query
    : undefined;

/** Every ES|QL query behind a Lens panel: the root data source and each layer's. */
export const getPanelQueries = ({ config }: AttachmentPanel): string[] => {
  const layers = Array.isArray(config.layers) ? config.layers : [];
  return [config, ...layers]
    .map(getDataSourceQuery)
    .filter((query): query is string => query !== undefined);
};

export const normalizeQuery = (query: string): string => query.replace(/\s+/g, ' ').trim();

/** One key per set of queries, so panels running the same ES|QL compare equal. */
export const getPanelQueryKey = (queries: readonly string[]): string =>
  queries.map(normalizeQuery).sort().join('\n');

export const TIME_SLIDER_CONTROL = 'time_slider_control';

const KEYWORD_SUFFIX = '.keyword';

/** The field a `.keyword` multi-field belongs to; other names are returned as they are. */
export const withoutKeyword = (field: string): string =>
  field.endsWith(KEYWORD_SUFFIX) ? field.slice(0, -KEYWORD_SUFFIX.length) : field;

const STATS_BY = /\bSTATS\b[^|]*?\bBY\s+([^|]+)/i;

/** Stored controls of a dashboard: `pinned_panels` entries that are plain objects. */
export const getControls = (dashboard: DashboardAttachmentData): Array<Record<string, unknown>> =>
  (dashboard.pinned_panels ?? []).filter(isRecord);

/** Fields a control filters on: the `STATS … BY` targets of its ES|QL, or its DSL field. */
export const getControlFields = (control: Record<string, unknown>): string[] => {
  const config = isRecord(control.config) ? control.config : {};
  if (typeof config.esql_query === 'string') {
    const byClause = STATS_BY.exec(config.esql_query)?.[1] ?? '';
    return byClause
      .split(',')
      .map((field) => field.replace(/`/g, '').trim())
      .filter((field) => field.length > 0);
  }
  const field = config.field_name ?? config.field;
  return typeof field === 'string' ? [field] : [];
};

/** Reading order inside a container: top to bottom, then left to right. */
export const byReadingOrder = (a: AttachmentPanel, b: AttachmentPanel): number =>
  a.grid.y - b.grid.y || a.grid.x - b.grid.x;

const formatPanel = (panel: AttachmentPanel, indent: string): string => {
  const { id, config, grid } = panel;
  const title = typeof config.title === 'string' ? ` "${config.title}"` : '';
  return [
    `${indent}[${id}] ${getPanelKind(panel)} grid=${grid.x},${grid.y},${grid.w}x${grid.h}${title}`,
    ...getPanelQueries(panel).map((query) => `${indent}    esql: ${normalizeQuery(query)}`),
  ].join('\n');
};

const formatControls = (dashboard: DashboardAttachmentData): string => {
  const controls = getControls(dashboard);
  const fields = controls.flatMap(getControlFields);
  return `  controls: ${controls.length}${fields.length > 0 ? ` (${fields.join(', ')})` : ''}`;
};

/** Compact rendering for logs: one line per panel with its grid and ES|QL. */
export const formatDashboard = (dashboard: DashboardAttachmentData): string =>
  [
    `  title: ${dashboard.title}`,
    ...dashboard.panels.map((widget) =>
      isSection(widget)
        ? [
            `  section "${widget.title}" y=${widget.grid.y}`,
            ...widget.panels.map((panel) => formatPanel(panel, '    ')),
          ].join('\n')
        : formatPanel(widget, '  ')
    ),
    formatControls(dashboard),
  ].join('\n');
