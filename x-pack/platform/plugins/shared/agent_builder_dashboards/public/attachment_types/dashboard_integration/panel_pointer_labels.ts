/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  dashboardStateToAttachmentData,
  getPanelLabel,
  isSection,
  type DashboardPanelAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

export type DashboardPanelPointer = VersionedAttachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
>;

const getPanelLabels = (api: DashboardApi): Map<string, string> => {
  const labelByPanelId = new Map<string, string>();
  const { panels } = dashboardStateToAttachmentData(api.getSerializedState().attributes);
  for (const widget of panels) {
    for (const panel of isSection(widget) ? widget.panels : [widget]) {
      const label = getPanelLabel(panel);
      if (label) {
        labelByPanelId.set(panel.id, label.slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH));
      }
    }
  }
  return labelByPanelId;
};

/**
 * Keeps panel pointer pills in step with panels the user renames on the dashboard, or whose
 * chart measure changes while the panel is untitled. Re-adding a pointer under its own id replaces
 * it, mirroring how the dashboard attachment itself is synced. Pointers to panels with no
 * derivable name, or to removed panels, are left alone.
 */
export const syncPanelPointerLabels = ({
  agentBuilder,
  api,
  pointers,
}: {
  agentBuilder: Pick<AgentBuilderPluginStart, 'addAttachment'>;
  api: DashboardApi;
  pointers: DashboardPanelPointer[] | undefined;
}): void => {
  if (!pointers?.length) {
    return;
  }

  const labelByPanelId = getPanelLabels(api);

  for (const pointer of pointers) {
    const data = getLatestVersion(pointer)?.data;
    const label = data ? labelByPanelId.get(data.panel_id) : undefined;
    if (!data || !label || label === data.label) {
      continue;
    }
    agentBuilder.addAttachment({
      id: pointer.id,
      type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
      data: { ...data, label },
    });
  }
};
