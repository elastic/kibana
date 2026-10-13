/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { customContentPanelKind } from '../operations/panels/custom_content';
import { markdownPanelKind } from '../operations/panels/markdown';
import {
  anomalyChartsPanelKind,
  anomalySwimlanePanelKind,
  singleMetricViewerPanelKind,
} from '../operations/panels/ml_panels';
import { lensPanelKind, vegaPanelKind } from '../operations/panels/vis';
import { GRID_COLUMNS, type PanelSize } from './types';

interface PanelSizeRule {
  /** Name in the layout prompt, e.g. "Pie". */
  label: string;
  embeddableType: string;
  /** Lens chart types the rule applies to. Without them, it applies to every panel of the type. */
  chartTypes?: readonly string[];
  /** Size of a panel placed without one. */
  defaultSize: PanelSize;
  /** Sizing rule for the layout model. */
  rule: string;
}

const DEFAULT_SIZE: PanelSize = { w: 24, h: 10 };

/** Chart-type rules come before the rule of their embeddable type, so they match first. */
const PANEL_SIZE_RULES: readonly PanelSizeRule[] = [
  {
    label: 'Metric',
    embeddableType: lensPanelKind.embeddableType,
    chartTypes: [SupportedChartType.Metric, 'legacy_metric'],
    defaultSize: { w: 12, h: 5 },
    rule: 'small, `w` 6, 8, or 12 and `h` 5–6. Put 4–8 metrics in one row. Never make metrics full width.',
  },
  {
    label: 'Gauge',
    embeddableType: lensPanelKind.embeddableType,
    chartTypes: [SupportedChartType.Gauge],
    defaultSize: { w: 12, h: 8 },
    rule: '`w: 12, h: 8`, up to 4 per row.',
  },
  {
    label: 'Pie',
    embeddableType: lensPanelKind.embeddableType,
    chartTypes: [SupportedChartType.Pie, 'donut'],
    defaultSize: { w: 12, h: 10 },
    rule: '`w: 12, h: 10`.',
  },
  {
    label: 'Data table',
    embeddableType: lensPanelKind.embeddableType,
    chartTypes: [SupportedChartType.Datatable],
    defaultSize: { w: GRID_COLUMNS, h: 12 },
    rule: '`w: 24–48, h: 12–16`, preferably full width.',
  },
  {
    label: 'XY, heatmap, tag cloud, treemap, waffle, mosaic, and other Lens charts',
    embeddableType: lensPanelKind.embeddableType,
    defaultSize: DEFAULT_SIZE,
    rule: '`w: 24, h: 10`. The primary time series may be full width.',
  },
  {
    label: 'Vega',
    embeddableType: vegaPanelKind.embeddableType,
    defaultSize: DEFAULT_SIZE,
    rule: '`w: 24–48, h: 10–16`. Faceted or layered charts may be full width.',
  },
  {
    label: 'Markdown',
    embeddableType: markdownPanelKind.embeddableType,
    defaultSize: { w: GRID_COLUMNS, h: 6 },
    rule: '`w: 24–48, h: 4–9`, depending on the length of its content.',
  },
  {
    label: 'Custom content',
    embeddableType: customContentPanelKind.embeddableType,
    defaultSize: { w: GRID_COLUMNS, h: 12 },
    rule: '`w: 24–48`. A single card or one short row of cards `h: 6–8`; a list or table `h: 10–16`; a multi-part layout or a drawn chart `h: 16–20`.',
  },
  ...[anomalyChartsPanelKind, anomalySwimlanePanelKind, singleMetricViewerPanelKind].map(
    ({ embeddableType, label }) => ({
      label: `ML ${label}`,
      embeddableType,
      defaultSize: { w: GRID_COLUMNS, h: 12 },
      rule: '`w: 48, h: 12`.',
    })
  ),
];

type PanelContentFields = Pick<AttachmentPanel, 'type' | 'config'>;

/** Lens chart type of a panel (the `type` of its by-value config), when known. */
export const getLensChartType = ({ type, config }: PanelContentFields): string | undefined =>
  type === lensPanelKind.embeddableType && typeof config.type === 'string'
    ? config.type
    : undefined;

/** Default size of a panel placed without a size. */
export const getDefaultPanelSize = (panel: PanelContentFields): PanelSize => {
  const chartType = getLensChartType(panel);
  return (
    PANEL_SIZE_RULES.find(
      ({ embeddableType, chartTypes }) =>
        embeddableType === panel.type &&
        (!chartTypes || (chartType !== undefined && chartTypes.includes(chartType)))
    )?.defaultSize ?? DEFAULT_SIZE
  );
};

/** Sizing rules for the layout prompt, one line each. */
export const formatPanelSizeRules = (): string =>
  PANEL_SIZE_RULES.map(({ label, rule }) => `- ${label}: ${rule}`).join('\n');
