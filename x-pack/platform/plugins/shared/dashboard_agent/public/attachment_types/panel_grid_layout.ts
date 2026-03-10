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
import { i18n } from '@kbn/i18n';
import {
  LensConfigBuilder,
  type LensApiSchemaType,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils/config_builder';
import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils/config_builder/utils';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';

export const buildLensPanelFromApi = (
  config: LensApiSchemaType,
  uid?: string
): Omit<DashboardPanel, 'grid'> => {
  const lensAttributes: LensAttributes = new LensConfigBuilder().fromAPIFormat(config);

  const lensConfig: LensSerializedAPIConfig = {
    title:
      lensAttributes.title ??
      config.title ??
      i18n.translate('xpack.dashboardAgent.attachments.dashboard.generatedPanelTitle', {
        defaultMessage: 'Generated panel',
      }),
    attributes: lensAttributes,
  };

  return {
    type: 'lens',
    config: lensConfig,
    uid,
  };
};

export const isLensEmbeddableType = (
  embeddableType: string,
  rawConfig: unknown
): rawConfig is LensAttributes => {
  return embeddableType === LENS_EMBEDDABLE_TYPE && isLensLegacyAttributes(rawConfig);
};

export interface BuildPanelFromRawConfigOptions {
  embeddableType: string;
  rawConfig: Record<string, unknown>;
  title: string | undefined;
  uid?: string;
}

export const buildPanelFromRawConfig = ({
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
          attributes: rawConfig,
        }
      : rawConfig,
    uid,
  };
};

export const normalizePanels = (panels: AttachmentPanel[]): DashboardPanel[] => {
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

export const normalizeDashboardWidgets = ({
  panels,
  sections,
}: {
  panels: AttachmentPanel[];
  sections?: AgentDashboardSection[];
}): DashboardState['panels'] => {
  return [...normalizePanels(panels), ...normalizeSections(sections ?? [])];
};
