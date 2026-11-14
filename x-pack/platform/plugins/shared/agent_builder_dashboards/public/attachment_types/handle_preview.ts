/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardLocator } from './dashboard_integration/open_in_dashboard_app';
import {
  APPLY_AGENT_CHANGES_ERROR_TITLE,
  showAttachment,
} from './dashboard_integration/show_attachment';

interface HandlePreviewParams {
  attachment: DashboardAttachment;
  dashboardApi?: DashboardApi;
  canWriteDashboards: boolean;
  isSidebar: boolean;
  dashboardLocator?: DashboardLocator;
  toasts: NotificationsStart['toasts'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  openCanvas?: () => void;
}

/**
 * Previews the attachment in the Dashboard app when the user can edit it there, otherwise in the
 * canvas, showing an error toast when it can't be opened.
 */
export const handlePreview = async ({
  attachment,
  dashboardApi,
  canWriteDashboards,
  isSidebar,
  dashboardLocator,
  toasts,
  checkSavedDashboardExist,
  openCanvas,
}: HandlePreviewParams): Promise<void> => {
  const canShowInDashboardApp =
    canWriteDashboards && (dashboardApi !== undefined || (isSidebar && dashboardLocator));
  if (!canShowInDashboardApp) {
    openCanvas?.();
    return;
  }
  try {
    await showAttachment({
      attachment,
      api: dashboardApi,
      dashboardLocator,
      toasts,
      checkSavedDashboardExist,
    });
  } catch (error) {
    toasts.addError(error, { title: APPLY_AGENT_CHANGES_ERROR_TITLE });
  }
};
