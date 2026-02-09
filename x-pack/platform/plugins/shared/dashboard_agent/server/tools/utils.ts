/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { LensApiSchemaType, LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/dashboard-plugin/common/page_bundle_constants';

import type { ToolAvailabilityContext, ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import {
  buildMarkdownPanel as buildMarkdownPanelBase,
  getMarkdownPanelHeight as getMarkdownPanelHeightBase,
  normalizePanels as normalizePanelsBase,
  type PanelLayoutConfig,
  DEFAULT_PANEL_HEIGHT,
  SMALL_PANEL_WIDTH,
  LARGE_PANEL_WIDTH,
  MARKDOWN_PANEL_WIDTH,
  MARKDOWN_MIN_HEIGHT,
  MARKDOWN_MAX_HEIGHT,
  SMALL_CHART_TYPES,
} from '../../common';

/**
 * Shared availability handler for all dashboard tools.
 * Checks if dashboard tools are enabled via UI settings.
 */
export const checkDashboardToolsAvailability = async ({
  uiSettings,
}: ToolAvailabilityContext): Promise<ToolAvailabilityResult> => {
  const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID);
  return { status: enabled ? 'available' : 'unavailable' };
};

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

const getLensPanelWidthFromAttributes = (lensAttributes: LensAttributes): number => {
  const visType = lensAttributes.visualizationType;
  const isSmallChart =
    visType === 'lnsMetric' || visType === 'lnsLegacyMetric' || visType === 'lnsGauge';
  return isSmallChart ? SMALL_PANEL_WIDTH : LARGE_PANEL_WIDTH;
};

/**
 * Calculates panel dimensions based on chart type.
 * Matches the logic in panel_utils.ts normalizePanels function.
 */
export const getPanelDimensions = (chartType: string): { width: number; height: number } => {
  return {
    width: SMALL_CHART_TYPES.has(chartType) ? SMALL_PANEL_WIDTH : LARGE_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
  };
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
    getLensPanelWidth: getLensPanelWidthFromAttributes,
  });
};

/**
 * Resolves a Lens configuration from a visualization attachment.
 * Always uses the latest version of the attachment.
 * @param attachmentId - The visualization attachment ID
 * @param attachments - The attachment state manager
 */
export const resolveLensConfigFromAttachment = (
  attachmentId: string,
  attachments: AttachmentStateManager
): LensApiSchemaType => {
  const latestVersion = attachments.getLatest(attachmentId);

  if (!latestVersion) {
    throw new Error(
      `Visualization attachment "${attachmentId}" was not found. Make sure you're using an attachment_id from a previous create_visualizations call.`
    );
  }

  const attachment = attachments.get(attachmentId);
  // TODO: Use const -  VISUALIZATION_ATTACHMENT_TYPE
  if (!attachment || attachment.type !== 'visualization') {
    throw new Error(
      `Attachment "${attachmentId}" is not a visualization attachment (got "${attachment?.type}").`
    );
  }

  // TODO: Fix types
  const data = latestVersion.data;
  const visualization = (data as { visualization?: unknown }).visualization;

  if (!visualization || typeof visualization !== 'object') {
    throw new Error(
      `Visualization attachment "${attachmentId}" does not contain a valid visualization config.`
    );
  }

  return visualization as LensApiSchemaType;
};


/**
 * Filters out visualization IDs from an array.
 * Used by manage_dashboard to remove visualizations before rebuilding the dashboard.
 */
export const filterVisualizationIds = (
  visualizationIds: string[],
  idsToRemove: string[]
): string[] => {
  const removeSet = new Set(idsToRemove);
  return visualizationIds.filter((id) => !removeSet.has(id));
};
