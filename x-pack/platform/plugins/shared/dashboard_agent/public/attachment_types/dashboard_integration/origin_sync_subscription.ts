/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export const createOriginSyncSubscription = ({
  api,
  getAttachment,
  getSyncAttachment,
  checkSavedDashboardExist,
  updateOrigin,
}: {
  api: DashboardApi;
  getAttachment: () => DashboardAttachment;
  getSyncAttachment: (currentSavedObjectId: string | undefined) => DashboardAttachment | undefined;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (origin: string) => void;
}): Subscription => {
  let origin = getAttachment().origin;

  return api.onSave$.subscribe(async ({ previousDashboardId, dashboardId }) => {
    if (!dashboardId) {
      return;
    }

    const currentSavedObjectId = api.savedObjectId$.getValue();
    const currentAttachment = getAttachment();
    const syncAttachment = getSyncAttachment(currentSavedObjectId);

    if (!syncAttachment || syncAttachment.id !== currentAttachment.id) {
      return;
    }

    // Only update origin if:
    // - the attachment has no origin yet (first save of unsaved dashboard)
    // - the attachment already points to this dashboard (subsequent saves) - we need to update the origin for the staleness check to match origin_snapshot_at
    // - the saved dashboard was previously the attachment origin (save as)
    if (!origin || dashboardId === origin || previousDashboardId === origin) {
      updateOrigin(dashboardId);
      origin = dashboardId;
      return;
    }

    // If we're saving some other dashboard, only relink when the stored origin no longer exists.
    const linkedDashboardExists = await checkSavedDashboardExist(origin);

    if (linkedDashboardExists) {
      return;
    }

    updateOrigin(dashboardId);
    origin = dashboardId;
  });
};
