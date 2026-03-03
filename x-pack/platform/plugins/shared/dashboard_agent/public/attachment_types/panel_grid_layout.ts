/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import { isGenericAttachmentPanel, isLensAttachmentPanel } from '@kbn/dashboard-agent-common';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/public';
import { i18n } from '@kbn/i18n';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';
import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils/config_builder/utils';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';

const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 9;
const SMALL_PANEL_WIDTH = 12;
const LARGE_PANEL_WIDTH = 24;
const MARKDOWN_PANEL_WIDTH = 48;
const MARKDOWN_MIN_HEIGHT = 6;
const MARKDOWN_MAX_HEIGHT = 9;
const SMALL_CHART_TYPES = new Set(['metric', 'legacy_metric', 'gauge']);

export const PANEL_LAYOUT = {
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

export const getPanelWidth = (chartType: string, layout = PANEL_LAYOUT): number => {
  return layout.smallChartTypes.has(chartType) ? layout.smallPanelWidth : layout.largePanelWidth;
};

export const calculateMarkdownPanelHeight = (content: string, layout = PANEL_LAYOUT): number => {
  const lineCount = content.split('\n').length;
  const estimatedHeight = lineCount + 2;
  return Math.max(layout.markdownMinHeight, Math.min(layout.markdownMaxHeight, estimatedHeight));
};

export const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  grid: DashboardPanel['grid'],
  uid?: string
): DashboardPanel => {
  const lensAttributes: LensAttributes = new LensConfigBuilder().fromAPIFormat(config);

  const lensConfig: LensSerializedAPIConfig = {
    title:
      lensAttributes.title ??
      config.title ??
      i18n.translate('xpack.dashboardAgent.attachments.dashboard.generatedPanelTitle', {
        defaultMessage: 'Generated panel',
      }),
    attributes: lensAttributes,
  };

  return {
    type: 'lens',
    grid,
    config: lensConfig,
    uid,
  };
};

export const isLensEmbeddableType = (
  embeddableType: string,
  rawConfig: unknown
): rawConfig is LensAttributes => {
  return embeddableType === LENS_EMBEDDABLE_TYPE && isLensLegacyAttributes(rawConfig);
};

export interface BuildPanelFromRawConfigOptions {
  embeddableType: string;
  rawConfig: Record<string, unknown>;
  title: string | undefined;
  position: { currentX: number; currentY: number };
  uid?: string;
  /** When set (e.g. from agent-specified layout), use these dimensions instead of layout defaults. */
  preferredGrid?: { w: number; h: number };
}

export const buildPanelFromRawConfig = ({
  embeddableType,
  rawConfig,
  title,
  position,
  uid,
  preferredGrid,
}: BuildPanelFromRawConfigOptions): DashboardPanel | null => {
  const { currentX, currentY } = position;

  if (isLensEmbeddableType(embeddableType, rawConfig)) {
    const lensAttributes = rawConfig;
    const width =
      preferredGrid?.w ??
      (getLensPanelWidthFromAttributes
        ? getLensPanelWidthFromAttributes(lensAttributes)
        : PANEL_LAYOUT.largePanelWidth);
    const height = preferredGrid?.h ?? PANEL_LAYOUT.defaultPanelHeight;

    let x = currentX;
    let y = currentY;
    if (x + width > PANEL_LAYOUT.dashboardGridColumnCount) {
      x = 0;
      y += PANEL_LAYOUT.defaultPanelHeight;
    }

    const lensConfig: LensSerializedAPIConfig = {
      title: title ?? lensAttributes.title ?? 'Panel',
      attributes: lensAttributes,
    };

    return {
      type: 'lens',
      grid: { x, y, w: width, h: height },
      config: lensConfig,
      uid,
    };
  }

  if (embeddableType === MARKDOWN_EMBEDDABLE_TYPE) {
    const content = (rawConfig as { content?: string }).content ?? '';
    const height = preferredGrid?.h ?? calculateMarkdownPanelHeight(content, PANEL_LAYOUT);
    const width = preferredGrid?.w ?? PANEL_LAYOUT.markdownPanelWidth;

    let x = currentX;
    let y = currentY;
    if (x + width > PANEL_LAYOUT.dashboardGridColumnCount) {
      x = 0;
      y += PANEL_LAYOUT.defaultPanelHeight;
    }

    return {
      type: MARKDOWN_EMBEDDABLE_TYPE,
      grid: { x, y, w: width, h: height },
      config: { content },
      uid,
    };
  }

  const width = preferredGrid?.w ?? PANEL_LAYOUT.largePanelWidth;
  const panelHeight = preferredGrid?.h ?? PANEL_LAYOUT.defaultPanelHeight;
  let x = currentX;
  let y = currentY;
  if (x + width > PANEL_LAYOUT.dashboardGridColumnCount) {
    x = 0;
    y += PANEL_LAYOUT.defaultPanelHeight;
  }

  return {
    type: embeddableType,
    grid: { x, y, w: width, h: panelHeight },
    config: rawConfig,
    uid,
  };
};

export const normalizePanels = (panels: AttachmentPanel[]): DashboardPanel[] => {
  const panelList = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = 0;
  let rowMaxHeight = 0;

  for (const panel of panelList) {
    let dashboardPanel: DashboardPanel | null = null;

    if (isLensAttachmentPanel(panel)) {
      const config = panel.visualization as LensApiSchemaType;
      const width = panel.grid?.w ?? getPanelWidth(config.type);
      const height = panel.grid?.h ?? PANEL_LAYOUT.defaultPanelHeight;

      if (currentX + width > PANEL_LAYOUT.dashboardGridColumnCount) {
        currentX = 0;
        currentY += rowMaxHeight;
        rowMaxHeight = 0;
      }
      rowMaxHeight = Math.max(rowMaxHeight, height);

      dashboardPanel = buildLensPanelFromApi(
        config,
        {
          x: currentX,
          y: currentY,
          w: width,
          h: height,
        },
        panel.panelId
      );
      currentX += width;
    } else if (isGenericAttachmentPanel(panel)) {
      dashboardPanel = buildPanelFromRawConfig({
        embeddableType: panel.type,
        rawConfig: panel.rawConfig,
        title: panel.title,
        position: {
          currentX,
          currentY,
        },
        uid: panel.panelId,
        preferredGrid: panel.grid,
      });

      if (dashboardPanel) {
        currentX += dashboardPanel.grid.w;
        rowMaxHeight = Math.max(rowMaxHeight, dashboardPanel.grid.h);
        if (currentX >= PANEL_LAYOUT.dashboardGridColumnCount) {
          currentX = 0;
          currentY += rowMaxHeight;
          rowMaxHeight = 0;
        }
      }
    }

    if (dashboardPanel) {
      dashboardPanels.push(dashboardPanel);
    }
  }

  return dashboardPanels;
};
