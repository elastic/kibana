/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { attachmentToDashboardState } from '@kbn/dashboard-agent-common';
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
  const dashboardState = attachmentToDashboardState(attachment);
  let attachmentLinkedSavedObjectId = attachment.origin;
  const currentSavedObjectId = dashboardApi.savedObjectId$.getValue();

  // a) Viewing saved dashboard + attachment linked to same dashboard -> apply state
  if (
    attachmentLinkedSavedObjectId === currentSavedObjectId ||
    (!attachmentLinkedSavedObjectId && !currentSavedObjectId)
  ) {
    dashboardApi.setState(dashboardState);
    return;
  }

  const dashboardHasBeenDeleted =
    attachmentLinkedSavedObjectId &&
    (await checkSavedDashboardExist(attachmentLinkedSavedObjectId)) === false;

  if (dashboardHasBeenDeleted) {
    await updateOrigin('');
    attachmentLinkedSavedObjectId = undefined;
  }

  // b) Viewing saved dashboard + attachment not linked -> navigate to new unsaved dashboard
  if (!attachmentLinkedSavedObjectId && !currentSavedObjectId) {
    dashboardApi.setState(dashboardState);
    return;
  }

  // c) Viewing saved dashboard + attachment linked to different dashboard -> navigate to linked dashboard
  dashboardApi.locator?.navigate({
    title: dashboardState.title,
    description: dashboardState.description,
    panels: dashboardState.panels,
    time_range: dashboardState.time_range,
    dashboardId: attachmentLinkedSavedObjectId,
    viewMode: 'edit',
  });
};
