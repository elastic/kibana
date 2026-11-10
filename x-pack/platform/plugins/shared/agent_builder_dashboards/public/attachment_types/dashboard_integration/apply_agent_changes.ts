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
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { toDashboardLocatorParams } from './dashboard_locator_params';

interface ApplyAgentChangesParams {
  api: DashboardApi;
  dashboardState: DashboardState;
  canWriteDashboards: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  toasts: NotificationsStart['toasts'];
  /**
   * Called right before the changes open in a new dashboard, so it can be linked to them.
   * The function it returns is called when the new dashboard fails to open.
   */
  onOpenInNewDashboard?: () => (() => void) | void;
}

export const APPLY_AGENT_CHANGES_ERROR_TITLE = i18n.translate(
  'xpack.agentBuilderDashboards.applyAgentChanges.errorToastTitle',
  { defaultMessage: "Couldn't apply the agent's changes to the dashboard" }
);

/**
 * Whether the agent's changes can be applied to the open dashboard itself.
 */
export const canApplyAgentChangesInPlace = (
  api: DashboardApi,
  canWriteDashboards: boolean
): boolean => canWriteDashboards && api.isEditableByUser && !api.isManaged;

/**
 * Applies agent changes to the open dashboard, or to a new dashboard when the open one can't be edited.
 */
export const applyAgentChangesToDashboard = async ({
  api,
  dashboardState,
  canWriteDashboards,
  dashboardLocator,
  toasts,
  onOpenInNewDashboard,
}: ApplyAgentChangesParams): Promise<void> => {
  if (!canWriteDashboards) {
    toasts.addWarning({
      title: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.notAppliedToastTitle', {
        defaultMessage: "The agent's changes weren't applied",
      }),
      text: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.noWritePermissionText', {
        defaultMessage:
          "You don't have permission to edit dashboards. Preview the dashboard attachment in the chat to see the changes.",
      }),
    });
    return;
  }

  if (!canApplyAgentChangesInPlace(api, canWriteDashboards)) {
    if (!dashboardLocator) {
      return;
    }
    const unlink = onOpenInNewDashboard?.();
    try {
      await dashboardLocator.navigate({
        ...toDashboardLocatorParams(dashboardState),
        viewMode: 'edit',
        changedBy: ['agent'],
      });
    } catch (error) {
      unlink?.();
      throw error;
    }
    toasts.addWarning({
      title: i18n.translate(
        'xpack.agentBuilderDashboards.applyAgentChanges.newDashboardToastTitle',
        {
          defaultMessage: "The agent's changes were opened in a new dashboard",
        }
      ),
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
    return;
  }

  // Hosts other than the Dashboard app (e.g. Security) render the dashboard without save controls
  if (api.getAppContext().currentAppId === DASHBOARD_APP_ID) {
    api.setViewMode('edit');
  }
  await api.setState(dashboardState, { changedBy: ['agent'] });
};
