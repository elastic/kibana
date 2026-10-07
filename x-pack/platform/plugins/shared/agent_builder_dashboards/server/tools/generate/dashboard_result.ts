/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type ToolHandlerContext } from '@kbn/agent-builder-server';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  isSection,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import type { OperationFailure, PanelAuthoringNote } from '@kbn/dashboard-authoring';
import { DASHBOARD_UPDATED_UI_EVENT, type DashboardUpdatedUiEventData } from '../../../common';
import { applyDefaultDashboardTimeRange } from './time_range';

/**
 * Compact projection of a dashboard payload, returned in the tool result.
 *
 * The full dashboard payload lives in the dashboard attachment (referenced by
 * id); the LLM only ever sees this slim summary, so it never has to re-emit the
 * heavy payload into a follow-up tool call.
 *
 * `authoringNotesByPanelId` holds the one-sentence note describing every chart
 * authored in this run, keyed by panel id. Panels that were not authored now
 * (or whose engine returned no note) simply have no `authoring_note`.
 */
const summarizeDashboard = (
  dashboardData: DashboardAttachmentData,
  authoringNotesByPanelId: Map<string, string>
) => ({
  title: dashboardData.title,
  description: dashboardData.description,
  panels: dashboardData.panels.map((widget) => {
    if (isSection(widget)) {
      return {
        id: widget.id,
        title: widget.title,
        collapsed: widget.collapsed,
        grid: widget.grid,
        panels: widget.panels.map((panel) => ({
          type: panel.type,
          id: panel.id,
          grid: panel.grid,
          authoring_note: authoringNotesByPanelId.get(panel.id),
        })),
      };
    }
    return {
      type: widget.type,
      id: widget.id,
      grid: widget.grid,
      authoring_note: authoringNotesByPanelId.get(widget.id),
    };
  }),
  controls: (dashboardData.pinned_panels ?? []).map((control) => {
    const c = control as { id?: string; type?: string; config?: { title?: string } };
    return { id: c.id, type: c.type, title: c.config?.title };
  }),
});

/**
 * Applies the default time range, persists the dashboard attachment, notifies the UI, and builds
 * the tool result with the attachment id and a compact dashboard summary.
 */
export const persistDashboardResult = async ({
  dashboardAttachmentId,
  isNewDashboard,
  dashboardData,
  failures,
  panelAuthoringNotes,
  context: { attachments, events, esClient, logger },
}: {
  dashboardAttachmentId: string;
  isNewDashboard: boolean;
  dashboardData: DashboardAttachmentData;
  failures: OperationFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
  context: Pick<ToolHandlerContext, 'attachments' | 'events' | 'esClient' | 'logger'>;
}) => {
  // Data-aware default time range computation
  const finalDashboardData = await applyDefaultDashboardTimeRange({
    dashboardData,
    esClient,
    logger,
  });

  const description = `Dashboard: ${finalDashboardData.title}`;
  const attachment = isNewDashboard
    ? await attachments.add({
        id: dashboardAttachmentId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        description,
        data: finalDashboardData,
      })
    : await attachments.update(dashboardAttachmentId, {
        data: finalDashboardData,
        description,
      });

  if (!attachment) {
    throw new Error(`Failed to persist dashboard attachment "${dashboardAttachmentId}".`);
  }

  logger.info(`Dashboard payload ${isNewDashboard ? 'generated' : 'updated'}`);

  events.sendUiEvent<typeof DASHBOARD_UPDATED_UI_EVENT, DashboardUpdatedUiEventData>(
    DASHBOARD_UPDATED_UI_EVENT,
    {
      attachment: {
        id: attachment.id,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: finalDashboardData,
        origin: attachment.origin,
      },
    }
  );

  return {
    results: [
      {
        type: ToolResultType.dashboard,
        tool_result_id: getToolResultId(),
        data: {
          attachment_id: attachment.id,
          version: attachment.current_version ?? 1,
          dashboard: summarizeDashboard(
            finalDashboardData,
            new Map(
              panelAuthoringNotes.map(({ panelId, authoringNote }) => [panelId, authoringNote])
            )
          ),
          failures: failures.length > 0 ? failures : undefined,
        },
      },
    ],
  };
};

export const toErrorResult = (message: string, metadata?: Record<string, unknown>) => ({
  results: [
    {
      type: ToolResultType.error,
      data: { message, ...(metadata ? { metadata } : {}) },
    },
  ],
});
