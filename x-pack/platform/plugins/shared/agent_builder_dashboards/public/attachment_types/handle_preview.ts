/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment';
import { handleEditInDashboard } from './handle_edit_in_dashboard';

export const handlePreview = async ({
  attachment,
  dashboardApi,
  canWriteDashboards,
  isSidebar,
  dashboardLocator,
  checkSavedDashboardExist,
  openCanvas,
  preferCanvasPreview = false,
}: {
  attachment: DashboardAttachment;
  dashboardApi?: DashboardApi;
  canWriteDashboards: boolean;
  isSidebar: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  openCanvas?: () => void;
  /** Agent-first chrome: preview in the agent column canvas, not the application workspace dashboard. */
  preferCanvasPreview?: boolean;
}) => {
  const getExistingDashboardId = async () => {
    if (!attachment.origin) {
      return undefined;
    }

    const exists = await checkSavedDashboardExist(attachment.origin);
    return exists ? attachment.origin : undefined;
  };

  const openInDashboardViaLocator = () => {
    if (!dashboardLocator) {
      return;
    }

    const dashboardState = attachmentDataToDashboardState(attachment.data);
    return handleEditInDashboard({
      locator: dashboardLocator,
      getExistingDashboardId,
      dashboardLocatorParams: {
        ...dashboardState,
        viewMode: 'edit',
      },
    });
  };

  // sidebar in dashboard experience - synchronize dashboard app to attachment
  if (!preferCanvasPreview && dashboardApi && canWriteDashboards) {
    return previewAttachmentInDashboard({
      attachment,
      dashboardApi,
      checkSavedDashboardExist,
    });
  }

  // Navigate to Dashboard app via locator (sidebar or full-layout when canvas preview is not preferred)
  if (!preferCanvasPreview && dashboardLocator && canWriteDashboards && !isSidebar) {
    return openInDashboardViaLocator();
  }

  // sidebar preview - open dashboard in sidebar if possible, otherwise open canvas preview
  if (isSidebar && dashboardLocator && canWriteDashboards) {
    return openInDashboardViaLocator();
  }

  // full screen - open canvas
  openCanvas?.();
};
