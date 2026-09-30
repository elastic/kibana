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

export interface RefineWithChatActionDeps {
  agentBuilder: Pick<
    AgentBuilderPluginStart,
    'openChat' | 'addAttachment' | 'getAgentBuilderAccess' | 'events'
  >;
  dashboardAppApi$: DashboardStart['dashboardAppClientApi$'];
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

const getPanelLabel = (embeddable: unknown): string => {
  const title = apiPublishesTitle(embeddable) ? getTitle(embeddable) : undefined;
  const label =
    title || (embeddable as Partial<HasTypeDisplayName>).getTypeDisplayName?.() || '';
  return label.slice(0, DASHBOARD_PANEL_LABEL_MAX_LENGTH);
};

const findLinkedDashboardAttachmentId = (
  conversation: Conversation | undefined,
  dashboardId: string | undefined
): string | undefined =>
  dashboardId
    ? conversation?.attachments?.find(
        (attachment) => isDashboardAttachment(attachment) && attachment.origin === dashboardId
      )?.id
    : undefined;

export const createRefineWithChatAction = ({
  agentBuilder,
  dashboardAppApi$,
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
    execute: async ({ embeddable, onSubmit, onClose }) => {
      const dashboardApi = getDashboardAppApi(embeddable, dashboardAppApi$);
      if (!dashboardApi || !isRefinablePanel(embeddable) || !(await isCompatible(embeddable))) {
        return;
      }

      const dashboardId = dashboardApi.savedObjectId$.getValue();
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
          panel_type: apiIsOfType(embeddable, CUSTOM_CONTENT_EMBEDDABLE_TYPE)
            ? CUSTOM_CONTENT_EMBEDDABLE_TYPE
            : LENS_EMBEDDABLE_TYPE,
        },
      });

      const activeConversation = await firstValueFrom(agentBuilder.events.ui.activeConversation$);

      // No chat surface is bound: open a new conversation with the dashboard and the pointer.
      if (!activeConversation) {
        agentBuilder.openChat({
          newConversation: true,
          sessionTag: 'dashboard',
          attachments: [
            buildDashboardAttachment(draftAttachmentId.current),
            buildPanelPointer(draftAttachmentId.current),
          ],
          onSubmit,
          onClose,
        });
        return;
      }

      // The sidebar is open: point at the dashboard attachment already linked to this dashboard.
      const linkedDashboardAttachmentId = findLinkedDashboardAttachmentId(
        activeConversation.conversation,
        dashboardId
      );
      if (linkedDashboardAttachmentId) {
        agentBuilder.addAttachment(buildPanelPointer(linkedDashboardAttachmentId));
        return;
      }

      // New conversation, or an unsaved dashboard that the sidebar integration did not attach:
      // stage the dashboard under the draft id (merging with any staged copy) and point at it.
      agentBuilder.addAttachment(buildDashboardAttachment(draftAttachmentId.current));
      agentBuilder.addAttachment(buildPanelPointer(draftAttachmentId.current));
    },
  };
};
