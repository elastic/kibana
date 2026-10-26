/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';

/*
 * keep the attachment's origin in sync with the dashboard's saved object id on dashboard save,
 * so that the attachment always points to the correct dashboard even after saving to a new dashboard
 * or saving an unsaved dashboard
 */
export const createOriginSyncSubscription = ({
  api,
  getAttachments,
  checkSavedDashboardExist,
  updateOrigin,
}: {
  api: DashboardApi;
  getAttachments: () => undefined | DashboardAttachment[];
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (attachmentId: string, origin: string) => Promise<void>;
}): Subscription => {
  return api.onSave$.subscribe(async ({ previousDashboardId, dashboardId }: DashboardSaveEvent) => {
    if (!dashboardId) {
      return;
    }
    const attachments = getAttachments();
    if (!attachments) {
      return;
    }
    if (attachments.some(({ origin }) => origin === dashboardId)) {
      return;
    }
    const attachmentToSync = attachments.find(({ origin }) => origin === previousDashboardId);
    if (attachmentToSync) {
      return updateOrigin(attachmentToSync.id, dashboardId);
    }

    // if no attachment to sync, check if there is an attachment with a non-existing
    // origin (dashboard has been removed)
    let attachmentWithNonExistingOrigin: DashboardAttachment | undefined;
    for (const attachment of attachments) {
      if (attachment.origin && !(await checkSavedDashboardExist(attachment.origin))) {
        attachmentWithNonExistingOrigin = attachment;
        break;
      }
    }

    if (attachmentWithNonExistingOrigin) {
      return updateOrigin(attachmentWithNonExistingOrigin.id, dashboardId);
    }
  });
};
