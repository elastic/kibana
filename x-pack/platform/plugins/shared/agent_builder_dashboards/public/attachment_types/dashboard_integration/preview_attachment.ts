/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { applyAttachmentToDashboard } from './apply_attachment';
import type { AppliedAttachmentsStore } from './applied_attachments_store';
import { resolveAttachmentTarget } from './linked_attachment';

interface PreviewAttachmentInDashboardParams {
  attachment: DashboardAttachment;
  dashboardApi: DashboardApi;
  appliedAttachments: AppliedAttachmentsStore;
  dashboardLocator?: DashboardRendererProps['locator'];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

/** Dashboard locator params that open the attachment data, with filters in their stored form. */
export const toDashboardLocatorParams = (data: DashboardAttachmentData) => {
  const { filters, query, ...dashboardState } = attachmentDataToDashboardState(data);
  return {
    ...dashboardState,
    filters: toStoredFilters(filters),
    query: toStoredQuery(query),
    // the attachment holds the dashboard's filters, so they replace the saved ones
    preserveSavedFilters: false,
  };
};

export const previewAttachmentInDashboard = async ({
  attachment,
  dashboardApi,
  appliedAttachments,
  dashboardLocator,
  checkSavedDashboardExist,
}: PreviewAttachmentInDashboardParams) => {
  const target = await resolveAttachmentTarget({
    api: dashboardApi,
    store: appliedAttachments,
    attachment,
    checkSavedDashboardExist,
  });
  if (target === 'apply') {
    await applyAttachmentToDashboard({ store: appliedAttachments, api: dashboardApi, attachment });
    return;
  }

  const openSavedDashboard = target === 'open_saved_dashboard';
  // a new dashboard stays linked to the attachment
  if (!openSavedDashboard) {
    appliedAttachments.linkNextDashboard(dashboardApi, attachment.id);
  }
  // A host app's own `dashboardApi.locator` (e.g. Security's) may keep only `dashboardId` and drop
  // the attachment's panels, so navigate through the Dashboard app locator instead.
  await dashboardLocator?.navigate({
    ...toDashboardLocatorParams(attachment.data),
    dashboardId: openSavedDashboard ? attachment.origin : undefined,
    viewMode: 'edit',
    changedBy: ['agent'],
  });
};
