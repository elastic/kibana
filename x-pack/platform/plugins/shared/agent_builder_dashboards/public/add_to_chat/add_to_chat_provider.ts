/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, map, skip } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AddToChatProvider } from '@kbn/agent-builder-visualizations-plugin/public';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  dashboardStateToAttachmentData,
  findPanelById,
  getDashboardPanelAttachmentId,
  getPanelLabel as getAttachmentPanelLabel,
  isDashboardAttachment,
  type DashboardAttachmentData,
  type PendingDashboardAttachment,
  type PendingDashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  apiHasParentApi,
  apiHasUniqueId,
  apiIsOfType,
  apiPublishesEsql,
  apiPublishesTitle,
  getTitle,
  type HasTypeDisplayName,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import type { CanvasDashboard, CanvasDashboardRegistry, IdGenerator } from '../attachment_types';
import { resolveDashboardAttachmentLink } from '../attachment_types/dashboard_integration/reconcile';
import { reportAddToChatClicked, type AddToChatChatState } from '../telemetry';

/** The pathway the shared "Add to chat" event reports for dashboard panels. */
export const DASHBOARD_PANEL_ADD_TO_CHAT_PROVIDER_ID = 'dashboard_panel';

export interface DashboardAddToChatProviderDeps {
  agentBuilder: Pick<AgentBuilderPluginStart, 'openChat' | 'addAttachment' | 'events'>;
  dashboardAppApi$: DashboardStart['dashboardAppClientApi$'];
  canvasDashboards: Pick<CanvasDashboardRegistry, 'get'>;
  analytics: AnalyticsServiceStart;
  canWriteDashboards: boolean;
  draftAttachmentId: IdGenerator;
}

interface PanelDashboard {
  dashboardApi: DashboardApi;
  /** Set when the dashboard is rendered in the sidebar chat canvas. */
  canvasDashboard?: CanvasDashboard;
}

/**
 * The panel must belong to the dashboard open in the dashboard app or to a dashboard rendered in
 * the sidebar chat canvas. Other dashboard renderers never get this action.
 */
const getPanelDashboard = (
  embeddable: unknown,
  { dashboardAppApi$, canvasDashboards }: DashboardAddToChatProviderDeps
): PanelDashboard | undefined => {
  if (!apiHasParentApi(embeddable)) {
    return undefined;
  }
  const { parentApi } = embeddable;
  const dashboardAppApi = dashboardAppApi$.getValue();
  if (dashboardAppApi && parentApi === dashboardAppApi) {
    return { dashboardApi: dashboardAppApi };
  }
  const canvasDashboard = canvasDashboards.get(parentApi);
  return canvasDashboard ? { dashboardApi: parentApi as DashboardApi, canvasDashboard } : undefined;
};

const isRefinablePanel = (embeddable: unknown): embeddable is HasUniqueId =>
  apiHasUniqueId(embeddable) &&
  (apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE) ||
    (apiIsOfType(embeddable, LENS_EMBEDDABLE_TYPE) &&
      apiPublishesEsql(embeddable) &&
      embeddable.esql$.getValue().length > 0));

/**
 * The panel title when it has one, else a label derived from the chart config in the dashboard
 * state (for example the primary metric of an untitled metric chart). Untitled custom panels keep
 * their "Custom panel" type name; Lens's generic "visualization" type name is never used.
 */
const getPanelLabel = (embeddable: HasUniqueId, dashboardData: DashboardAttachmentData): string => {
  const title = apiPublishesTitle(embeddable) ? getTitle(embeddable) : undefined;
  const panel = findPanelById(dashboardData.panels, embeddable.uuid);
  const derived = panel ? getAttachmentPanelLabel(panel) : undefined;
  const typeDisplayName = apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)
    ? (embeddable as Partial<HasTypeDisplayName>).getTypeDisplayName?.()
    : undefined;
  return (title || derived || typeDisplayName || '').slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH);
};

/**
 * Handles "Add to chat" for ES|QL Lens and custom panels of the dashboard open in the dashboard app
 * or in the sidebar chat canvas: it sends a pointer to the panel, with the dashboard when the chat
 * has no attachment for it yet.
 */
export const createDashboardAddToChatProvider = (
  deps: DashboardAddToChatProviderDeps
): AddToChatProvider => {
  const { agentBuilder, analytics, canWriteDashboards, draftAttachmentId } = deps;
  const isCompatible = (embeddable: unknown): boolean =>
    canWriteDashboards &&
    Boolean(getPanelDashboard(embeddable, deps)) &&
    isRefinablePanel(embeddable);

  return {
    id: DASHBOARD_PANEL_ADD_TO_CHAT_PROVIDER_ID,
    isCompatible,
    getCompatibilityChangesSubject: (embeddable): Observable<undefined> | undefined =>
      apiPublishesEsql(embeddable)
        ? embeddable.esql$.pipe(
            skip(1),
            map(() => undefined)
          )
        : undefined,
    execute: async (embeddable) => {
      const panelDashboard = getPanelDashboard(embeddable, deps);
      if (!panelDashboard || !isRefinablePanel(embeddable) || !isCompatible(embeddable)) {
        return undefined;
      }
      const { dashboardApi, canvasDashboard } = panelDashboard;

      const dashboardData = dashboardStateToAttachmentData(
        dashboardApi.getSerializedState().attributes
      );
      const panelType = apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)
        ? CUSTOM_CONTENT_EMBEDDABLE_TYPE
        : LENS_EMBEDDABLE_TYPE;
      const reportClicked = (chatState: AddToChatChatState) =>
        reportAddToChatClicked(analytics, {
          panel_type: panelType,
          chat_state: chatState,
          is_saved_dashboard: Boolean(dashboardApi.savedObjectId$.getValue()),
        });
      const pointerOnly = { attachmentTypes: [DASHBOARD_PANEL_ATTACHMENT_TYPE] };
      const dashboardAndPointer = {
        attachmentTypes: [DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_PANEL_ATTACHMENT_TYPE],
      };
      const buildDashboardAttachment = (
        id: string,
        origin: string | undefined
      ): PendingDashboardAttachment => ({
        id,
        origin,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardData,
      });
      const buildPanelPointer = (
        dashboardAttachmentId: string
      ): PendingDashboardPanelAttachment => ({
        id: getDashboardPanelAttachmentId({ dashboardAttachmentId, panelId: embeddable.uuid }),
        type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
        data: {
          dashboard_attachment_id: dashboardAttachmentId,
          panel_id: embeddable.uuid,
          label: getPanelLabel(embeddable, dashboardData),
          panel_type: panelType,
        },
      });

      // The canvas renders a dashboard attachment of the open conversation: point at it directly,
      // then close the canvas so the chat input shows the pointer.
      if (canvasDashboard) {
        reportClicked('canvas');
        agentBuilder.addAttachment(buildPanelPointer(canvasDashboard.attachmentId));
        canvasDashboard.closeCanvas();
        return pointerOnly;
      }

      const activeConversation = await firstValueFrom(agentBuilder.events.ui.activeConversation$);
      // the same link the dashboard app integration stages the dashboard with
      const { origin, attachment: linkedAttachment } = resolveDashboardAttachmentLink({
        api: dashboardApi,
        canWriteDashboards,
        attachments:
          activeConversation?.conversation?.attachments?.filter(isDashboardAttachment) ?? [],
      });

      // No chat surface is bound: open a new conversation with the dashboard and the pointer.
      if (!activeConversation) {
        reportClicked('new_conversation');
        agentBuilder.openChat({
          newConversation: true,
          sessionTag: 'dashboard',
          attachments: [
            buildDashboardAttachment(draftAttachmentId.current, origin),
            buildPanelPointer(draftAttachmentId.current),
          ],
        });
        return dashboardAndPointer;
      }

      // The sidebar is open: point at the dashboard attachment already linked to this dashboard.
      if (linkedAttachment) {
        reportClicked('linked_attachment');
        agentBuilder.addAttachment(buildPanelPointer(linkedAttachment.id));
        return pointerOnly;
      }

      // New conversation, or a dashboard the sidebar integration did not attach, e.g. an unlinkable
      // one: stage the dashboard under the draft id (merging with any staged copy) and point at it.
      reportClicked('staged_attachment');
      agentBuilder.addAttachment(buildDashboardAttachment(draftAttachmentId.current, origin));
      agentBuilder.addAttachment(buildPanelPointer(draftAttachmentId.current));
      return dashboardAndPointer;
    },
  };
};
