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

const PANEL_LAYOUT = {
  defaultPanelHeight: DEFAULT_PANEL_HEIGHT,
  smallPanelWidth: SMALL_PANEL_WIDTH,
  largePanelWidth: LARGE_PANEL_WIDTH,
  markdownPanelWidth: MARKDOWN_PANEL_WIDTH,
  markdownMinHeight: MARKDOWN_MIN_HEIGHT,
  markdownMaxHeight: MARKDOWN_MAX_HEIGHT,
  smallChartTypes: SMALL_CHART_TYPES,
  dashboardGridColumnCount: DASHBOARD_GRID_COLUMN_COUNT,
};

const calculatePanelHeight = (
  rawConfig: Record<string, unknown>,
  embeddableType: string,
  preferredGrid?: { w: number; h: number }
): number => {
  if (preferredGrid?.h) {
    return preferredGrid.h;
  }
  if (embeddableType === MARKDOWN_EMBEDDABLE_TYPE) {
    const content = (rawConfig as { content?: string }).content ?? '';
    const lineCount = content.split('\n').length;
    const estimatedHeight = lineCount + 2;
    return Math.max(
      PANEL_LAYOUT.markdownMinHeight,
      Math.min(PANEL_LAYOUT.markdownMaxHeight, estimatedHeight)
    );
  }
  return PANEL_LAYOUT.defaultPanelHeight;
};

const calculatePanelWidth = (
  rawConfig: Record<string, unknown>,
  embeddableType: string,
  preferredGrid?: { w: number; h: number }
): number => {
  if (preferredGrid?.w) {
    return preferredGrid.w;
  }
  if (isLensEmbeddableType(embeddableType, rawConfig)) {
    return PANEL_LAYOUT.smallChartTypes.has(rawConfig.visualizationType)
      ? PANEL_LAYOUT.smallPanelWidth
      : PANEL_LAYOUT.largePanelWidth;
  }
  if (embeddableType === MARKDOWN_EMBEDDABLE_TYPE) {
    return PANEL_LAYOUT.markdownPanelWidth;
  }
  return PANEL_LAYOUT.largePanelWidth;
};

export const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  uid?: string
): Omit<DashboardPanel, 'grid'> => {
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
  uid?: string;
}

export const buildPanelFromRawConfig = ({
  embeddableType,
  rawConfig,
  title,
  uid,
}: BuildPanelFromRawConfigOptions): Omit<DashboardPanel, 'grid'> => {
  return {
    type: embeddableType,
    config: isLensEmbeddableType(embeddableType, rawConfig)
      ? {
          title: title ?? rawConfig.title ?? 'Panel',
          attributes: rawConfig,
        }
      : rawConfig,
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
    let dashboardPanel: Omit<DashboardPanel, 'grid'> | null = null;

    if (isLensAttachmentPanel(panel)) {
      const config = panel.visualization as LensApiSchemaType;
      dashboardPanel = buildLensPanelFromApi(config, panel.panelId);
    } else if (isGenericAttachmentPanel(panel)) {
      dashboardPanel = buildPanelFromRawConfig({
        embeddableType: panel.type,
        rawConfig: panel.rawConfig,
        title: panel.title,
        uid: panel.panelId,
      });
    }

    if (dashboardPanel) {
      const height = calculatePanelHeight(dashboardPanel.config, panel.type, panel.grid);
      const width = calculatePanelWidth(dashboardPanel.config, panel.type, panel.grid);

      if (currentX + width > PANEL_LAYOUT.dashboardGridColumnCount) {
        currentX = 0;
        currentY += rowMaxHeight;
        rowMaxHeight = 0;
      }
      dashboardPanels.push({
        ...dashboardPanel,
        grid: { x: currentX, y: currentY, w: width, h: height },
      });
      rowMaxHeight = Math.max(rowMaxHeight, height);
      currentX += width;
    }
  }
  return dashboardPanels;
};
