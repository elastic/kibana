/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '../panels/markdown';
import { GRID_COLUMNS, type PanelSize } from './types';

const DEFAULT_SIZE: PanelSize = { w: 24, h: 10 };

const LENS_SIZES_BY_CHART_TYPE: Readonly<Record<string, PanelSize>> = {
  metric: { w: 12, h: 5 },
  legacy_metric: { w: 12, h: 5 },
  gauge: { w: 12, h: 8 },
  pie: { w: 12, h: 10 },
  donut: { w: 12, h: 10 },
  data_table: { w: GRID_COLUMNS, h: 12 },
};

const SIZES_BY_EMBEDDABLE_TYPE: Readonly<Record<string, PanelSize>> = {
  [MARKDOWN_EMBEDDABLE_TYPE]: { w: GRID_COLUMNS, h: 6 },
  [CUSTOM_CONTENT_EMBEDDABLE_TYPE]: { w: GRID_COLUMNS, h: 12 },
  ml_anomaly_charts: { w: GRID_COLUMNS, h: 12 },
  ml_anomaly_swimlane: { w: GRID_COLUMNS, h: 12 },
  ml_single_metric_viewer: { w: GRID_COLUMNS, h: 12 },
};

/** Lens chart type of a panel (the `type` of its by-value config), when known. */
export const getLensChartType = ({ type, config }: AttachmentPanel): string | undefined =>
  type === LENS_EMBEDDABLE_TYPE && typeof config.type === 'string' ? config.type : undefined;

/** Default size of a panel placed without a size, following the chart type sizing guidance. */
export const getDefaultPanelSize = (panel: AttachmentPanel): PanelSize => {
  const chartType = getLensChartType(panel);
  const chartTypeSize = chartType ? LENS_SIZES_BY_CHART_TYPE[chartType] : undefined;
  return chartTypeSize ?? SIZES_BY_EMBEDDABLE_TYPE[panel.type] ?? DEFAULT_SIZE;
};
