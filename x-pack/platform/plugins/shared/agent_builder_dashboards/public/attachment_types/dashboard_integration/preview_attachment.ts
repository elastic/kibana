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
import { applyAgentChangesToDashboard, canApplyAgentChangesInPlace } from './apply_agent_changes';
import { toDashboardLocatorParams } from './dashboard_locator_params';

interface PreviewAttachmentInDashboardParams {
  attachment: DashboardAttachment;
  dashboardApi: DashboardApi;
  canWriteDashboards: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  toasts: NotificationsStart['toasts'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  /** The attachment whose changes opened this dashboard as a new one. */
  linkedAttachmentId?: string;
  /** Links the next dashboard that opens to the attachment whose changes it shows. */
  linkNextDashboard?: (attachmentId: string) => () => void;
}

export const previewAttachmentInDashboard = async ({
  attachment,
  dashboardApi,
  canWriteDashboards,
  dashboardLocator,
  toasts,
  checkSavedDashboardExist,
  linkedAttachmentId,
  linkNextDashboard,
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
      onOpenInNewDashboard: () => linkNextDashboard?.(attachment.id),
    });

  // a) Viewing saved dashboard + attachment linked to same dashboard -> apply state
  // Also handles both being undefined (unsaved dashboard, unlinked attachment), and the new
  // dashboard the attachment's changes opened in
  if (attachment.id === linkedAttachmentId || attachment.origin === currentSavedObjectId) {
    return applyAgentChanges();
  }

  // Check if the attachment's linked dashboard still exists
  const linkedDashboardExists = attachment.origin
    ? await checkSavedDashboardExist(attachment.origin)
    : false;

  // b) Attachment not linked to an existing dashboard + viewing an unsaved dashboard, or one the user
  // can't edit (the changes then open in a new dashboard)
  if (
    !linkedDashboardExists &&
    (!currentSavedObjectId || !canApplyAgentChangesInPlace(dashboardApi, canWriteDashboards))
  ) {
    return applyAgentChanges();
  }

  // c) Attachment linked to different existing dashboard -> navigate to linked dashboard or a new unsaved dashboard with the attachment's state
  // A host app's own `dashboardApi.locator` (e.g. Security's) may keep only `dashboardId` and drop
  // the attachment's panels, so navigate through the Dashboard app locator instead.
  await dashboardLocator?.navigate({
    ...toDashboardLocatorParams(dashboardState),
    dashboardId: linkedDashboardExists ? attachment.origin : undefined,
    viewMode: 'edit',
    changedBy: ['agent'],
  });
};
