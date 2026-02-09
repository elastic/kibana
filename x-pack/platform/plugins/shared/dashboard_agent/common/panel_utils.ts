/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/common/constants';
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

export const getPanelWidth = (chartType: string, layout: PanelLayoutConfig): number => {
  return layout.smallChartTypes.has(chartType) ? layout.smallPanelWidth : layout.largePanelWidth;
};

export const calculateMarkdownPanelHeight = (
  content: string,
  layout: PanelLayoutConfig
): number => {
  const lineCount = content.split('\n').length;
  const estimatedHeight = lineCount + 2;
  return Math.max(layout.markdownMinHeight, Math.min(layout.markdownMaxHeight, estimatedHeight));
};

export const buildMarkdownPanel = (content: string, layout: PanelLayoutConfig): DashboardPanel => ({
  type: MARKDOWN_EMBEDDABLE_TYPE,
  config: { content },
  grid: { x: 0, y: 0, w: layout.markdownPanelWidth, h: calculateMarkdownPanelHeight(content, layout) },
});

export const getMarkdownPanelHeight = (content: string, layout: PanelLayoutConfig): number =>
  calculateMarkdownPanelHeight(content, layout);

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
  const {
    embeddableType,
    rawConfig,
    title,
    position,
    layout,
    uid,
    getLensPanelWidth,
  } = options;
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
  layout: PanelLayoutConfig;
  includePanelIdAsUid?: boolean;
  getLensPanelWidth?: (lensAttributes: LensAttributes) => number;
}

export const normalizePanels = ({
  panels,
  yOffset = 0,
  layout,
  includePanelIdAsUid = false,
  getLensPanelWidth,
}: NormalizePanelsOptions): DashboardPanel[] => {
  const panelList = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = yOffset;

  for (const panel of panelList) {
    let dashboardPanel: DashboardPanel | null = null;

    if (isLensAttachmentPanel(panel)) {
      const config = panel.visualization as LensApiSchemaType;
      const w = getPanelWidth(config.type, layout);

      if (currentX + w > layout.dashboardGridColumnCount) {
        currentX = 0;
        currentY += layout.defaultPanelHeight;
      }

      dashboardPanel = buildLensPanelFromApi(
        config,
        {
          x: currentX,
          y: currentY,
          w,
          h: layout.defaultPanelHeight,
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
        layout,
        uid: includePanelIdAsUid ? panel.panelId : undefined,
        getLensPanelWidth,
      });

      if (dashboardPanel) {
        currentX += dashboardPanel.grid.w;
        if (currentX >= layout.dashboardGridColumnCount) {
          currentX = 0;
          currentY += layout.defaultPanelHeight;
        }
      }
    }

    if (dashboardPanel) {
      dashboardPanels.push(dashboardPanel);
    }
  }

  return dashboardPanels;
};
