/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/dashboard-plugin/common/page_bundle_constants';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/common/constants';

import type { ToolAvailabilityContext, ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  AttachmentType,
  type VisualizationAttachmentData,
} from '@kbn/agent-builder-common/attachments';
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
} from './constants';

const getPanelWidth = (chartType: string): number => {
  return SMALL_CHART_TYPES.has(chartType) ? SMALL_PANEL_WIDTH : LARGE_PANEL_WIDTH;
};

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

/**
 * Calculates the height of a markdown panel based on content length.
 */
const calculateMarkdownPanelHeight = (content: string): number => {
  const lineCount = content.split('\n').length;
  const estimatedHeight = lineCount + 2;
  return Math.max(MARKDOWN_MIN_HEIGHT, Math.min(MARKDOWN_MAX_HEIGHT, estimatedHeight));
};

/**
 * Builds a markdown panel for dashboard summaries with dynamic height based on content.
 */
export const buildMarkdownPanel = (content: string): DashboardPanel => ({
  type: MARKDOWN_EMBEDDABLE_TYPE,
  config: { content },
  grid: { x: 0, y: 0, w: MARKDOWN_PANEL_WIDTH, h: calculateMarkdownPanelHeight(content) },
});

/**
 * Returns the height of a markdown panel for use in offset calculations.
 */
export const getMarkdownPanelHeight = (content: string): number =>
  calculateMarkdownPanelHeight(content);

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
  const panelList = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = yOffset;

  for (const panel of panelList) {
    let dashboardPanel: DashboardPanel | null = null;

    if (isLensAttachmentPanel(panel)) {
      // Lens panel: convert from API format to LensAttributes
      const config = panel.visualization as LensApiSchemaType;
      const w = getPanelWidth(config.type);

      if (currentX + w > DASHBOARD_GRID_COLUMN_COUNT) {
        currentX = 0;
        currentY += DEFAULT_PANEL_HEIGHT;
      }

      dashboardPanel = buildLensPanelFromApi(config, {
        x: currentX,
        y: currentY,
        w,
        h: DEFAULT_PANEL_HEIGHT,
      });
      currentX += w;
    } else if (isGenericAttachmentPanel(panel)) {
      // Generic panel: build from raw configuration (type is the actual embeddable type)
      dashboardPanel = buildPanelFromRawConfig(panel.type, panel.rawConfig, panel.title, {
        currentX,
        currentY,
      });

      if (dashboardPanel) {
        currentX += dashboardPanel.grid.w;
        if (currentX >= DASHBOARD_GRID_COLUMN_COUNT) {
          currentX = 0;
          currentY += DEFAULT_PANEL_HEIGHT;
        }
      }
    }

    if (dashboardPanel) {
      dashboardPanels.push(dashboardPanel);
    }
  }

  return dashboardPanels;
};

/**
 * Builds a dashboard panel from raw configuration.
 * Handles different embeddable types (lens, markdown, etc.)
 */
const buildPanelFromRawConfig = (
  embeddableType: string,
  rawConfig: Record<string, unknown>,
  title: string | undefined,
  position: { currentX: number; currentY: number }
): DashboardPanel | null => {
  const { currentX, currentY } = position;

  if (embeddableType === 'lens') {
    // For Lens panels, rawConfig is LensAttributes
    const lensAttributes = rawConfig as LensAttributes;

    // Determine panel width based on visualization type
    const visType = lensAttributes.visualizationType;
    const isSmallChart =
      visType === 'lnsMetric' || visType === 'lnsLegacyMetric' || visType === 'lnsGauge';
    const w = isSmallChart ? SMALL_PANEL_WIDTH : LARGE_PANEL_WIDTH;

    // Check if panel fits in current row
    let x = currentX;
    let y = currentY;
    if (x + w > DASHBOARD_GRID_COLUMN_COUNT) {
      x = 0;
      y += DEFAULT_PANEL_HEIGHT;
    }

    const lensConfig: LensSerializedAPIConfig = {
      title: title ?? lensAttributes.title ?? 'Panel',
      attributes: lensAttributes,
    };

    return {
      type: 'lens',
      grid: { x, y, w, h: DEFAULT_PANEL_HEIGHT },
      config: lensConfig,
    };
  } else if (embeddableType === MARKDOWN_EMBEDDABLE_TYPE) {
    // For markdown panels
    const content = (rawConfig as { content?: string }).content ?? '';
    const h = Math.max(
      MARKDOWN_MIN_HEIGHT,
      Math.min(MARKDOWN_MAX_HEIGHT, content.split('\n').length + 2)
    );
    const w = MARKDOWN_PANEL_WIDTH;

    let x = currentX;
    let y = currentY;
    if (x + w > DASHBOARD_GRID_COLUMN_COUNT) {
      x = 0;
      y += DEFAULT_PANEL_HEIGHT;
    }

    return {
      type: MARKDOWN_EMBEDDABLE_TYPE,
      grid: { x, y, w, h },
      config: { content },
    };
  }

  // For other embeddable types, try to build a generic panel
  // This is a fallback that may not work for all panel types
  const w = LARGE_PANEL_WIDTH;
  let x = currentX;
  let y = currentY;
  if (x + w > DASHBOARD_GRID_COLUMN_COUNT) {
    x = 0;
    y += DEFAULT_PANEL_HEIGHT;
  }

  return {
    type: embeddableType,
    grid: { x, y, w, h: DEFAULT_PANEL_HEIGHT },
    config: rawConfig,
  };
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
  if (!attachment || attachment.type !== AttachmentType.visualization) {
    throw new Error(
      `Attachment "${attachmentId}" is not a visualization attachment (got "${attachment?.type}").`
    );
  }

  const data = latestVersion.data as VisualizationAttachmentData;
  const visualization = data.visualization;

  if (!visualization || typeof visualization !== 'object') {
    throw new Error(
      `Visualization attachment "${attachmentId}" does not contain a valid visualization config.`
    );
  }

  return visualization as LensApiSchemaType;
};

const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  grid: DashboardPanel['grid']
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
  };
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
