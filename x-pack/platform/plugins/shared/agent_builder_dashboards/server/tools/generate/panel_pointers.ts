/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ATTACHMENT_REF_ACTOR, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  findPanelById,
  getDashboardPanelAttachmentId,
  getPanelLabel,
  isDashboardPanelAttachment,
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

interface RefreshDashboardPanelPointersParams {
  attachments: AttachmentStateManager;
  /** The dashboard attachment the upsert edited; pointers to other dashboards are left alone. */
  dashboardAttachmentId: string;
  /** Ids the upsert reported as updated; only pointers to these panels can need a new label. */
  updatedIds: readonly string[];
  dashboardData: DashboardAttachmentData;
  logger: Logger;
}

/**
 * Keeps panel pointer attachments in step with the panels they name: after an upsert changes a
 * panel's title, or the measure an untitled chart is named after, the pointer's label follows.
 * Pointers use a deterministic id, so no lookup by type is needed. Pointers to removed panels are
 * left alone; their text already tells the agent to check that the panel still exists.
 */
export const refreshDashboardPanelPointers = async ({
  attachments,
  dashboardAttachmentId,
  updatedIds,
  dashboardData,
  logger,
}: RefreshDashboardPanelPointersParams): Promise<void> => {
  for (const panelId of new Set(updatedIds)) {
    const pointer = attachments.getAttachmentRecord(getDashboardPanelAttachmentId(panelId));
    if (!pointer || !isDashboardPanelAttachment(pointer) || pointer.active === false) {
      continue;
    }

    const panel = findPanelById(dashboardData.panels, panelId);
    const latestVersion = getLatestVersion(pointer);
    const label = panel
      ? getPanelLabel(panel)?.slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH)
      : undefined;
    if (
      !panel ||
      !latestVersion ||
      latestVersion.data.dashboard_attachment_id !== dashboardAttachmentId ||
      !label ||
      label === latestVersion.data.label
    ) {
      continue;
    }

    try {
      await attachments.update(
        pointer.id,
        { data: { ...latestVersion.data, label } },
        ATTACHMENT_REF_ACTOR.agent
      );
    } catch (error) {
      logger.warn(`Failed to refresh panel pointer "${pointer.id}": ${error}`);
    }
  }
};
