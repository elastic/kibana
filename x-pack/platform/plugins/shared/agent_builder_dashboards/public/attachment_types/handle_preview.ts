/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment';
import { toDashboardLocatorParams } from './dashboard_integration/dashboard_locator_params';
import { APPLY_AGENT_CHANGES_ERROR_TITLE } from './dashboard_integration/apply_agent_changes';
import { handleEditInDashboard } from './handle_edit_in_dashboard';

interface HandlePreviewParams {
  attachment: DashboardAttachment;
  dashboardApi?: DashboardApi;
  canWriteDashboards: boolean;
  isSidebar: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  toasts: NotificationsStart['toasts'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  openCanvas?: () => void;
  linkNextDashboard?: (attachmentId: string) => void;
}

/** Previews the attachment, showing an error toast when it can't be opened. */
export const handlePreview = (params: HandlePreviewParams): Promise<void> =>
  openPreview(params).catch((error: Error) => {
    params.toasts.addError(error, { title: APPLY_AGENT_CHANGES_ERROR_TITLE });
  });

const openPreview = async ({
  attachment,
  dashboardApi,
  canWriteDashboards,
  isSidebar,
  dashboardLocator,
  toasts,
  checkSavedDashboardExist,
  openCanvas,
  linkNextDashboard,
}: HandlePreviewParams): Promise<void> => {
  // sidebar in dashboard experience - synchronize dashboard app to attachment
  if (dashboardApi && canWriteDashboards) {
    return previewAttachmentInDashboard({
      attachment,
      dashboardApi,
      canWriteDashboards,
      dashboardLocator,
      toasts,
      checkSavedDashboardExist,
      linkNextDashboard,
    });
  }

  // sidebar preview - open dashboard in sidebar if possible, otherwise open canvas preview
  if (isSidebar && dashboardLocator && canWriteDashboards) {
    const dashboardState = attachmentDataToDashboardState(attachment.data);
    return handleEditInDashboard({
      locator: dashboardLocator,
      getExistingDashboardId: async () => {
        if (!attachment.origin) {
          return undefined;
        }

        const exists = await checkSavedDashboardExist(attachment.origin);
        return exists ? attachment.origin : undefined;
      },
      dashboardLocatorParams: toDashboardLocatorParams(dashboardState),
    });
  }

  // full screen - open canvas
  openCanvas?.();
};
