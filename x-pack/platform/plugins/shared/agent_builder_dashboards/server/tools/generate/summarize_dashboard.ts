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
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

const MAX_SUMMARY_QUERIES = 2;
const MAX_SUMMARY_QUERY_LENGTH = 512;

const truncateQuery = (query: string): string =>
  query.length > MAX_SUMMARY_QUERY_LENGTH
    ? `${query.slice(0, MAX_SUMMARY_QUERY_LENGTH - 1)}…`
    : query;

const getVegaSpec = (config: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (typeof config.spec !== 'string') {
    return undefined;
  }

  try {
    const spec = JSON.parse(config.spec);
    return spec && typeof spec === 'object' && !Array.isArray(spec)
      ? (spec as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const getTitle = (
  config: Record<string, unknown>,
  vegaSpec: Record<string, unknown> | undefined
): string | undefined => {
  if (typeof config.title === 'string') {
    return config.title;
  }

  const specTitle = vegaSpec?.title;
  if (typeof specTitle === 'string') {
    return specTitle;
  }
  if (
    specTitle &&
    typeof specTitle === 'object' &&
    !Array.isArray(specTitle) &&
    typeof (specTitle as { text?: unknown }).text === 'string'
  ) {
    return (specTitle as { text: string }).text;
  }
};

const getEsqlQueries = (
  config: Record<string, unknown>,
  vegaSpec: Record<string, unknown> | undefined
): string[] => {
  const carriers = Array.isArray(config.layers) ? config.layers : [config];
  const queries = carriers.flatMap((carrier) => {
    if (!carrier || typeof carrier !== 'object' || Array.isArray(carrier)) {
      return [];
    }
    const dataSource = (carrier as { data_source?: unknown }).data_source;
    if (!dataSource || typeof dataSource !== 'object' || Array.isArray(dataSource)) {
      return [];
    }
    const query = (dataSource as { type?: unknown; query?: unknown }).query;
    return (dataSource as { type?: unknown }).type === 'esql' && typeof query === 'string'
      ? [query]
      : [];
  });

  const data = vegaSpec?.data;
  const url =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as { url?: unknown }).url
      : undefined;
  const vegaQuery =
    url && typeof url === 'object' && !Array.isArray(url)
      ? (url as { query?: unknown }).query
      : undefined;
  if (typeof vegaQuery === 'string') {
    queries.push(vegaQuery);
  }

  return [...new Set(queries)].slice(0, MAX_SUMMARY_QUERIES).map(truncateQuery);
};

const summarizePanel = ({ type, id, grid, config }: AttachmentPanel) => {
  const vegaSpec = type === VEGA_VIS_TYPE ? getVegaSpec(config) : undefined;
  const title = getTitle(config, vegaSpec);
  const description = typeof config.description === 'string' ? config.description : undefined;
  const chartType = typeof config.type === 'string' ? config.type : undefined;
  const renderer =
    type === LENS_EMBEDDABLE_TYPE ? 'lens' : type === VEGA_VIS_TYPE ? 'vega' : undefined;
  const esql = getEsqlQueries(config, vegaSpec);

  return {
    type,
    id,
    grid,
    ...(renderer ? { renderer } : {}),
    ...(chartType ? { chartType } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(esql.length > 0 ? { esql } : {}),
  };
};

/**
 * Compact projection of a dashboard payload.
 *
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call.
 */
export const summarizeDashboard = (dashboardData: DashboardAttachmentData) => ({
  title: dashboardData.title,
  description: dashboardData.description,
  panels: dashboardData.panels.map((widget) => {
    if (isSection(widget)) {
      return {
        id: widget.id,
        title: widget.title,
        collapsed: widget.collapsed,
        grid: widget.grid,
        panels: widget.panels.map(summarizePanel),
      };
    }
    return summarizePanel(widget);
  }),
  controls: (dashboardData.pinned_panels ?? []).map((control) => {
    const c = control as { id?: string; type?: string; config?: { title?: string } };
    return { id: c.id, type: c.type, title: c.config?.title };
  }),
});

export type DashboardSummary = ReturnType<typeof summarizeDashboard>;
