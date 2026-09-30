/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, map, skip } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  dashboardStateToAttachmentData,
  getDashboardPanelAttachmentId,
  isDashboardAttachment,
  type PendingDashboardAttachment,
  type PendingDashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import {
  REFINE_WITH_CHAT_ACTION_ID,
  type DashboardApi,
  type DashboardStart,
  type RefineWithChatActionContext,
} from '@kbn/dashboard-plugin/public';
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
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { IdGenerator } from '../attachment_types';
import { reportRefineWithChatClicked, type RefineWithChatChatState } from '../telemetry';

export interface RefineWithChatActionDeps {
  agentBuilder: Pick<
    AgentBuilderPluginStart,
    'openChat' | 'addAttachment' | 'getAgentBuilderAccess' | 'events'
  >;
  dashboardAppApi$: DashboardStart['dashboardAppClientApi$'];
  analytics: AnalyticsServiceStart;
  canWriteDashboards: boolean;
  draftAttachmentId: IdGenerator;
}

/**
 * The panel must belong to the dashboard currently open in the dashboard app. Other dashboard
 * renderers (for example the preview inside the chat canvas) never get this action.
 */
const getDashboardAppApi = (
  embeddable: unknown,
  dashboardAppApi$: RefineWithChatActionDeps['dashboardAppApi$']
): DashboardApi | undefined => {
  const dashboardApi = dashboardAppApi$.getValue();
  return dashboardApi && apiHasParentApi(embeddable) && embeddable.parentApi === dashboardApi
    ? dashboardApi
    : undefined;
};

const isRefinablePanel = (embeddable: unknown): embeddable is HasUniqueId =>
  apiHasUniqueId(embeddable) &&
  (apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE) ||
    (apiIsOfType(embeddable, LENS_EMBEDDABLE_TYPE) &&
      apiPublishesEsql(embeddable) &&
      embeddable.esql$.getValue().length > 0));

/**
 * The panel title when it has one. Untitled Lens panels get no label (Lens reports the generic
 * "visualization" type name); untitled custom panels keep their "Custom panel" type name.
 */
const getPanelLabel = (embeddable: unknown): string => {
  const title = apiPublishesTitle(embeddable) ? getTitle(embeddable) : undefined;
  const typeDisplayName = apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)
    ? (embeddable as Partial<HasTypeDisplayName>).getTypeDisplayName?.()
    : undefined;
  return (title || typeDisplayName || '').slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH);
};

/**
 * Mirrors the dashboard app integration: the linked attachment is the one whose origin equals the
 * dashboard's saved object id, including an origin-less attachment for an unsaved dashboard.
 */
const findLinkedDashboardAttachmentId = (
  conversation: Conversation | undefined,
  dashboardId: string | undefined
): string | undefined =>
  conversation?.attachments?.find(
    (attachment) => isDashboardAttachment(attachment) && attachment.origin === dashboardId
  )?.id;

export const createRefineWithChatAction = ({
  agentBuilder,
  dashboardAppApi$,
  analytics,
  canWriteDashboards,
  draftAttachmentId,
}: RefineWithChatActionDeps): ActionDefinition<RefineWithChatActionContext> => {
  const isCompatible = async (embeddable: unknown): Promise<boolean> => {
    const dashboardApi = getDashboardAppApi(embeddable, dashboardAppApi$);
    if (
      !dashboardApi ||
      !canWriteDashboards ||
      dashboardApi.viewMode$.getValue() !== 'edit' ||
      !isRefinablePanel(embeddable)
    ) {
      return false;
    }
    const access = await agentBuilder.getAgentBuilderAccess();
    return access.hasRequiredLicense && access.hasLlmConnector;
  };

  return {
    id: REFINE_WITH_CHAT_ACTION_ID,
    type: REFINE_WITH_CHAT_ACTION_ID,
    order: 25,
    getDisplayName: () =>
      i18n.translate('xpack.agentBuilderDashboards.refineWithChat.displayName', {
        defaultMessage: 'Refine with chat',
      }),
    getIconType: () => 'addToChat',
    isCompatible: ({ embeddable }) => isCompatible(embeddable),
    getCompatibilityChangesSubject: ({ embeddable }): Observable<undefined> | undefined =>
      apiPublishesEsql(embeddable)
        ? embeddable.esql$.pipe(
            skip(1),
            map(() => undefined)
          )
        : undefined,
    execute: async ({ embeddable }) => {
      const dashboardApi = getDashboardAppApi(embeddable, dashboardAppApi$);
      if (!dashboardApi || !isRefinablePanel(embeddable) || !(await isCompatible(embeddable))) {
        return;
      }

      const dashboardId = dashboardApi.savedObjectId$.getValue();
      const panelType = apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)
        ? CUSTOM_CONTENT_EMBEDDABLE_TYPE
        : LENS_EMBEDDABLE_TYPE;
      const reportClicked = (chatState: RefineWithChatChatState) =>
        reportRefineWithChatClicked(analytics, {
          panel_type: panelType,
          chat_state: chatState,
          is_saved_dashboard: Boolean(dashboardId),
        });
      const buildDashboardAttachment = (id: string): PendingDashboardAttachment => ({
        id,
        origin: dashboardId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardStateToAttachmentData(dashboardApi.getSerializedState().attributes),
      });
      const buildPanelPointer = (
        dashboardAttachmentId: string
      ): PendingDashboardPanelAttachment => ({
        id: getDashboardPanelAttachmentId(embeddable.uuid),
        type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
        data: {
          dashboard_attachment_id: dashboardAttachmentId,
          panel_id: embeddable.uuid,
          label: getPanelLabel(embeddable),
          panel_type: panelType,
        },
      });

      const activeConversation = await firstValueFrom(agentBuilder.events.ui.activeConversation$);

      // No chat surface is bound: open a new conversation with the dashboard and the pointer.
      if (!activeConversation) {
        reportClicked('new_conversation');
        agentBuilder.openChat({
          newConversation: true,
          sessionTag: 'dashboard',
          attachments: [
            buildDashboardAttachment(draftAttachmentId.current),
            buildPanelPointer(draftAttachmentId.current),
          ],
        });
        return;
      }

      // The sidebar is open: point at the dashboard attachment already linked to this dashboard.
      const linkedDashboardAttachmentId = findLinkedDashboardAttachmentId(
        activeConversation.conversation,
        dashboardId
      );
      if (linkedDashboardAttachmentId) {
        reportClicked('linked_attachment');
        agentBuilder.addAttachment(buildPanelPointer(linkedDashboardAttachmentId));
        return;
      }

      // New conversation, or an unsaved dashboard that the sidebar integration did not attach:
      // stage the dashboard under the draft id (merging with any staged copy) and point at it.
      reportClicked('staged_attachment');
      agentBuilder.addAttachment(buildDashboardAttachment(draftAttachmentId.current));
      agentBuilder.addAttachment(buildPanelPointer(draftAttachmentId.current));
    },
  };
};
