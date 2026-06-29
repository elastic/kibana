/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment';
import { handleEditInDashboard } from './handle_edit_in_dashboard';

export class DashboardAttachmentNavigationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DashboardAttachmentNavigationError';
  }
}

const labels = {
  locatorUnavailable: i18n.translate(
    'xpack.agentBuilderDashboards.attachments.dashboard.locatorUnavailableError',
    {
      defaultMessage: 'Dashboard navigation is unavailable.',
    }
  ),
};

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
}): Promise<void> => {
  const getExistingDashboardId = async () => {
    if (!attachment.origin) {
      return undefined;
    }

    const exists = await checkSavedDashboardExist(attachment.origin);
    return exists ? attachment.origin : undefined;
  };

  const openInDashboardViaLocator = async () => {
    if (!dashboardLocator) {
      throw new DashboardAttachmentNavigationError(labels.locatorUnavailable);
    }

    const dashboardState = attachmentDataToDashboardState(attachment.data);
    await handleEditInDashboard({
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
    await previewAttachmentInDashboard({
      attachment,
      dashboardApi,
      checkSavedDashboardExist,
    });
    return;
  }

  // Navigate to Dashboard app via locator (sidebar or full-layout when canvas preview is not preferred)
  if (!preferCanvasPreview && dashboardLocator && canWriteDashboards && !isSidebar) {
    await openInDashboardViaLocator();
    return;
  }

  // sidebar preview - open dashboard in sidebar if possible, otherwise open canvas preview
  if (isSidebar && dashboardLocator && canWriteDashboards) {
    await openInDashboardViaLocator();
    return;
  }

  // full screen - open canvas
  openCanvas?.();
};
