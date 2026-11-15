/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  getPanelLabel,
  isSection,
  type DashboardAttachmentData,
  type DashboardPanelAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

export interface PanelPointer {
  id: string;
  data: DashboardPanelAttachmentData;
}

const getPanels = ({ panels }: DashboardAttachmentData) =>
  panels.flatMap((widget) => (isSection(widget) ? widget.panels : [widget]));

/** The ids of the dashboard's panels, including the ones inside sections. */
export const getPanelIds = (dashboardData: DashboardAttachmentData): string[] =>
  getPanels(dashboardData).map(({ id }) => id);

const getPanelLabels = (dashboardData: DashboardAttachmentData): Map<string, string> => {
  const labelByPanelId = new Map<string, string>();
  for (const panel of getPanels(dashboardData)) {
    const label = getPanelLabel(panel);
    if (label) {
      labelByPanelId.set(panel.id, label.slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH));
    }
  }
  return labelByPanelId;
};

/**
 * Returns the pointers whose label no longer matches their panel, with the panel's current label.
 * A label goes stale when the user renames the panel, or when an untitled panel's chart measure
 * changes. Pointers to panels with no derivable name, to removed panels, or to other dashboards
 * are left out.
 */
export const getRelabelledPanelPointers = ({
  dashboardData,
  dashboardAttachmentId,
  pointers,
}: {
  dashboardData: DashboardAttachmentData;
  /** The conversation's attachment linked to this dashboard. */
  dashboardAttachmentId: string | undefined;
  /** The conversation's active pointers. */
  pointers: readonly PanelPointer[];
}): PanelPointer[] => {
  if (!dashboardAttachmentId) {
    return [];
  }
  const linkedPointers = pointers.filter(
    ({ data }) => data.dashboard_attachment_id === dashboardAttachmentId
  );
  if (!linkedPointers.length) {
    return [];
  }

  const labelByPanelId = getPanelLabels(dashboardData);
  return linkedPointers.flatMap(({ id, data }) => {
    const label = labelByPanelId.get(data.panel_id);
    return label && label !== data.label ? [{ id, data: { ...data, label } }] : [];
  });
};
