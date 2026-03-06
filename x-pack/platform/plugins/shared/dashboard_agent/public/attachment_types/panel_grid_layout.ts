/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import { isGenericAttachmentPanel, isLensAttachmentPanel } from '@kbn/dashboard-agent-common';
import type {
  DashboardPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/dashboard-plugin/server';
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

const COLUMNS = 48;
const DEFAULT_W = 24;
const DEFAULT_H = 9;
const PANELS_PER_ROW = Math.floor(COLUMNS / DEFAULT_W);

const resolveFallbackGrid = (index: number): DashboardPanel['grid'] => ({
  x: (index % PANELS_PER_ROW) * DEFAULT_W,
  y: Math.floor(index / PANELS_PER_ROW) * DEFAULT_H,
  w: DEFAULT_W,
  h: DEFAULT_H,
});

const resolveGrid = (grid: AttachmentPanel['grid'], index: number): DashboardPanel['grid'] => {
  if (!grid) {
    return resolveFallbackGrid(index);
  }
  return { x: grid.x ?? 0, y: grid.y ?? 0, w: grid.w, h: grid.h };
};

export const normalizePanels = (panels: AttachmentPanel[]): DashboardPanel[] => {
  const panelList = panels ?? [];

  return panelList.reduce<DashboardPanel[]>((acc, panel, index) => {
    if (isLensAttachmentPanel(panel)) {
      acc.push({
        ...buildLensPanelFromApi(panel.visualization as LensApiSchemaType, panel.panelId),
        grid: resolveGrid(panel.grid, index),
      });
    } else if (isGenericAttachmentPanel(panel)) {
      acc.push({
        ...buildPanelFromRawConfig({
          embeddableType: panel.type,
          rawConfig: panel.rawConfig,
          title: panel.title,
          uid: panel.panelId,
        }),
        grid: resolveGrid(panel.grid, index),
      });
    }
    return acc;
  }, []);
};

/**
 * Computes the next available y coordinate after a set of panels.
 * Returns 0 if the panel list is empty.
 */
const getMaxY = (panels: DashboardPanel[]): number => {
  let maxY = 0;
  for (const panel of panels) {
    const bottom = panel.grid.y + panel.grid.h;
    if (bottom > maxY) {
      maxY = bottom;
    }
  }
  return maxY;
};

/**
 * Normalizes a full DashboardAttachmentData (top-level panels + sections)
 * into the flat array format that DashboardRenderer expects via DashboardState['panels'].
 * Each section occupies exactly 1 row in the outer grid.
 */
export const normalizeDashboardState = (
  data: DashboardAttachmentData
): DashboardState['panels'] => {
  const topLevelPanels = normalizePanels(data.panels ?? []);
  const sections = data.sections ?? [];

  if (sections.length === 0) {
    return topLevelPanels;
  }

  const result: Array<DashboardPanel | DashboardSection> = [...topLevelPanels];
  let nextY = getMaxY(topLevelPanels);

  for (const section of sections) {
    const sectionPanels = normalizePanels(section.panels);
    const sectionY = section.grid?.y ?? nextY;
    const dashboardSection: DashboardSection = {
      title: section.title,
      collapsed: section.collapsed,
      grid: { y: sectionY },
      uid: section.sectionId,
      panels: sectionPanels,
    };
    result.push(dashboardSection);
    nextY = sectionY + 1;
  }

  return result;
};
