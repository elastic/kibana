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
import { isGenericAttachmentPanel, isLensAttachmentPanel } from '@kbn/dashboard-agent-common';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import type { DashboardPanel, DashboardSection } from '@kbn/dashboard-plugin/server';
import {
  type LensAttributes,
  LensConfigBuilder,
  type LensApiSchemaType,
} from '@kbn/lens-embeddable-utils/config_builder';
import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils/config_builder/utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';

const lensConfigBuilder = new LensConfigBuilder();

const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  uid?: string
): Omit<DashboardPanel, 'grid'> => ({
  type: 'lens',
  config: {
    attributes: lensConfigBuilder.fromAPIFormat(config),
  },
  uid,
});

const isLensEmbeddableType = (
  embeddableType: string,
  rawConfig: unknown
): rawConfig is LensAttributes => {
  return embeddableType === LENS_EMBEDDABLE_TYPE && isLensLegacyAttributes(rawConfig);
};

interface BuildPanelFromRawConfigOptions {
  embeddableType: string;
  rawConfig: Record<string, unknown>;
  title: string | undefined;
  uid?: string;
}

const buildPanelFromRawConfig = ({
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
          attributes: lensConfigBuilder.toAPIFormat(rawConfig),
        }
      : rawConfig,
    uid,
  };
};

const normalizePanels = (panels: AttachmentPanel[]): DashboardPanel[] => {
  const panelList = panels ?? [];

  return panelList.reduce<DashboardPanel[]>((acc, panel) => {
    if (isLensAttachmentPanel(panel)) {
      acc.push({
        ...buildLensPanelFromApi(panel.visualization as LensApiSchemaType, panel.panelId),
        grid: panel.grid,
      });
    } else if (isGenericAttachmentPanel(panel)) {
      acc.push({
        ...buildPanelFromRawConfig({
          embeddableType: panel.type,
          rawConfig: panel.rawConfig,
          title: panel.title,
          uid: panel.panelId,
        }),
        grid: panel.grid,
      });
    }
    return acc;
  }, []);
};

const normalizeSections = (sections: AgentDashboardSection[]): DashboardSection[] => {
  return (sections ?? []).map((section) => ({
    uid: section.sectionId,
    title: section.title,
    collapsed: section.collapsed,
    grid: {
      y: section.grid.y,
    },
    panels: normalizePanels(section.panels),
  }));
};

const normalizeDashboardWidgets = ({
  panels,
  sections,
}: {
  panels: AttachmentPanel[];
  sections?: AgentDashboardSection[];
}): DashboardState['panels'] => {
  return [...normalizePanels(panels), ...normalizeSections(sections ?? [])];
};

export const DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' };

// We want to override all possible fields except for project_routing.
const getEmptyDashboardState = (): Omit<Required<DashboardState>, 'project_routing'> => ({
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

export const getStateFromAttachment = (attachment: DashboardAttachment): DashboardState => {
  const { title, description, panels = [], sections = [] } = attachment.data;

  return {
    ...getEmptyDashboardState(),
    title: title ?? '',
    description: description ?? '',
    panels: normalizeDashboardWidgets({
      panels,
      sections,
    }),
    time_range: DEFAULT_TIME_RANGE,
  };
};
