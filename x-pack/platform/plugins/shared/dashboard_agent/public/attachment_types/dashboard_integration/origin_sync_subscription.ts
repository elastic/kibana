/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export const createOriginSyncSubscription = ({
  api,
  attachmentOrigin,
  checkSavedDashboardExist,
  onOriginChange,
}: {
  api: DashboardApi;
  attachmentOrigin: string | undefined;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  onOriginChange: (origin: string) => void;
}): Subscription => {
  let origin = attachmentOrigin;

  return api.onSave$.subscribe(async ({ previousDashboardId, dashboardId }) => {
    if (!dashboardId) {
      return;
    }

    // Only update origin if:
    // - the attachment has no origin yet (first save of unsaved dashboard)
    // - the attachment already points to this dashboard (subsequent saves)
    // - the saved dashboard was previously the attachment origin (save as)
    if (!origin || dashboardId === origin || previousDashboardId === origin) {
      onOriginChange(dashboardId);
      origin = dashboardId;
      return;
    }

    // If we're saving some other dashboard, only relink when the stored origin no longer exists.
    const linkedDashboardExists = await checkSavedDashboardExist(origin);

    if (linkedDashboardExists) {
      return;
    }

    onOriginChange(dashboardId);
    origin = dashboardId;
  });
};
