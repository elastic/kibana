/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  isDashboardAttachment,
  isDashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import {
  VISUALIZATION_ATTACHMENT_TYPE,
  VEGA_VIS_TYPE,
  isCustomContentVisualization,
  type VisualizationAttachmentData,
} from '@kbn/agent-builder-visualizations-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE, toEsqlQueryState } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  createPanelFailureResult,
  type InlinePanelOperationType,
  type PanelContentAttempt,
} from '../resolve_panel';
import { indexPanelsById } from '../dashboard_state';
import type { PanelContent } from '../operations/panels';

/** Maps a stored visualization payload onto the embeddable that renders it. */
const toPanelContent = (data: VisualizationAttachmentData): PanelContent => {
  // Custom content is matched first so the Lens fallback cannot swallow it.
  if (isCustomContentVisualization(data)) {
    return {
      type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
      config: {
        template: data.visualization.template,
        esql_query: toEsqlQueryState(data.esql),
      },
    };
  }

  if (data.renderer === 'vega') {
    return { type: VEGA_VIS_TYPE, config: data.visualization };
  }

  return { type: LENS_EMBEDDABLE_TYPE, config: data.visualization };
};

/**
 * Reads a visualization attachment, or a dashboard panel pointer, from the conversation and turns
 * it into panel content, so the model can place a visualization it already created, or duplicate
 * a panel the user pointed at, without copying the payload back through a tool call. Failures are
 * returned, not thrown, so one bad attachment fails only its own panel — the same way an
 * unresolvable panel request behaves.
 */
export const createAttachmentPanelResolver = ({
  attachments,
}: {
  attachments: AttachmentStateManager;
}) => {
  return (attachmentId: string, operationType: InlinePanelOperationType): PanelContentAttempt => {
    const fail = (error: string) => createPanelFailureResult(operationType, attachmentId, error);

    const record = attachments.getAttachmentRecord(attachmentId);
    if (!record) {
      return fail(`Attachment "${attachmentId}" not found in this conversation.`);
    }

    if (isDashboardPanelAttachment(record)) {
      return resolveDashboardPanelPointer(record, attachments, fail);
    }

    if (record.type !== VISUALIZATION_ATTACHMENT_TYPE) {
      return fail(
        `Attachment "${attachmentId}" is a "${record.type}" attachment; only ${VISUALIZATION_ATTACHMENT_TYPE} and ${DASHBOARD_PANEL_ATTACHMENT_TYPE} attachments can be added as panels.`
      );
    }

    const latestVersion = getLatestVersion(record);
    const data = latestVersion?.data as VisualizationAttachmentData | undefined;
    if (!data?.visualization) {
      return fail(`Attachment "${attachmentId}" has no readable visualization data.`);
    }

    return { type: 'success', panelContent: toPanelContent(data) };
  };
};

/**
 * A pointer names a panel on a dashboard attachment. The copy is taken from that attachment's
 * latest persisted version, so edits made earlier in the same tool call are not reflected.
 */
const resolveDashboardPanelPointer = (
  pointer: VersionedAttachment,
  attachments: AttachmentStateManager,
  fail: (error: string) => PanelContentAttempt
): PanelContentAttempt => {
  const pointerData = getLatestVersion(pointer)?.data as
    | { dashboard_attachment_id: string; panel_id: string }
    | undefined;
  if (!pointerData) {
    return fail(`Panel pointer "${pointer.id}" has no readable data.`);
  }

  const { dashboard_attachment_id: dashboardAttachmentId, panel_id: panelId } = pointerData;
  const dashboard = attachments.getAttachmentRecord(dashboardAttachmentId);
  if (!dashboard || !isDashboardAttachment(dashboard)) {
    return fail(
      `Panel pointer "${pointer.id}" names dashboard attachment "${dashboardAttachmentId}", which is not in this conversation.`
    );
  }

  const dashboardData = getLatestVersion(dashboard)?.data;
  const panel = dashboardData ? indexPanelsById(dashboardData.panels).get(panelId) : undefined;
  if (!panel) {
    return fail(
      `Panel "${panelId}" no longer exists on dashboard attachment "${dashboardAttachmentId}". Tell the user instead of recreating it.`
    );
  }

  return { type: 'success', panelContent: { type: panel.type, config: panel.config } };
};
