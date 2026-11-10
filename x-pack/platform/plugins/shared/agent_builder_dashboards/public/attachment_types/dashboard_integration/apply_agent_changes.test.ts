/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { applyAgentChangesToDashboard } from './apply_agent_changes';

const dashboardState = {
  title: 'Agent dashboard',
  description: 'Built by the agent',
  panels: [],
  time_range: { from: 'now-7d', to: 'now' },
} as unknown as DashboardState;

const buildDashboardApi = ({
  isManaged = false,
  isEditableByUser = true,
  currentAppId = 'dashboards',
}: { isManaged?: boolean; isEditableByUser?: boolean; currentAppId?: string } = {}) => ({
  savedObjectId$: { getValue: () => 'dashboard-1' },
  getAppContext: () => ({ currentAppId }),
  isManaged,
  isEditableByUser,
  setViewMode: jest.fn(),
  setState: jest.fn(),
});

const buildLocator = () => ({ navigate: jest.fn(), getRedirectUrl: jest.fn() });

const buildToasts = () => ({ addWarning: jest.fn() });

const apply = ({
  api = buildDashboardApi(),
  canWriteDashboards = true,
  dashboardLocator = buildLocator(),
  toasts = buildToasts(),
}: {
  api?: ReturnType<typeof buildDashboardApi>;
  canWriteDashboards?: boolean;
  dashboardLocator?: ReturnType<typeof buildLocator>;
  toasts?: ReturnType<typeof buildToasts>;
} = {}) =>
  applyAgentChangesToDashboard({
    api: api as unknown as DashboardApi,
    dashboardState,
    canWriteDashboards,
    dashboardLocator,
    toasts: toasts as unknown as NotificationsStart['toasts'],
  });

describe('applyAgentChangesToDashboard', () => {
  it('switches an editable dashboard to edit mode before applying the changes', async () => {
    const api = buildDashboardApi();

    await apply({ api });

    expect(api.setViewMode).toHaveBeenCalledWith('edit');
    expect(api.setState).toHaveBeenCalledWith(dashboardState, { changedBy: ['agent'] });
    expect(api.setViewMode.mock.invocationCallOrder[0]).toBeLessThan(
      api.setState.mock.invocationCallOrder[0]
    );
  });

  it.each([
    ['the dashboard is managed', { isManaged: true }],
    ['the user cannot edit this dashboard', { isEditableByUser: false }],
  ])(
    'opens the changes in a new dashboard and warns, leaving the dashboard untouched, when %s',
    async (_, apiOptions) => {
      const api = buildDashboardApi(apiOptions);
      const dashboardLocator = buildLocator();
      const toasts = buildToasts();

      await apply({ api, dashboardLocator, toasts });

      expect(api.setViewMode).not.toHaveBeenCalled();
      expect(api.setState).not.toHaveBeenCalled();
      expect(dashboardLocator.navigate).toHaveBeenCalledWith({
        title: 'Agent dashboard',
        description: 'Built by the agent',
        panels: [],
        time_range: { from: 'now-7d', to: 'now' },
        viewMode: 'edit',
        changedBy: ['agent'],
      });
      expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    }
  );

  it('leaves the dashboard untouched and warns when the user cannot write dashboards', async () => {
    const api = buildDashboardApi();
    const dashboardLocator = buildLocator();
    const toasts = buildToasts();

    await apply({ api, canWriteDashboards: false, dashboardLocator, toasts });

    expect(api.setViewMode).not.toHaveBeenCalled();
    expect(api.setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
  });

  it('applies the changes in place without entering edit mode to an editable dashboard hosted outside the Dashboard app', async () => {
    const api = buildDashboardApi({ currentAppId: 'securitySolutionUI' });
    const dashboardLocator = buildLocator();

    await apply({ api, dashboardLocator });

    expect(api.setState).toHaveBeenCalledWith(dashboardState, { changedBy: ['agent'] });
    expect(api.setViewMode).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
  });

  it('opens the changes in a new dashboard when a managed dashboard is hosted outside the Dashboard app', async () => {
    const api = buildDashboardApi({ isManaged: true, currentAppId: 'securitySolutionUI' });
    const dashboardLocator = buildLocator();
    const toasts = buildToasts();

    await apply({ api, dashboardLocator, toasts });

    expect(api.setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.not.objectContaining({ dashboardId: expect.anything() })
    );
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
  });
});
