/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  findPanelById,
  isDashboardAttachment,
  isDashboardPanelAttachment,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardPanelAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

export type PointedPanelResolution =
  | {
      pointerData: DashboardPanelAttachmentData;
      dashboardData: DashboardAttachmentData;
      panel: AttachmentPanel;
    }
  | { error: string };

/** Follows a panel pointer attachment to the panel it names on its dashboard attachment. */
export const resolvePointedPanel = (
  attachments: Pick<AttachmentStateManager, 'getAttachmentRecord'>,
  panelAttachmentId: string
): PointedPanelResolution => {
  const pointer = attachments.getAttachmentRecord(panelAttachmentId);
  if (!pointer || !isDashboardPanelAttachment(pointer)) {
    return {
      error: `"${panelAttachmentId}" is not a ${DASHBOARD_PANEL_ATTACHMENT_TYPE} attachment in this conversation.`,
    };
  }

  const pointerData = getLatestVersion(pointer)?.data;
  if (!pointerData) {
    return { error: `Panel pointer "${panelAttachmentId}" has no readable data.` };
  }

  const { dashboard_attachment_id: dashboardAttachmentId, panel_id: panelId } = pointerData;
  const dashboard = attachments.getAttachmentRecord(dashboardAttachmentId);
  const dashboardData =
    dashboard && isDashboardAttachment(dashboard) ? getLatestVersion(dashboard)?.data : undefined;
  if (!dashboardData) {
    return {
      error: `Dashboard attachment "${dashboardAttachmentId}" named by the pointer is not in this conversation.`,
    };
  }

  const panel = findPanelById(dashboardData.panels, panelId);
  if (!panel) {
    return {
      error: `Panel "${panelId}" no longer exists on dashboard attachment "${dashboardAttachmentId}". Tell the user instead of recreating it.`,
    };
  }

  return { pointerData, dashboardData, panel };
};
