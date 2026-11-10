/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { applyAgentChangesToDashboard } from './apply_agent_changes';

interface PreviewAttachmentInDashboardParams {
  attachment: DashboardAttachment;
  dashboardApi: DashboardApi;
  canWriteDashboards: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  toasts: NotificationsStart['toasts'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

export const previewAttachmentInDashboard = async ({
  attachment,
  dashboardApi,
  canWriteDashboards,
  dashboardLocator,
  toasts,
  checkSavedDashboardExist,
}: PreviewAttachmentInDashboardParams) => {
  const dashboardState = attachmentDataToDashboardState(attachment.data);
  const currentSavedObjectId = dashboardApi.savedObjectId$.getValue();
  const applyAgentChanges = () =>
    applyAgentChangesToDashboard({
      api: dashboardApi,
      dashboardState,
      canWriteDashboards,
      dashboardLocator,
      toasts,
    });

  // a) Viewing saved dashboard + attachment linked to same dashboard -> apply state
  // Also handles both being undefined (unsaved dashboard, unlinked attachment)
  if (attachment.origin === currentSavedObjectId) {
    return applyAgentChanges();
  }

  // Check if the attachment's linked dashboard still exists
  const linkedDashboardExists = attachment.origin
    ? await checkSavedDashboardExist(attachment.origin)
    : false;

  if (!currentSavedObjectId && !linkedDashboardExists) {
    // b) Viewing unsaved dashboard + attachment linked to deleted dashboard
    return applyAgentChanges();
  }

  // c) Attachment linked to different existing dashboard -> navigate to linked dashboard or a new unsaved dashboard with the attachment's state
  // A host app's own `dashboardApi.locator` (e.g. Security's) may keep only `dashboardId` and drop
  // the attachment's panels, so navigate through the Dashboard app locator instead.
  await dashboardLocator?.navigate({
    title: dashboardState.title,
    description: dashboardState.description,
    panels: dashboardState.panels,
    time_range: dashboardState.time_range,
    dashboardId: linkedDashboardExists ? attachment.origin : undefined,
    viewMode: 'edit',
    changedBy: ['agent'],
  });
};
