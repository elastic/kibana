/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/dashboard-plugin/public';
import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import {
  buildMarkdownPanel as buildMarkdownPanelBase,
  getMarkdownPanelHeight as getMarkdownPanelHeightBase,
  normalizePanels as normalizePanelsBase,
  DEFAULT_PANEL_HEIGHT,
  SMALL_PANEL_WIDTH,
  LARGE_PANEL_WIDTH,
  MARKDOWN_PANEL_WIDTH,
  MARKDOWN_MIN_HEIGHT,
  MARKDOWN_MAX_HEIGHT,
  SMALL_CHART_TYPES,
  type PanelLayoutConfig,
} from '../../common';

const panelLayout: PanelLayoutConfig = {
  defaultPanelHeight: DEFAULT_PANEL_HEIGHT,
  smallPanelWidth: SMALL_PANEL_WIDTH,
  largePanelWidth: LARGE_PANEL_WIDTH,
  markdownPanelWidth: MARKDOWN_PANEL_WIDTH,
  markdownMinHeight: MARKDOWN_MIN_HEIGHT,
  markdownMaxHeight: MARKDOWN_MAX_HEIGHT,
  smallChartTypes: SMALL_CHART_TYPES,
  dashboardGridColumnCount: DASHBOARD_GRID_COLUMN_COUNT,
};

/**
 * Builds a markdown panel for dashboard summaries with dynamic height based on content.
 */
export const buildMarkdownPanel = (content: string): DashboardPanel => ({
  ...buildMarkdownPanelBase(content, panelLayout),
});

/**
 * Returns the height of a markdown panel for use in offset calculations.
 */
export const getMarkdownPanelHeight = (content: string): number =>
  getMarkdownPanelHeightBase(content, panelLayout);

/**
 * Normalizes panel configurations to the correct DashboardPanel format.
 * Handles two panel types:
 * - LensAttachmentPanel: Lens panels with visualization config in API format (LensApiSchemaType)
 * - GenericAttachmentPanel: Non-Lens panels with raw config (type is the actual embeddable type)
 *
 * @param panels - Array of panel entries
 * @param yOffset - Optional Y offset for positioning (e.g., when a markdown panel is prepended)
 */
export const normalizePanels = (
  panels: AttachmentPanel[] | undefined,
  yOffset: number = 0
): DashboardPanel[] => {
  return normalizePanelsBase({
    panels,
    yOffset,
    layout: panelLayout,
    includePanelIdAsUid: true,
  });
};
