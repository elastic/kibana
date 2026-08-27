/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart, EmbeddableChatAccess } from '@kbn/agent-builder-browser';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  PRETTIFY_DASHBOARD_ACTION_ID,
  type DashboardApi,
  type PrettifyDashboardActionContext,
} from '@kbn/dashboard-plugin/public';
import { apiPublishesEsqlUsage } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { IdGenerator } from '../attachment_types';

export const PRETTIFY_DASHBOARD_PROMPT = '/dashboard-management prettify this dashboard';

export interface PrettifyDashboardActionDeps {
  openChat: AgentBuilderPluginStart['openChat'];
  getAgentBuilderAccess: AgentBuilderPluginStart['getAgentBuilderAccess'];
  canWriteDashboards: boolean;
  draftAttachmentId: IdGenerator;
}

const isPrettifiable = (
  dashboardApi: DashboardApi,
  access: EmbeddableChatAccess,
  canWrite: boolean
): boolean =>
  dashboardApi.viewMode$.getValue() === 'edit' &&
  canWrite &&
  access.hasRequiredLicense &&
  access.hasLlmConnector &&
  Object.values(dashboardApi.children$.getValue()).some(
    (child) => apiPublishesEsqlUsage(child) && child.usesEsql$.getValue()
  );

export const createPrettifyDashboardAction = ({
  openChat,
  getAgentBuilderAccess,
  canWriteDashboards,
  draftAttachmentId,
}: PrettifyDashboardActionDeps): ActionDefinition<PrettifyDashboardActionContext> => {
  return {
    id: PRETTIFY_DASHBOARD_ACTION_ID,
    type: PRETTIFY_DASHBOARD_ACTION_ID,
    order: 0,
    getDisplayName: () =>
      i18n.translate('xpack.agentBuilderDashboards.prettifyDashboard.buttonLabel', {
        defaultMessage: 'Enhance this dashboard',
      }),
    getIconType: () => 'sparkles',
    isCompatible: async ({ dashboardApi }) =>
      isPrettifiable(dashboardApi, await getAgentBuilderAccess(), canWriteDashboards),
    execute: async ({ dashboardApi }) => {
      if (!isPrettifiable(dashboardApi, await getAgentBuilderAccess(), canWriteDashboards)) {
        return;
      }

      openChat({
        newConversation: true,
        initialMessage: PRETTIFY_DASHBOARD_PROMPT,
        autoSendInitialMessage: true,
        sessionTag: 'dashboard',
        attachments: [
          {
            id: draftAttachmentId.current,
            origin: dashboardApi.savedObjectId$.getValue(),
            type: DASHBOARD_ATTACHMENT_TYPE,
            data: dashboardStateToAttachmentData(dashboardApi.getSerializedState().attributes),
          },
        ],
      });
    },
  };
};
