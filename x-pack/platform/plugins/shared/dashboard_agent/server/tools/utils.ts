/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { ToolAvailabilityContext, ToolAvailabilityResult } from '@kbn/onechat-server';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '@kbn/dashboard-plugin/common/constants';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

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
  return (panels ?? []).map((panel, index) => {
    return buildLensPanelFromApi(panel as LensApiSchemaType, index);
  });
};

const buildLensPanelFromApi = (config: LensApiSchemaType, index: number): DashboardPanel => {
  const lensAttributes: LensAttributes = new LensConfigBuilder().fromAPIFormat(config);

  const lensConfig: LensSerializedAPIConfig = {
    title: lensAttributes.title ?? config.title ?? 'Generated panel',
    attributes: lensAttributes,
  };

  return {
    type: 'lens',
    grid: createDefaultGrid(index),
    config: lensConfig,
  };
};

const createDefaultGrid = (
  index: number,
  existing?: DashboardPanel['grid']
): DashboardPanel['grid'] => {
  const yOffset = index * DEFAULT_PANEL_HEIGHT;
  return {
    x: existing?.x ?? 0,
    y: existing?.y ?? yOffset,
    w: existing?.w ?? DEFAULT_PANEL_WIDTH,
    h: existing?.h ?? DEFAULT_PANEL_HEIGHT,
  };
};
