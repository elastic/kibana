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

/** Minimal Lens panel for rule tests; `config.type` decides the chart kind. */
export const panel = (
  id: string,
  grid: AttachmentPanel['grid'],
  config: Record<string, unknown>
): AttachmentPanel => ({ type: LENS_EMBEDDABLE_TYPE, id, grid, config });

export const metric = (
  id: string,
  grid: AttachmentPanel['grid'],
  query = `FROM logs | STATS \`Value\` = COUNT(*)`,
  extra: Record<string, unknown> = {}
): AttachmentPanel =>
  panel(id, grid, {
    type: 'metric',
    data_source: { type: 'esql', query },
    metrics: [{ type: 'primary', column: 'Value' }],
    ...extra,
  });

export const xy = (
  id: string,
  grid: AttachmentPanel['grid'],
  extra: Record<string, unknown> = {},
  layer: Record<string, unknown> = {}
): AttachmentPanel =>
  panel(id, grid, {
    type: 'xy',
    title: 'Requests over time',
    layers: [
      {
        type: 'bar',
        data_source: { type: 'esql', query: 'FROM logs | STATS `Requests` = COUNT(*) BY response' },
        x: { column: 'response' },
        y: [{ column: 'Requests' }],
        ...layer,
      },
    ],
    axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
    legend: { position: 'bottom', visibility: 'auto' },
    ...extra,
  });

export const control = (
  field: string,
  type = 'options_list_control',
  index = 'logs'
): Record<string, unknown> => ({
  type,
  id: `control-${field}`,
  config: { esql_query: `FROM ${index} | STATS BY \`${field}\`` },
});

export const dashboard = (
  panels: DashboardAttachmentData['panels'],
  extra: Partial<DashboardAttachmentData> = {}
): DashboardAttachmentData => ({
  title: 'Web traffic',
  panels,
  ...extra,
});

export const section = (
  id: string,
  title: string,
  y: number,
  panels: AttachmentPanel[]
): DashboardAttachmentData['panels'][number] => ({
  id,
  title,
  collapsed: false,
  grid: { y },
  panels,
});
