/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardSection as AgentDashboardSection,
} from '@kbn/dashboard-agent-common';
import { isSection } from '@kbn/dashboard-agent-common';
import { type DashboardState } from '@kbn/dashboard-plugin/common';
import type { DashboardPanel, DashboardSection } from '@kbn/dashboard-plugin/server';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { isLensAPIFormat } from '@kbn/lens-embeddable-utils/config_builder/utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';

const lensConfigBuilder = new LensConfigBuilder();

const buildPanelFromConfig = ({ config, type, uid, grid }: AttachmentPanel): DashboardPanel => {
  let configObject = config;
  if (type === LENS_EMBEDDABLE_TYPE && config.attributes && isLensAPIFormat(config.attributes)) {
    const lensAttributes = lensConfigBuilder.fromAPIFormat(config.attributes);
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

const normalizeSection = (section: AgentDashboardSection): DashboardSection => ({
  uid: section.uid, // id generation should never happen
  title: section.title,
  collapsed: section.collapsed,
  grid: { y: section.grid.y },
  panels: section.panels.map(buildPanelFromConfig),
});

const normalizeWidgets = (widgets: AgentWidget[]): DashboardWidget[] =>
  (widgets ?? []).map((widget) =>
    isSection(widget) ? normalizeSection(widget) : buildPanelFromConfig(widget)
  );

export const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

// Default values for all dashboard state fields except project_routing.
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

export const getStateFromAttachment = ({
  data: { title, description, panels = [] },
}: DashboardAttachment): DashboardState => ({
  ...EMPTY_DASHBOARD_STATE,
  title,
  description,
  panels: normalizeWidgets(panels),
});
