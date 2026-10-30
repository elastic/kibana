/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { applyAttachmentToDashboard } from './apply_attachment';
import type { AppliedAttachmentsStore } from './applied_attachments_store';
import { canShowAttachmentInDashboard } from './linked_attachment';

interface PreviewAttachmentInDashboardParams {
  attachment: DashboardAttachment;
  dashboardApi: DashboardApi;
  appliedAttachments: AppliedAttachmentsStore;
  dashboardLocator?: DashboardRendererProps['locator'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

export const previewAttachmentInDashboard = async ({
  attachment,
  dashboardApi,
  appliedAttachments,
  dashboardLocator,
  checkSavedDashboardExist,
}: PreviewAttachmentInDashboardParams) => {
  // the attachment belongs on the open dashboard, or the dashboard is new and empty -> apply state
  if (canShowAttachmentInDashboard({ api: dashboardApi, store: appliedAttachments, attachment })) {
    await applyAttachmentToDashboard({ store: appliedAttachments, api: dashboardApi, attachment });
    return;
  }

  const linkedDashboardExists = attachment.origin
    ? await checkSavedDashboardExist(attachment.origin)
    : false;
  const dashboardState = attachmentDataToDashboardState(attachment.data);

  // otherwise navigate to the attachment's saved dashboard, or a new unsaved dashboard with its state,
  // so the open dashboard is not overwritten
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
