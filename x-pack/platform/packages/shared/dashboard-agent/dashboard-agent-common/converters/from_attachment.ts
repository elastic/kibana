/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DashboardPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/dashboard-plugin/server';
import { isLensAPIFormat, LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type {
  AttachmentPanel,
  DashboardSection as AgentDashboardSection,
  DashboardAttachmentData,
} from '../types';
import { isSection } from '../types';
import { EMPTY_DASHBOARD_STATE } from '../dashboard_state_helpers';

/**
 * Converts an AttachmentPanel to a DashboardPanel.
 * For Lens panels with API format attributes, converts to internal format.
 */
const buildPanelFromConfig = ({ config, type, id, grid }: AttachmentPanel): DashboardPanel => {
  let configObject = config;
  if (type === LENS_EMBEDDABLE_TYPE && isLensAPIFormat(config)) {
    const lensAttributes = new LensConfigBuilder().fromAPIFormat(config);
    configObject = {
      ...config,
      attributes: lensAttributes,
    };
  }
  return {
    type,
    id,
    grid,
    config: configObject,
  };
};

type AgentWidget = AttachmentPanel | AgentDashboardSection;
type DashboardWidget = DashboardPanel | DashboardSection;

/**
 * Converts an AgentDashboardSection to a DashboardSection.
 */
const normalizeSection = (section: AgentDashboardSection): DashboardSection => ({
  id: section.id,
  title: section.title,
  collapsed: section.collapsed,
  grid: { y: section.grid.y },
  panels: section.panels.map(buildPanelFromConfig),
});

/**
 * Converts an array of attachment widgets to dashboard widgets.
 */
const normalizeWidgets = (widgets: AgentWidget[]): DashboardWidget[] =>
  (widgets ?? []).map((widget) =>
    isSection(widget) ? normalizeSection(widget) : buildPanelFromConfig(widget)
  );

/**
 * Converts a DashboardAttachment to a DashboardState.
 * Uses provided values from the attachment, falling back to defaults for missing fields.
 */
export const attachmentDataToDashboardState = ({
  panels = [],
  filters,
  query,
  pinned_panels,
  access_control,
  options,
  ...rest
}: DashboardAttachmentData): DashboardState => ({
  ...EMPTY_DASHBOARD_STATE,
  ...rest,
  options: {
    ...EMPTY_DASHBOARD_STATE.options,
    ...options,
  },
  panels: normalizeWidgets(panels),
  ...(filters && { filters: filters as DashboardState['filters'] }),
  ...(query && { query: query as DashboardState['query'] }),
  ...(pinned_panels && { pinned_panels: pinned_panels as DashboardState['pinned_panels'] }),
  ...(access_control && { access_control: access_control as DashboardState['access_control'] }),
});
