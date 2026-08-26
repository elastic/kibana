/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { AttachmentType, type ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  OPEN_DASHBOARD_PRETTIFY_ACTION_ID,
  type OpenDashboardPrettifyActionContext,
} from '@kbn/dashboard-plugin/public';
import type { ToastsStart } from '@kbn/core/public';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition as ActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { isPrettifyCompatibleDashboard } from './is_prettify_compatible_dashboard';
import {
  expandCollapsedDashboardSections,
  restoreCollapsedDashboardSections,
  waitForDashboardPaint,
} from './wait_for_dashboard_paint';

export const DASHBOARD_PRETTIFY_PROMPT = '/dashboard-management prettify this dashboard';

export const createPrettifyDashboardAction = ({
  openChat,
  canWriteDashboards,
  captureDashboardImage,
  uploadImage,
  toasts,
  waitForPaint = waitForDashboardPaint,
}: {
  openChat: AgentBuilderPluginStart['openChat'];
  canWriteDashboards: boolean;
  captureDashboardImage: (element: HTMLElement) => Promise<Blob>;
  uploadImage: (blob: Blob) => Promise<ImageAttachmentData>;
  toasts?: Pick<ToastsStart, 'addDanger'>;
  waitForPaint?: typeof waitForDashboardPaint;
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
  execute: async ({ dashboardApi, dashboardInternalApi }) => {
    const data = dashboardStateToAttachmentData(dashboardApi.getSerializedState().attributes);
    if (
      !canWriteDashboards ||
      !dashboardApi.isEditableByUser ||
      dashboardApi.viewMode$.value !== 'edit' ||
      !isPrettifyCompatibleDashboard(data)
    ) {
      throw new IncompatibleActionError();
    }

    const collapsedIds = expandCollapsedDashboardSections(dashboardApi);

    try {
      await waitForPaint(dashboardApi.dataLoading$);

      const element = dashboardInternalApi.dashboardContainerRef$.value;
      if (!element) {
        throw new Error('Dashboard is not rendered');
      }

      const blob = await captureDashboardImage(element);
      const imageData = await uploadImage(blob);
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
          {
            type: AttachmentType.image,
            data: imageData,
          },
        ],
      });
    } catch (error) {
      toasts?.addDanger({
        title: i18n.translate('xpack.agentBuilderDashboards.prettify.captureErrorTitle', {
          defaultMessage: 'Could not capture this dashboard',
        }),
        text:
          error instanceof Error
            ? error.message
            : i18n.translate('xpack.agentBuilderDashboards.prettify.captureErrorDescription', {
                defaultMessage:
                  'The dashboard screenshot could not be taken. Prettify was not started.',
              }),
      });
    } finally {
      restoreCollapsedDashboardSections(dashboardApi, collapsedIds);
    }
  },
});
