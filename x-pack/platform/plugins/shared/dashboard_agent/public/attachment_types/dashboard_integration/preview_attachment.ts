/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { attachmentDataToDashboardState } from '@kbn/dashboard-agent-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

interface PreviewAttachmentInDashboardParams {
  attachment: DashboardAttachment;
  dashboardApi: DashboardApi;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (origin: string) => Promise<unknown>;
}

export const previewAttachmentInDashboard = async ({
  attachment,
  dashboardApi,
  checkSavedDashboardExist,
  updateOrigin,
}: PreviewAttachmentInDashboardParams) => {
  const dashboardState = attachmentDataToDashboardState(attachment.data);
  const currentSavedObjectId = dashboardApi.savedObjectId$.getValue();

  // a) Viewing saved dashboard + attachment linked to same dashboard -> apply state
  // Also handles both being undefined (unsaved dashboard, unlinked attachment)
  if (attachment.origin === currentSavedObjectId) {
    dashboardApi.setState(dashboardState);
    return;
  }

  // Check if the attachment's linked dashboard still exists
  const linkedDashboardExists = attachment.origin
    ? await checkSavedDashboardExist(attachment.origin)
    : false;

  if (!currentSavedObjectId && !linkedDashboardExists) {
    // b) Viewing unsaved dashboard + attachment linked to deleted dashboard
    dashboardApi.setState(dashboardState);
    return;
  }

  // c) Attachment linked to different existing dashboard -> navigate to linked dashboard or a new unsaved dashboard with the attachment's state
  dashboardApi.locator?.navigate({
    title: dashboardState.title,
    description: dashboardState.description,
    panels: dashboardState.panels,
    time_range: dashboardState.time_range,
    dashboardId: linkedDashboardExists ? attachment.origin : undefined,
    viewMode: 'edit',
  });
};
