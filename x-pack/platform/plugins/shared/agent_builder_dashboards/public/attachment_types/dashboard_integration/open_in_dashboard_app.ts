/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { DashboardRendererProps } from '@kbn/dashboard-plugin/public';

export type DashboardLocator = NonNullable<DashboardRendererProps['locator']>;

/**
 * Dashboard locator params that open the whole dashboard state, with filters and query in the
 * stored form the locator expects.
 */
export const toDashboardLocatorParams = ({
  filters,
  query,
  ...dashboardState
}: DashboardState): DashboardLocatorParams => ({
  ...dashboardState,
  filters: toStoredFilters(filters),
  query: toStoredQuery(query),
  // the state holds the dashboard's own filters, so they replace the saved ones
  preserveSavedFilters: false,
});

/**
 * Opens the agent's changes in the Dashboard app in edit mode, in the saved dashboard
 * `params.dashboardId` points to, or in a new dashboard when it's unset.
 */
export const openInDashboardApp = async (
  locator: DashboardLocator | undefined,
  params: DashboardLocatorParams
): Promise<void> => {
  if (!locator) {
    throw new Error(
      i18n.translate('xpack.agentBuilderDashboards.openInDashboardApp.noLocatorErrorMessage', {
        defaultMessage: "The Dashboard app isn't available to open the agent's changes.",
      })
    );
  }
  await locator.navigate({ ...params, viewMode: 'edit', changedBy: ['agent'] });
};
