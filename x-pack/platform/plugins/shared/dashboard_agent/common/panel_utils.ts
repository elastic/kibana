/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import {
  type AttachmentPanel,
  isLensAttachmentPanel,
  isGenericAttachmentPanel,
} from '@kbn/dashboard-agent-common';
import {
  DEFAULT_PANEL_HEIGHT,
  SMALL_PANEL_WIDTH,
  LARGE_PANEL_WIDTH,
  MARKDOWN_PANEL_WIDTH,
  MARKDOWN_MIN_HEIGHT,
  MARKDOWN_MAX_HEIGHT,
  SMALL_CHART_TYPES,
} from './panel_constants';

const DASHBOARD_GRID_COLUMN_COUNT = 48;
const MARKDOWN_EMBEDDABLE_TYPE = 'DASHBOARD_MARKDOWN';

export interface PanelLayoutConfig {
  defaultPanelHeight: number;
  smallPanelWidth: number;
  largePanelWidth: number;
  markdownPanelWidth: number;
  markdownMinHeight: number;
  markdownMaxHeight: number;
  smallChartTypes: ReadonlySet<string>;
  dashboardGridColumnCount: number;
}

export const panelLayout: PanelLayoutConfig = {
  defaultPanelHeight: DEFAULT_PANEL_HEIGHT,
  smallPanelWidth: SMALL_PANEL_WIDTH,
  largePanelWidth: LARGE_PANEL_WIDTH,
  markdownPanelWidth: MARKDOWN_PANEL_WIDTH,
  markdownMinHeight: MARKDOWN_MIN_HEIGHT,
  markdownMaxHeight: MARKDOWN_MAX_HEIGHT,
  smallChartTypes: SMALL_CHART_TYPES,
  dashboardGridColumnCount: DASHBOARD_GRID_COLUMN_COUNT,
};

export const getLensPanelWidthFromAttributes = (lensAttributes: LensAttributes): number => {
  const visType = lensAttributes.visualizationType;
  const isSmallChart =
    visType === 'lnsMetric' || visType === 'lnsLegacyMetric' || visType === 'lnsGauge';
  return isSmallChart ? SMALL_PANEL_WIDTH : LARGE_PANEL_WIDTH;
};

export const getPanelWidth = (chartType: string, layout: PanelLayoutConfig): number => {
  return layout.smallChartTypes.has(chartType) ? layout.smallPanelWidth : layout.largePanelWidth;
};

export const getPanelDimensions = (chartType: string): { width: number; height: number } => {
  return {
    width: getPanelWidth(chartType, panelLayout),
    height: DEFAULT_PANEL_HEIGHT,
  };
};

export const calculateMarkdownPanelHeight = (
  content: string,
  layout: PanelLayoutConfig = panelLayout
): number => {
  const lineCount = content.split('\n').length;
  const estimatedHeight = lineCount + 2;
  return Math.max(layout.markdownMinHeight, Math.min(layout.markdownMaxHeight, estimatedHeight));
};

export const buildMarkdownPanel = (
  content: string,
  layout: PanelLayoutConfig = panelLayout
): DashboardPanel => ({
  type: MARKDOWN_EMBEDDABLE_TYPE,
  config: { content },
  grid: {
    x: 0,
    y: 0,
    w: layout.markdownPanelWidth,
    h: calculateMarkdownPanelHeight(content, layout),
  },
});

export const getMarkdownPanelHeight = (
  content: string,
  layout: PanelLayoutConfig = panelLayout
): number => calculateMarkdownPanelHeight(content, layout);

export const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  grid: DashboardPanel['grid'],
  uid?: string
): DashboardPanel => {
  const lensAttributes: LensAttributes = new LensConfigBuilder().fromAPIFormat(config);

  const lensConfig: LensSerializedAPIConfig = {
    title: lensAttributes.title ?? config.title ?? 'Generated panel',
    attributes: lensAttributes,
  };

  return {
    type: 'lens',
    grid,
    config: lensConfig,
    uid,
  };
};

export interface BuildPanelFromRawConfigOptions {
  embeddableType: string;
  rawConfig: Record<string, unknown>;
  title: string | undefined;
  position: { currentX: number; currentY: number };
  layout: PanelLayoutConfig;
  uid?: string;
  getLensPanelWidth?: (lensAttributes: LensAttributes) => number;
}

export const buildPanelFromRawConfig = (
  options: BuildPanelFromRawConfigOptions
): DashboardPanel | null => {
  const { embeddableType, rawConfig, title, position, layout, uid, getLensPanelWidth } = options;
  const { currentX, currentY } = position;

  if (embeddableType === 'lens') {
    // For Lens panels, rawConfig is LensAttributes
    const lensAttributes = rawConfig as LensAttributes;
    const w = getLensPanelWidth ? getLensPanelWidth(lensAttributes) : layout.largePanelWidth;

    let x = currentX;
    let y = currentY;
    if (x + w > layout.dashboardGridColumnCount) {
      x = 0;
      y += layout.defaultPanelHeight;
    }

    const lensConfig: LensSerializedAPIConfig = {
      title: title ?? lensAttributes.title ?? 'Panel',
      attributes: lensAttributes,
    };

    return {
      type: 'lens',
      grid: { x, y, w, h: layout.defaultPanelHeight },
      config: lensConfig,
      uid,
    };
  }

  if (embeddableType === MARKDOWN_EMBEDDABLE_TYPE) {
    const content = (rawConfig as { content?: string }).content ?? '';
    const h = calculateMarkdownPanelHeight(content, layout);
    const w = layout.markdownPanelWidth;

    let x = currentX;
    let y = currentY;
    if (x + w > layout.dashboardGridColumnCount) {
      x = 0;
      y += layout.defaultPanelHeight;
    }

    return {
      type: MARKDOWN_EMBEDDABLE_TYPE,
      grid: { x, y, w, h },
      config: { content },
      uid,
    };
  }

  // For other embeddable types, try to build a generic panel
  // This is a fallback that may not work for all panel types
  const w = layout.largePanelWidth;
  let x = currentX;
  let y = currentY;
  if (x + w > layout.dashboardGridColumnCount) {
    x = 0;
    y += layout.defaultPanelHeight;
  }

  return {
    type: embeddableType,
    grid: { x, y, w, h: layout.defaultPanelHeight },
    config: rawConfig,
    uid,
  };
};

export interface NormalizePanelsOptions {
  panels: AttachmentPanel[] | undefined;
  yOffset?: number;
  layout?: PanelLayoutConfig;
  includePanelIdAsUid?: boolean;
  getLensPanelWidth?: (lensAttributes: LensAttributes) => number;
}

const normalizePanelsWithLayout = ({
  panels,
  yOffset = 0,
  layout,
  includePanelIdAsUid = false,
  getLensPanelWidth,
}: NormalizePanelsOptions): DashboardPanel[] => {
  const normalizedLayout = layout ?? panelLayout;
  const panelList = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = yOffset;

  for (const panel of panelList) {
    let dashboardPanel: DashboardPanel | null = null;

    if (isLensAttachmentPanel(panel)) {
      const config = panel.visualization as LensApiSchemaType;
      const w = getPanelWidth(config.type, normalizedLayout);

      if (currentX + w > normalizedLayout.dashboardGridColumnCount) {
        currentX = 0;
        currentY += normalizedLayout.defaultPanelHeight;
      }

      dashboardPanel = buildLensPanelFromApi(
        config,
        {
          x: currentX,
          y: currentY,
          w,
          h: normalizedLayout.defaultPanelHeight,
        },
        includePanelIdAsUid ? panel.panelId : undefined
      );
      currentX += w;
    } else if (isGenericAttachmentPanel(panel)) {
      dashboardPanel = buildPanelFromRawConfig({
        embeddableType: panel.type,
        rawConfig: panel.rawConfig,
        title: panel.title,
        position: {
          currentX,
          currentY,
        },
        layout: normalizedLayout,
        uid: includePanelIdAsUid ? panel.panelId : undefined,
        getLensPanelWidth,
      });

      if (dashboardPanel) {
        currentX += dashboardPanel.grid.w;
        if (currentX >= normalizedLayout.dashboardGridColumnCount) {
          currentX = 0;
          currentY += normalizedLayout.defaultPanelHeight;
        }
      }
    }

    if (dashboardPanel) {
      dashboardPanels.push(dashboardPanel);
    }
  }

  return dashboardPanels;
};

export function normalizePanels(
  panels: AttachmentPanel[] | undefined,
  yOffset?: number
): DashboardPanel[];
export function normalizePanels(options: NormalizePanelsOptions): DashboardPanel[];
export function normalizePanels(
  panelsOrOptions: AttachmentPanel[] | NormalizePanelsOptions | undefined,
  yOffset: number = 0
): DashboardPanel[] {
  if (Array.isArray(panelsOrOptions) || panelsOrOptions === undefined) {
    return normalizePanelsWithLayout({
      panels: panelsOrOptions,
      yOffset,
      layout: panelLayout,
      includePanelIdAsUid: true,
      getLensPanelWidth: getLensPanelWidthFromAttributes,
    });
  }

  const {
    panels,
    yOffset: optionsYOffset = 0,
    layout = panelLayout,
    includePanelIdAsUid = false,
    getLensPanelWidth = getLensPanelWidthFromAttributes,
  } = panelsOrOptions;

  return normalizePanelsWithLayout({
    panels,
    yOffset: optionsYOffset,
    layout,
    includePanelIdAsUid,
    getLensPanelWidth,
  });
}
