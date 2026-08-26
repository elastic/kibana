/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  OPEN_DASHBOARD_PRETTIFY_ACTION_ID,
  type OpenDashboardPrettifyActionContext,
} from '@kbn/dashboard-plugin/public';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition as ActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { isPrettifyCompatibleDashboard } from './is_prettify_compatible_dashboard';

export const DASHBOARD_PRETTIFY_PROMPT = '/dashboard-management prettify this dashboard';

export const createPrettifyDashboardAction = ({
  openChat,
  canWriteDashboards,
}: {
  openChat: AgentBuilderPluginStart['openChat'];
  canWriteDashboards: boolean;
}): ActionDefinition<OpenDashboardPrettifyActionContext> => ({
  id: OPEN_DASHBOARD_PRETTIFY_ACTION_ID,
  type: OPEN_DASHBOARD_PRETTIFY_ACTION_ID,
  order: 0,
  getDisplayName: () =>
    i18n.translate('xpack.agentBuilderDashboards.prettify.buttonLabel', {
      defaultMessage: 'Prettify',
    }),
  getIconType: () => 'sparkles',
  isCompatible: async ({ dashboardApi }) => {
    if (!canWriteDashboards || !dashboardApi.isEditableByUser) {
      return false;
    }
    if (dashboardApi.viewMode$.value !== 'edit') {
      return false;
    }

    const data = dashboardStateToAttachmentData(dashboardApi.getSerializedState().attributes);
    return isPrettifyCompatibleDashboard(data);
  },
  execute: async ({ dashboardApi }) => {
    const data = dashboardStateToAttachmentData(dashboardApi.getSerializedState().attributes);
    if (
      !canWriteDashboards ||
      !dashboardApi.isEditableByUser ||
      dashboardApi.viewMode$.value !== 'edit' ||
      !isPrettifyCompatibleDashboard(data)
    ) {
      throw new IncompatibleActionError();
    }

    const savedObjectId = dashboardApi.savedObjectId$.value;

    openChat({
      newConversation: true,
      initialMessage: DASHBOARD_PRETTIFY_PROMPT,
      autoSendInitialMessage: true,
      sessionTag: 'dashboard',
      attachments: [
        {
          type: DASHBOARD_ATTACHMENT_TYPE,
          data,
          ...(savedObjectId ? { origin: savedObjectId } : {}),
        },
      ],
    });
  },
});
