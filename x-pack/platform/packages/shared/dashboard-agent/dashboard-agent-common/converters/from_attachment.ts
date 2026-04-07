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
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { isLensAPIFormat } from '@kbn/lens-embeddable-utils/config_builder/utils';
import type {
  AttachmentPanel,
  DashboardSection as AgentDashboardSection,
  DashboardAttachment,
} from '../types';
import { isSection } from '../types';

// TODO: update this when LENS_EMBEDDABLE_TYPE is moved to @kbn/lens-common
const LENS_EMBEDDABLE_TYPE = 'lens';

/**
 * Converts an AttachmentPanel to a DashboardPanel.
 * For Lens panels with API format attributes, converts to internal format.
 */
const buildPanelFromConfig = ({ config, type, uid, grid }: AttachmentPanel): DashboardPanel => {
  let configObject = config;
  if (type === LENS_EMBEDDABLE_TYPE && config.attributes && isLensAPIFormat(config.attributes)) {
    const lensAttributes = new LensConfigBuilder().fromAPIFormat(config.attributes);
    configObject = {
      ...config,
      attributes: lensAttributes,
    };
  }
  return {
    type,
    uid,
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
  uid: section.uid,
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

export const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/**
 * Default values for all dashboard state fields except project_routing.
 */
const EMPTY_DASHBOARD_STATE: Readonly<Omit<Required<DashboardState>, 'project_routing'>> =
  Object.freeze({
    title: '',
    description: '',
    panels: [],
    time_range: DEFAULT_TIME_RANGE,
    query: { query: '', language: 'kuery' },
    filters: [],
    options: {
      hide_panel_titles: false,
      hide_panel_borders: false,
      use_margins: true,
      auto_apply_filters: true,
      sync_colors: false,
      sync_cursor: true,
      sync_tooltips: false,
    },
    pinned_panels: [],
    refresh_interval: { pause: true, value: 0 },
    tags: [],
    access_control: {},
  });

/**
 * Converts a DashboardAttachment to a DashboardState.
 * Uses provided values from the attachment, falling back to defaults for missing fields.
 */
export const attachmentToDashboardState = ({
  data: { panels = [], filters, pinned_panels, access_control, options, ...rest },
}: DashboardAttachment): DashboardState => ({
  ...EMPTY_DASHBOARD_STATE,
  ...rest,
  options: {
    ...EMPTY_DASHBOARD_STATE.options,
    ...options,
  },
  panels: normalizeWidgets(panels),
  ...(filters && { filters: filters as DashboardState['filters'] }),
  ...(pinned_panels && { pinned_panels: pinned_panels as DashboardState['pinned_panels'] }),
  ...(access_control && { access_control: access_control as DashboardState['access_control'] }),
});
