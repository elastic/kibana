/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { ToolAvailabilityContext, ToolAvailabilityResult } from '@kbn/onechat-server';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/dashboard-plugin/common/page_bundle_constants';

// Default panel sizes based on visualization type
const DEFAULT_PANEL_HEIGHT = 9;
const SMALL_PANEL_WIDTH = 12; // Metrics & small charts (4 per row)
const LARGE_PANEL_WIDTH = 24; // XY & other charts (2 per row)

const SMALL_CHART_TYPES = new Set(['metric', 'legacy_metric', 'gauge']);

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
 * Normalizes panel configurations to the correct DashboardPanel format.
 * This is a temporary function to handle lens API schema conversion.
 */
export const normalizePanels = (panels: unknown[] | undefined): DashboardPanel[] => {
  const panelConfigs = panels ?? [];
  const dashboardPanels: DashboardPanel[] = [];
  let currentX = 0;
  let currentY = 0;

  for (const panel of panelConfigs) {
    const config = panel as LensApiSchemaType;
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
