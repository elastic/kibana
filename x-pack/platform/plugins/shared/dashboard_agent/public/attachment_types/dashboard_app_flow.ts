/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { getStateFromAttachment } from './attachment_to_dashboard_state';

interface HandlePreviewInDashboardParams {
  attachment: DashboardAttachment;
  dashboardApi: DashboardApi;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

export const handlePreviewInDashboard = async ({
  attachment,
  dashboardApi,
  checkSavedDashboardExist,
}: HandlePreviewInDashboardParams) => {
  const dashboardState = getStateFromAttachment(attachment);
  const attachmentLinkedSavedObjectId = attachment.origin?.savedObjectId;
  const currentSavedObjectId = dashboardApi.savedObjectId$.getValue();

  // a) Viewing saved dashboard + attachment linked to same dashboard -> apply state
  if (attachmentLinkedSavedObjectId === currentSavedObjectId) {
    dashboardApi.setState(dashboardState);
    dashboardApi.scrollToBottom();
    return;
  }

  // todo: not to show 404 if we are on a different dashboard
  // todo: not to fetch so much if we already know attachmentLinkedSavedObjectId doesn't exist
  // b) Viewing saved dashboard + attachment not linked -> navigate to new unsaved dashboard
  // c) Viewing saved dashboard + attachment linked to different dashboard -> navigate to linked dashboard
  const dashboardId =
    attachmentLinkedSavedObjectId && (await checkSavedDashboardExist(attachmentLinkedSavedObjectId))
      ? attachmentLinkedSavedObjectId
      : undefined;
  if (!dashboardId && !currentSavedObjectId) {
    dashboardApi.setState(dashboardState);
    dashboardApi.scrollToBottom();
    return;
  }

  dashboardApi.locator?.navigate({
    title: dashboardState.title,
    description: dashboardState.description,
    panels: dashboardState.panels,
    time_range: dashboardState.time_range,
    dashboardId,
    viewMode: 'edit',
  });
};
