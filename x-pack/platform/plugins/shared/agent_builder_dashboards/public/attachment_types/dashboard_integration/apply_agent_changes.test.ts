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

const agentDashboardState = {
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

const apply = ({
  api = buildDashboardApi(),
  dashboardState = agentDashboardState,
  canWriteDashboards = true,
  onOpenInNewDashboard,
  navigate = jest.fn(),
}: {
  api?: ReturnType<typeof buildDashboardApi>;
  dashboardState?: DashboardState;
  canWriteDashboards?: boolean;
  onOpenInNewDashboard?: () => (() => void) | void;
  navigate?: jest.Mock;
} = {}) => {
  const dashboardLocator = { navigate, getRedirectUrl: jest.fn() };
  const toasts = { addWarning: jest.fn() };
  const result = applyAgentChangesToDashboard({
    api: api as unknown as DashboardApi,
    dashboardState,
    canWriteDashboards,
    dashboardLocator,
    toasts: toasts as unknown as NotificationsStart['toasts'],
    onOpenInNewDashboard,
  });
  return { api, dashboardLocator, toasts, result };
};

describe('applyAgentChangesToDashboard', () => {
  it('switches an editable dashboard to edit mode before applying the changes', async () => {
    const { api, result } = apply();
    await result;

    expect(api.setState).toHaveBeenCalledWith(agentDashboardState, { changedBy: ['agent'] });
    expect(api.setViewMode.mock.invocationCallOrder[0]).toBeLessThan(
      api.setState.mock.invocationCallOrder[0]
    );
  });

  it('applies the changes in place without entering edit mode outside the Dashboard app', async () => {
    const { api, dashboardLocator, result } = apply({
      api: buildDashboardApi({ currentAppId: 'securitySolutionUI' }),
    });
    await result;

    expect(api.setState).toHaveBeenCalledWith(agentDashboardState, { changedBy: ['agent'] });
    expect(api.setViewMode).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['the dashboard is managed', { isManaged: true }],
    ['the user cannot edit this dashboard', { isEditableByUser: false }],
    [
      'a managed dashboard is hosted outside the Dashboard app',
      { isManaged: true, currentAppId: 'securitySolutionUI' },
    ],
  ])(
    'opens the changes in a new dashboard and warns, leaving the dashboard untouched, when %s',
    async (_, apiOptions) => {
      const { api, dashboardLocator, toasts, result } = apply({
        api: buildDashboardApi(apiOptions),
      });
      await result;

      expect(api.setState).not.toHaveBeenCalled();
      expect(dashboardLocator.navigate).toHaveBeenCalledWith({
        title: 'Agent dashboard',
        description: 'Built by the agent',
        panels: [],
        time_range: { from: 'now-7d', to: 'now' },
        preserveSavedFilters: false,
        viewMode: 'edit',
        changedBy: ['agent'],
      });
      expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    }
  );

  it('opens the full dashboard state in a new dashboard, with filters and query in their stored form', async () => {
    const { dashboardLocator, result } = apply({
      api: buildDashboardApi({ isManaged: true }),
      dashboardState: {
        ...agentDashboardState,
        query: { expression: 'host.name: a', language: 'kql' },
        filters: [
          { type: 'condition', condition: { field: 'host.name', operator: 'is', value: 'a' } },
        ],
        pinned_panels: [{ type: 'options_list_control', id: 'control-1', config: {} }],
        refresh_interval: { pause: false, value: 60000 },
      } as unknown as DashboardState,
    });
    await result;

    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { query: 'host.name: a', language: 'kuery' },
        filters: [
          expect.objectContaining({
            meta: expect.objectContaining({ key: 'host.name', params: { query: 'a' } }),
          }),
        ],
        pinned_panels: [expect.objectContaining({ id: 'control-1' })],
        refresh_interval: { pause: false, value: 60000 },
      })
    );
  });

  it('calls onOpenInNewDashboard right before opening the new dashboard, and not when applying in place', async () => {
    const onOpenInNewDashboard = jest.fn();
    const managed = apply({ api: buildDashboardApi({ isManaged: true }), onOpenInNewDashboard });
    await managed.result;

    expect(onOpenInNewDashboard.mock.invocationCallOrder[0]).toBeLessThan(
      managed.dashboardLocator.navigate.mock.invocationCallOrder[0]
    );

    onOpenInNewDashboard.mockClear();
    await apply({ onOpenInNewDashboard }).result;

    expect(onOpenInNewDashboard).not.toHaveBeenCalled();
  });

  it('removes the link to the new dashboard when it fails to open', async () => {
    const unlink = jest.fn();
    const { result } = apply({
      api: buildDashboardApi({ isManaged: true }),
      onOpenInNewDashboard: () => unlink,
      navigate: jest.fn().mockRejectedValue(new Error('Navigation failed')),
    });

    await expect(result).rejects.toThrow('Navigation failed');
    expect(unlink).toHaveBeenCalledTimes(1);
  });

  it('leaves the dashboard untouched and warns when the user cannot write dashboards', async () => {
    const { api, dashboardLocator, toasts, result } = apply({ canWriteDashboards: false });
    await result;

    expect(api.setViewMode).not.toHaveBeenCalled();
    expect(api.setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
  });
});
