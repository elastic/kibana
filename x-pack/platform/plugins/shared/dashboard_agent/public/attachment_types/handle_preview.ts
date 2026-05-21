/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentDataToDashboardState } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
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
}: {
  attachment: DashboardAttachment;
  dashboardApi?: DashboardApi;
  canWriteDashboards: boolean;
  isSidebar: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  openCanvas?: () => void;
}) => {
  // sidebar in dashboard experience - synchronize dashboard app to attachment
  if (dashboardApi && canWriteDashboards) {
    return previewAttachmentInDashboard({
      attachment,
      dashboardApi,
      checkSavedDashboardExist,
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
      dashboardLocatorParams: {
        ...dashboardState,
        viewMode: 'edit',
      },
    });
  }

  // full screen - open canvas
  openCanvas?.();
};
