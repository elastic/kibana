/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common';
import type { AppliedAttachmentsStore } from './applied_attachments_store';

/*
 * keep the linked attachment's origin in sync with the dashboard's saved object id on dashboard save,
 * so that the attachment always points to the correct dashboard even after saving to a new dashboard
 * or saving an unsaved dashboard
 */
export const createOriginSyncSubscription = ({
  api,
  store,
  getAttachments,
  updateOrigin,
}: {
  api: DashboardApi;
  store: AppliedAttachmentsStore;
  getAttachments: () => undefined | DashboardAttachment[];
  updateOrigin: (
    attachmentId: string,
    origin: string
  ) => Promise<UpdateOriginResponse | undefined> | undefined;
}): Subscription => {
  return api.onSave$.subscribe(({ previousDashboardId, dashboardId }: DashboardSaveEvent) => {
    if (!dashboardId) {
      return;
    }
    const attachments = getAttachments() ?? [];
    const linkedAttachmentId = store.linkedAttachmentIds.get(api);
    const attachmentToSync =
      attachments.find(({ id }) => id === linkedAttachmentId) ??
      (previousDashboardId
        ? attachments.find(({ origin }) => origin === previousDashboardId)
        : undefined);
    if (!attachmentToSync || attachmentToSync.origin === dashboardId) {
      return;
    }
    return updateOrigin(attachmentToSync.id, dashboardId);
  });
};
