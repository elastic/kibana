/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DashboardAttachmentData,
  AttachmentPanel,
  DashboardSection,
} from '@kbn/dashboard-agent-common';
import type { DashboardPanel, DashboardState } from '@kbn/dashboard-plugin/server';
import { type LensAttributes, LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils/config_builder/utils';

const lensConfigBuilder = new LensConfigBuilder();

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const normalizePanelGrid = (grid?: { w?: number; h?: number; x?: number; y?: number }) => {
  const w = Math.round(grid?.w ?? 24);
  const h = Math.round(grid?.h ?? 8);
  const x = Math.round(grid?.x ?? 0);
  const y = Math.max(0, Math.round(grid?.y ?? 0));

  return {
    w: clamp(w, 1, 48),
    h: clamp(h, 1, 24),
    x: clamp(x, 0, 47),
    y,
  };
};

const toAttachmentPanel = (panel: DashboardPanel): AttachmentPanel => {
  if (
    panel.type === 'lens' &&
    panel.config &&
    typeof panel.config === 'object' &&
    'attributes' in panel.config
  ) {
    const lensConfig = panel.config as { attributes: LensAttributes; title?: string };
    if (isLensLegacyAttributes(lensConfig.attributes)) {
      return {
        type: 'lens',
        panelId: panel.uid ?? '',
        visualization: lensConfigBuilder.toAPIFormat(lensConfig.attributes),
        title: typeof lensConfig.title === 'string' ? lensConfig.title : undefined,
        grid: normalizePanelGrid(panel.grid),
      };
    }
  }

  return {
    type: panel.type,
    panelId: panel.uid ?? '',
    rawConfig: (panel.config ?? {}) as Record<string, unknown>,
    title:
      panel.config && typeof panel.config === 'object' && 'title' in panel.config
        ? ((panel.config as { title?: unknown }).title as string | undefined)
        : undefined,
    grid: normalizePanelGrid(panel.grid),
  };
};

export const toDashboardAttachmentData = (
  state: DashboardState,
  savedObjectId?: string
): DashboardAttachmentData => {
  const topLevelPanels: AttachmentPanel[] = [];
  const sections: DashboardSection[] = [];

  for (const item of state.panels ?? []) {
    if ('panels' in item) {
      sections.push({
        sectionId: item.uid ?? '',
        title: item.title,
        collapsed: item.collapsed ?? false,
        grid: { y: item.grid.y },
        panels: item.panels.map(toAttachmentPanel),
      });
    } else {
      topLevelPanels.push(toAttachmentPanel(item));
    }
  }

  return {
    title: state.title ?? '',
    description: state.description ?? '',
    ...(savedObjectId ? { savedObjectId } : {}),
    panels: topLevelPanels,
    ...(sections.length ? { sections } : {}),
  };
};
