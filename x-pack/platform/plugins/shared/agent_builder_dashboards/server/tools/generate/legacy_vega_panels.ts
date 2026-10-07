/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { toVegaPanelSpec, VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';

const normalizeVegaPanel = (panel: AttachmentPanel): AttachmentPanel => {
  const { spec } = panel.config as { spec?: unknown };
  return panel.type === VEGA_VIS_TYPE && typeof spec === 'string'
    ? { ...panel, config: { ...panel.config, spec: toVegaPanelSpec(spec) } }
    : panel;
};

/**
 * Upgrades Vega panels that older dashboard attachments stored with a bare string `spec` to the
 * native `{ format: 'hjson', value }` shape. Other panels are returned unchanged.
 */
export const normalizeLegacyVegaPanels = (
  dashboardData: DashboardAttachmentData
): DashboardAttachmentData => ({
  ...dashboardData,
  panels: dashboardData.panels.map((widget) =>
    isSection(widget)
      ? { ...widget, panels: widget.panels.map(normalizeVegaPanel) }
      : normalizeVegaPanel(widget)
  ),
});
