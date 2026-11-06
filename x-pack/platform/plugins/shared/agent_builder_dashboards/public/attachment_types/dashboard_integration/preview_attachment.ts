/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { applyAttachmentToDashboard } from './apply_attachment';
import type { AppliedAttachmentsStore } from './applied_attachments_store';
import { canShowAttachmentInDashboard, isNewEmptyDashboard } from './linked_attachment';

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

  // the attachment's saved dashboard was deleted, so a new, empty dashboard can stand for it
  if (!linkedDashboardExists && isNewEmptyDashboard(dashboardApi)) {
    await applyAttachmentToDashboard({ store: appliedAttachments, api: dashboardApi, attachment });
    return;
  }

  // otherwise navigate to the attachment's saved dashboard, or a new unsaved dashboard with its state,
  // so the open dashboard is not overwritten; a new dashboard stays linked to the attachment
  if (!linkedDashboardExists) {
    appliedAttachments.linkNextDashboard(dashboardApi, attachment.id);
  }
  const { filters, query, ...dashboardState } = attachmentDataToDashboardState(attachment.data);
  // A host app's own `dashboardApi.locator` (e.g. Security's) may keep only `dashboardId` and drop
  // the attachment's panels, so navigate through the Dashboard app locator instead.
  await dashboardLocator?.navigate({
    ...dashboardState,
    filters: toStoredFilters(filters),
    query: toStoredQuery(query),
    // the attachment holds the dashboard's filters, so they replace the saved ones
    preserveSavedFilters: false,
    dashboardId: linkedDashboardExists ? attachment.origin : undefined,
    viewMode: 'edit',
    changedBy: ['agent'],
  });
};
