/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { DashboardPanel, DashboardSection } from '@kbn/dashboard-plugin/server';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/dashboard-plugin/common/page_bundle_constants';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/common/constants';

import type {
  ToolAvailabilityContext,
  ToolAvailabilityResult,
  ToolResultStore,
} from '@kbn/agent-builder-server';
import { isToolResultId } from '@kbn/agent-builder-server';
import { isVisualizationResult } from '@kbn/agent-builder-common/tools';
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
 * Filters out markdown panels from an array of dashboard panels.
 * Used when replacing the markdown summary during dashboard updates.
 * Note: Dashboard panels array can contain both panels and sections.
 */
export const filterOutMarkdownPanels = (
  panels: (DashboardPanel | DashboardSection)[] | undefined
): (DashboardPanel | DashboardSection)[] =>
  panels?.filter((item) => !('type' in item) || item.type !== MARKDOWN_EMBEDDABLE_TYPE) ?? [];

/**
 * Normalizes panel configurations to the correct DashboardPanel format.
 * This is a temporary function to handle lens API schema conversion.
 * @param panels - Array of panel configurations
 * @param yOffset - Optional Y offset for positioning (e.g., when a markdown panel is prepended)
 */
export const normalizePanels = (
  panels: unknown[] | undefined,
  yOffset: number = 0,
  resultStore?: ToolResultStore
): DashboardPanel[] => {
  const panelConfigs = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = yOffset;

  for (const panel of panelConfigs) {
    const config = resolveLensConfig(panel, resultStore);
    const w = getPanelWidth(config.type);

    // Check if panel fits in current row, if not move to next row
    if (currentX + w > DASHBOARD_GRID_COLUMN_COUNT) {
      currentX = 0;
      currentY += DEFAULT_PANEL_HEIGHT;
    }

    dashboardPanels.push(
      buildLensPanelFromApi(config, { x: currentX, y: currentY, w, h: DEFAULT_PANEL_HEIGHT })
    );

    currentX += w;
  }

  return dashboardPanels;
};

export const resolveLensConfig = (
  panel: unknown,
  resultStore?: ToolResultStore
): LensApiSchemaType => {
  if (typeof panel === 'string') {
    if (!isToolResultId(panel)) {
      throw new Error(
        `Invalid panel reference "${panel}". Expected a tool_result_id from a previous visualization tool call.`
      );
    }
    if (!resultStore || !resultStore.has(panel)) {
      throw new Error(`Panel reference "${panel}" was not found in the tool result store.`);
    }

    const result = resultStore.get(panel);
    if (!isVisualizationResult(result)) {
      throw new Error(
        `Provided tool_result_id "${panel}" is not a visualization result (got "${result.type}").`
      );
    }

    const visualization = result.data.visualization;
    if (!visualization || typeof visualization !== 'object') {
      throw new Error(
        `Visualization result "${panel}" does not contain a valid visualization config.`
      );
    }

    return visualization as LensApiSchemaType;
  }

  if (typeof panel !== 'object' || panel === null || !('type' in panel)) {
    throw new Error(
      `Invalid panel configuration. Expected a Lens API config object with a "type" property.`
    );
  }

  return panel as LensApiSchemaType;
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
