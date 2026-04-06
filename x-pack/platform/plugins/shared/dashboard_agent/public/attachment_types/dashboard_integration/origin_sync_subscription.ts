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
  onOriginChange,
}: {
  api: DashboardApi;
  attachmentOrigin: string | undefined;
  onOriginChange: (origin: string) => void;
}): Subscription => {
  let origin = attachmentOrigin;

  return api.onSave$.subscribe(({ previousDashboardId, dashboardId }) => {
    if (!dashboardId) {
      return;
    }

    // Only update origin if:
    // - the attachment has no origin yet (first save of unsaved dashboard)
    // - the attachment already points to this dashboard (subsequent saves)
    // - the saved dashboard was previously the attachment origin (save as)
    const shouldUpdate = !origin || dashboardId === origin || previousDashboardId === origin;

    if (!shouldUpdate) {
      return;
    }

    onOriginChange(dashboardId);
    origin = dashboardId;
  });
};
