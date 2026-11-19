/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { applyAgentChangesToDashboard, canApplyAgentChangesInPlace } from './apply_agent_changes';
import {
  openInDashboardApp,
  toDashboardLocatorParams,
  type DashboardLocator,
} from './open_in_dashboard_app';

interface PreviewAttachmentInDashboardParams {
  attachment: DashboardAttachment;
  dashboardApi: DashboardApi;
  dashboardLocator?: DashboardLocator;
  toasts: NotificationsStart['toasts'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

/** Shows the attachment in the Dashboard app, for a user who can write dashboards. */
export const previewAttachmentInDashboard = async ({
  attachment,
  dashboardApi,
  dashboardLocator,
  toasts,
  checkSavedDashboardExist,
}: PreviewAttachmentInDashboardParams): Promise<void> => {
  const dashboardState = attachmentDataToDashboardState(attachment.data);
  const currentSavedObjectId = dashboardApi.savedObjectId$.getValue();
  const applyAgentChanges = async () => {
    await applyAgentChangesToDashboard({
      api: dashboardApi,
      dashboardState,
      dashboardLocator,
      toasts,
    });
  };

  // a) Viewing saved dashboard + attachment linked to same dashboard -> apply state
  // Also handles both being undefined (unsaved dashboard, unlinked attachment)
  if (attachment.origin === currentSavedObjectId) {
    return applyAgentChanges();
  }

  // Check if the attachment's linked dashboard still exists
  const linkedDashboardExists = attachment.origin
    ? await checkSavedDashboardExist(attachment.origin)
    : false;

  // b) Attachment not linked to an existing dashboard + viewing an unsaved dashboard -> apply state,
  // or viewing a dashboard the user can't edit -> the apply step opens the changes in a new dashboard
  if (
    !linkedDashboardExists &&
    (!currentSavedObjectId || !canApplyAgentChangesInPlace(dashboardApi))
  ) {
    return applyAgentChanges();
  }

  // c) Attachment linked to different existing dashboard -> navigate to linked dashboard or a new unsaved dashboard with the attachment's state
  // A host app's own `dashboardApi.locator` (e.g. Security's) may keep only `dashboardId` and drop
  // the attachment's panels, so navigate through the Dashboard app locator instead.
  await openInDashboardApp(dashboardLocator, {
    ...toDashboardLocatorParams(dashboardState),
    dashboardId: linkedDashboardExists ? attachment.origin : undefined,
  });
};
