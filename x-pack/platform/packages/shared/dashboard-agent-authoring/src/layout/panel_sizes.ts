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

/** Characters of markdown text that fit on one line of a full-width panel. */
const MARKDOWN_CHARACTERS_PER_LINE = 150;
/** Rows a markdown panel needs around its text. */
const MARKDOWN_PADDING_ROWS = 2;

interface SizeBounds {
  min: PanelSize;
  max: PanelSize;
}

interface SizeClass extends SizeBounds {
  /** Panels of the class, as the layout prompt names them. */
  label: string;
  /** Extra guidance for the layout model. */
  note?: string;
}

const SIZE_CLASSES = {
  metric: {
    label: 'Lens metrics',
    min: { w: 8, h: 4 },
    max: { w: 16, h: 6 },
    note: '3–6 per row. Never full width.',
  },
  compact: {
    label: 'Lens gauges, pies, and donuts',
    min: { w: 12, h: 8 },
    max: { w: 24, h: 10 },
  },
  chart: {
    label: 'Lens bar charts, heatmaps, tag clouds, treemaps, waffles, mosaics, and region maps',
    min: { w: 24, h: 10 },
    max: { w: 24, h: 14 },
  },
  trend: {
    label: 'Lens line and area charts',
    min: { w: 24, h: 10 },
    max: { w: GRID_COLUMNS, h: 14 },
    note: 'The main trend may be full width.',
  },
  table: {
    label: 'Lens data tables',
    min: { w: 24, h: 12 },
    max: { w: GRID_COLUMNS, h: 16 },
    note: 'Prefer full width.',
  },
  wide: {
    label: 'Vega, custom content, and ML panels',
    min: { w: 24, h: 10 },
    max: { w: GRID_COLUMNS, h: 16 },
    note: 'Give complex Vega and custom content (multi-section layouts, layered or multi-view charts, diagrams) full width.',
  },
  markdown: {
    label: 'Markdown',
    min: { w: 24, h: 3 },
    max: { w: GRID_COLUMNS, h: 10 },
    note: `\`h\` fits the text: \`textLines\` + ${MARKDOWN_PADDING_ROWS} at \`w: 48\`, about twice the text lines at \`w: 24\`; usually 4–6. Give it a row of its own.`,
  },
} as const satisfies Record<string, SizeClass>;

export type SizeClassName = keyof typeof SIZE_CLASSES;

interface PanelSizeRule {
  embeddableType: string;
  /** Lens chart types the rule applies to. Without them, it applies to every panel of the type. */
  chartTypes?: readonly string[];
  sizeClass: SizeClassName;
  /** Size of a panel placed without one. */
  defaultSize: PanelSize;
}

const DEFAULT_SIZE: PanelSize = { w: 24, h: 10 };

const lensRule = (
  chartTypes: readonly string[] | undefined,
  sizeClass: SizeClassName,
  defaultSize: PanelSize
): PanelSizeRule => ({
  embeddableType: lensPanelKind.embeddableType,
  ...(chartTypes ? { chartTypes } : {}),
  sizeClass,
  defaultSize,
});

/** Chart-type rules come before the rule of their embeddable type, so they match first. */
const PANEL_SIZE_RULES: readonly PanelSizeRule[] = [
  lensRule([SupportedChartType.Metric, 'legacy_metric'], 'metric', { w: 12, h: 5 }),
  lensRule([SupportedChartType.Gauge], 'compact', { w: 12, h: 8 }),
  lensRule([SupportedChartType.Pie, 'donut'], 'compact', { w: 12, h: 10 }),
  lensRule([SupportedChartType.Datatable], 'table', { w: GRID_COLUMNS, h: 12 }),
  lensRule(undefined, 'chart', DEFAULT_SIZE),
  { embeddableType: vegaPanelKind.embeddableType, sizeClass: 'wide', defaultSize: DEFAULT_SIZE },
  {
    embeddableType: customContentPanelKind.embeddableType,
    sizeClass: 'wide',
    defaultSize: { w: GRID_COLUMNS, h: 12 },
  },
  ...[anomalyChartsPanelKind, anomalySwimlanePanelKind, singleMetricViewerPanelKind].map(
    ({ embeddableType }): PanelSizeRule => ({
      embeddableType,
      sizeClass: 'wide',
      defaultSize: { w: GRID_COLUMNS, h: 12 },
    })
  ),
];

type PanelContentFields = Pick<AttachmentPanel, 'type' | 'config'>;

/** Lens chart type of a panel (the `type` of its by-value config), when known. */
export const getLensChartType = ({ type, config }: PanelContentFields): string | undefined =>
  type === lensPanelKind.embeddableType && typeof config.type === 'string'
    ? config.type
    : undefined;

/** Whether a Lens XY panel draws lines or areas, which makes it a trend. */
const isLensTrend = ({ config }: PanelContentFields): boolean =>
  Array.isArray(config.layers) &&
  config.layers.some(
    (layer: unknown) =>
      typeof layer === 'object' &&
      layer !== null &&
      'type' in layer &&
      typeof layer.type === 'string' &&
      (layer.type === 'line' || layer.type.startsWith('area'))
  );

/** Lines the text of a markdown panel takes at full width, or undefined for other panels. */
export const getMarkdownTextLines = ({ type, config }: PanelContentFields): number | undefined => {
  if (type !== markdownPanelKind.embeddableType || typeof config.content !== 'string') {
    return undefined;
  }
  return config.content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .reduce((lines, line) => lines + Math.ceil(line.length / MARKDOWN_CHARACTERS_PER_LINE), 0);
};

/** Height that fits markdown text of `textLines` full-width lines in a panel `w` columns wide. */
export const getMarkdownHeight = (textLines: number, w: number): number => {
  const { min, max } = SIZE_CLASSES.markdown;
  const h = Math.ceil((textLines * GRID_COLUMNS) / w) + MARKDOWN_PADDING_ROWS;
  return Math.min(Math.max(h, min.h), max.h);
};

const findSizeRule = (panel: PanelContentFields): PanelSizeRule | undefined => {
  const chartType = getLensChartType(panel);
  return PANEL_SIZE_RULES.find(
    ({ embeddableType, chartTypes }) =>
      embeddableType === panel.type &&
      (!chartTypes || (chartType !== undefined && chartTypes.includes(chartType)))
  );
};

/** Size class of a panel, or undefined for panel types without one. */
export const getPanelSizeClass = (panel: PanelContentFields): SizeClassName | undefined => {
  if (panel.type === markdownPanelKind.embeddableType) {
    return 'markdown';
  }
  if (getLensChartType(panel) === SupportedChartType.XY && isLensTrend(panel)) {
    return 'trend';
  }
  return findSizeRule(panel)?.sizeClass;
};

/** Default size of a panel placed without a size. */
export const getDefaultPanelSize = (panel: PanelContentFields): PanelSize => {
  const textLines = getMarkdownTextLines(panel);
  if (textLines !== undefined) {
    return { w: GRID_COLUMNS, h: getMarkdownHeight(textLines, GRID_COLUMNS) };
  }
  return findSizeRule(panel)?.defaultSize ?? DEFAULT_SIZE;
};

const formatRange = (min: number, max: number): string =>
  min === max ? `${min}` : `${min}–${max}`;

/** Size classes for the layout prompt, one line each. */
export const formatSizeClasses = (): string =>
  Object.entries(SIZE_CLASSES)
    .map(([name, sizeClass]: [string, SizeClass]) => {
      const { label, min, max, note } = sizeClass;
      const sizes = `\`w: ${formatRange(min.w, max.w)}, h: ${formatRange(min.h, max.h)}\``;
      return `- \`${name}\` (${label}): ${sizes}.${note ? ` ${note}` : ''}`;
    })
    .join('\n');
