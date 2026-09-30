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
  getDashboardPanelAttachmentId,
  isDashboardPanelAttachment,
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { indexPanelsById } from './core/dashboard_state';
import type { DashboardOperation } from './core/operations/registry';

interface RefreshDashboardPanelPointersParams {
  attachments: AttachmentStateManager;
  operations: DashboardOperation[];
  dashboardData: DashboardAttachmentData;
  logger: Logger;
}

const getPanelTitle = ({ config }: AttachmentPanel): string | undefined => {
  const { title } = config;
  return typeof title === 'string' && title.length > 0
    ? title.slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH)
    : undefined;
};

/**
 * Keeps panel pointer attachments in step with the panels they name: after `edit_panels`
 * changes a panel's title, the pointer's label follows. Pointers use a deterministic id, so no
 * lookup by type is needed. Pointers to removed panels are left alone; their text already tells
 * the agent to check that the panel still exists.
 */
export const refreshDashboardPanelPointers = async ({
  attachments,
  operations,
  dashboardData,
  logger,
}: RefreshDashboardPanelPointersParams): Promise<void> => {
  const editedPanelIds = new Set(
    operations.flatMap((operation) =>
      operation.operation === 'edit_panels' ? operation.panels.map(({ panelId }) => panelId) : []
    )
  );
  if (editedPanelIds.size === 0) {
    return;
  }

  const panelIndex = indexPanelsById(dashboardData.panels);

  for (const panelId of editedPanelIds) {
    const pointer = attachments.getAttachmentRecord(getDashboardPanelAttachmentId(panelId));
    if (!pointer || !isDashboardPanelAttachment(pointer) || pointer.active === false) {
      continue;
    }

    const panel = panelIndex.get(panelId);
    const latestVersion = getLatestVersion(pointer);
    const label = panel ? getPanelTitle(panel) : undefined;
    if (!panel || !latestVersion || !label || label === latestVersion.data.label) {
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
