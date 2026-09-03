/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import {
  chartTypeLayouts,
  type ChartTypeLayout,
} from '@kbn/agent-builder-visualizations-server';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { markdownHeight } from './markdown_height';

const widthRange = (from: number, to: number): readonly number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const XY_FAMILY: ChartTypeLayout = {
  h: 10,
  defaultW: 24,
  allowedW: widthRange(12, 48),
  minW: 12,
  maxPerRow: 4,
};

const CUSTOM_CONTENT_LAYOUT: ChartTypeLayout = {
  h: 8,
  defaultW: 24,
  allowedW: widthRange(12, 48),
  minW: 12,
  maxPerRow: 4,
};

const UNKNOWN_LAYOUT: ChartTypeLayout = {
  h: 10,
  defaultW: 24,
  allowedW: widthRange(12, 48),
  minW: 12,
  maxPerRow: 4,
};

const LONE_DEFAULT_TYPES = new Set(['metric', 'legacy_metric', 'gauge', 'pie']);

export const getPanelLayoutSize = (panel: AttachmentPanel): ChartTypeLayout => {
  if (panel.type === MARKDOWN_EMBEDDABLE_TYPE) {
    const content = typeof panel.config.content === 'string' ? panel.config.content : '';
    return {
      h: markdownHeight(content),
      defaultW: 48,
      allowedW: widthRange(24, 48),
      minW: 24,
      maxPerRow: 2,
    };
  }
  if (panel.type === VEGA_VIS_TYPE) {
    return XY_FAMILY;
  }
  if (panel.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE) {
    return CUSTOM_CONTENT_LAYOUT;
  }

  const type = typeof panel.config.type === 'string' ? panel.config.type : undefined;
  if (type === 'legacy_metric') {
    return chartTypeLayouts[SupportedChartType.Metric];
  }
  if (type && Object.prototype.hasOwnProperty.call(chartTypeLayouts, type)) {
    return chartTypeLayouts[type as SupportedChartType];
  }
  return UNKNOWN_LAYOUT;
};

export const usesLoneDefaultWidth = (panel: AttachmentPanel): boolean => {
  const type = typeof panel.config.type === 'string' ? panel.config.type : '';
  return LONE_DEFAULT_TYPES.has(type);
};
