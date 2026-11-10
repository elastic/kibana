/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DASHBOARD_APP_ID } from '@kbn/deeplinks-analytics';
import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  openInDashboardApp,
  toDashboardLocatorParams,
  type DashboardLocator,
} from './open_in_dashboard_app';

export type ApplyAgentChangesOutcome = 'applied' | 'opened-new-dashboard';

interface ApplyAgentChangesParams {
  api: DashboardApi;
  dashboardState: DashboardState;
  dashboardLocator?: DashboardLocator;
  toasts: NotificationsStart['toasts'];
}

export const APPLY_AGENT_CHANGES_ERROR_TITLE = i18n.translate(
  'xpack.agentBuilderDashboards.applyAgentChanges.errorToastTitle',
  { defaultMessage: "Couldn't apply the agent's changes to the dashboard" }
);

/**
 * Whether the agent's changes can be applied to the open dashboard itself, for a user who can
 * write dashboards.
 */
export const canApplyAgentChangesInPlace = (api: DashboardApi): boolean =>
  api.isEditableByUser && !api.isManaged;

/**
 * Applies agent changes to the open dashboard, or opens them in a new dashboard when the open one
 * can't be edited. Expects a user who can write dashboards.
 */
export const applyAgentChangesToDashboard = async ({
  api,
  dashboardState,
  dashboardLocator,
  toasts,
}: ApplyAgentChangesParams): Promise<ApplyAgentChangesOutcome> => {
  if (canApplyAgentChangesInPlace(api)) {
    // Hosts other than the Dashboard app (e.g. Security) render the dashboard without save controls
    if (api.getAppContext().currentAppId === DASHBOARD_APP_ID) {
      api.setViewMode('edit');
    }
    await api.setState(dashboardState, { changedBy: ['agent'] });
    return 'applied';
  }

  await openInDashboardApp(dashboardLocator, toDashboardLocatorParams(dashboardState));
  toasts.addWarning({
    title: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.newDashboardToastTitle', {
      defaultMessage: "The agent's changes were opened in a new dashboard",
    }),
    text: api.isManaged
      ? i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.managedDashboardText', {
          defaultMessage:
            "The original dashboard is managed by Elastic and can't be edited. Save the new dashboard to keep the changes.",
        })
      : i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.notEditableByUserText', {
          defaultMessage:
            "You don't have permission to edit the original dashboard. Save the new dashboard to keep the changes.",
        }),
  });
  return 'opened-new-dashboard';
};
