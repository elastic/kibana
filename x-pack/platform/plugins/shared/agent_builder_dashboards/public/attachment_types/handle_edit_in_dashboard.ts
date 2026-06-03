/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardRendererProps } from '@kbn/dashboard-plugin/public';

export const handleEditInDashboard = async ({
  locator,
  getExistingDashboardId,
  dashboardLocatorParams,
}: {
  locator: NonNullable<DashboardRendererProps['locator']>;
  getExistingDashboardId: () => Promise<string | undefined>;
  dashboardLocatorParams: Record<string, unknown>;
}) => {
  const dashboardId = await getExistingDashboardId();
  await locator.navigate({
    ...dashboardLocatorParams,
    dashboardId,
    viewMode: 'edit',
  });
};
