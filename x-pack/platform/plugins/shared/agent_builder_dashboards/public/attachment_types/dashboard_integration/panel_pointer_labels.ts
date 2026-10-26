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
 * derivable name, to removed panels, or to other dashboards are left alone, and pills the user
 * removed are not re-added.
 */
export const syncPanelPointerLabels = ({
  agentBuilder,
  api,
  dashboardAttachmentId,
  pointers,
}: {
  agentBuilder: Pick<AgentBuilderPluginStart, 'addAttachment'>;
  api: DashboardApi;
  /** The conversation's attachment linked to this dashboard; pointers to other dashboards are left alone. */
  dashboardAttachmentId: string | undefined;
  pointers: DashboardPanelPointer[] | undefined;
}): void => {
  const linkedPointers = pointers?.filter(
    (pointer) =>
      pointer.active !== false &&
      getLatestVersion(pointer)?.data.dashboard_attachment_id === dashboardAttachmentId
  );
  if (!dashboardAttachmentId || !linkedPointers?.length) {
    return;
  }

  const labelByPanelId = getPanelLabels(api);

  for (const pointer of linkedPointers) {
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
