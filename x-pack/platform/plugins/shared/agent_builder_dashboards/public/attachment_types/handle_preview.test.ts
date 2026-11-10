/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { handlePreview } from './handle_preview';

const buildAttachment = (origin?: string): DashboardAttachment => ({
  id: 'attachment-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin,
  data: {
    title: 'Agent dashboard',
    description: 'Built by the agent',
    panels: [],
    time_range: { from: 'now-7d', to: 'now' },
  },
});

const buildLocator = () => ({ navigate: jest.fn(), getRedirectUrl: jest.fn() });

const buildToasts = () =>
  ({ addWarning: jest.fn(), addError: jest.fn() } as unknown as NotificationsStart['toasts']);

const buildDashboardApi = (savedObjectId: string | undefined) => ({
  savedObjectId$: { getValue: () => savedObjectId },
  getAppContext: () => ({ currentAppId: 'dashboards' }),
  isEditableByUser: true,
  isManaged: false,
  setState: jest.fn(),
  setViewMode: jest.fn(),
  locator: buildLocator(),
});

describe('handlePreview with a published dashboard', () => {
  it.each([
    ['linked to another existing dashboard', 'dashboard-2', 'dashboard-2'],
    ['not linked to a dashboard', undefined, undefined],
  ])(
    'navigates through the Dashboard app locator when the attachment is %s',
    async (_, origin, dashboardId) => {
      const dashboardApi = buildDashboardApi('dashboard-1');
      const dashboardLocator = buildLocator();

      await handlePreview({
        attachment: buildAttachment(origin),
        dashboardApi: dashboardApi as unknown as DashboardApi,
        canWriteDashboards: true,
        isSidebar: true,
        dashboardLocator,
        toasts: buildToasts(),
        checkSavedDashboardExist: async () => true,
      });

      expect(dashboardLocator.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Agent dashboard',
          description: 'Built by the agent',
          panels: [],
          time_range: { from: 'now-7d', to: 'now' },
          preserveSavedFilters: false,
          dashboardId,
          viewMode: 'edit',
          changedBy: ['agent'],
        })
      );
      expect(dashboardApi.locator.navigate).not.toHaveBeenCalled();
      expect(dashboardApi.setState).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['in the dashboard app', buildDashboardApi('dashboard-1')],
    ['outside the dashboard app', undefined],
  ])(
    'passes the attachment filters and query in their stored form when previewing %s',
    async (_, dashboardApi) => {
      const dashboardLocator = buildLocator();
      const attachment = buildAttachment('dashboard-2');

      await handlePreview({
        attachment: {
          ...attachment,
          data: {
            ...attachment.data,
            query: { expression: 'host.name: a', language: 'kql' },
            filters: [
              { type: 'condition', condition: { field: 'host.name', operator: 'is', value: 'a' } },
            ],
          },
        } as DashboardAttachment,
        dashboardApi: dashboardApi as unknown as DashboardApi | undefined,
        canWriteDashboards: true,
        isSidebar: true,
        dashboardLocator,
        toasts: buildToasts(),
        checkSavedDashboardExist: async () => true,
      });

      expect(dashboardLocator.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: 'host.name: a', language: 'kuery' },
          filters: [
            expect.objectContaining({
              meta: expect.objectContaining({ key: 'host.name', params: { query: 'a' } }),
            }),
          ],
          preserveSavedFilters: false,
          dashboardId: 'dashboard-2',
        })
      );
    }
  );

  it('applies the attachment in place in edit mode when it is linked to the viewed dashboard', async () => {
    const dashboardApi = buildDashboardApi('dashboard-1');
    const dashboardLocator = buildLocator();

    await handlePreview({
      attachment: buildAttachment('dashboard-1'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      toasts: buildToasts(),
      checkSavedDashboardExist: async () => true,
    });

    expect(dashboardApi.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Agent dashboard',
        time_range: { from: 'now-7d', to: 'now' },
      }),
      { changedBy: ['agent'] }
    );
    expect(dashboardApi.setViewMode).toHaveBeenCalledWith('edit');
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
  });

  it('shows an error toast when the attachment fails to open', async () => {
    const dashboardApi = buildDashboardApi('dashboard-1');
    const error = new Error('Panel failed to load');
    dashboardApi.setState.mockRejectedValue(error);
    const toasts = buildToasts();

    await handlePreview({
      attachment: buildAttachment('dashboard-1'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator: buildLocator(),
      toasts,
      checkSavedDashboardExist: async () => true,
    });

    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: "Couldn't apply the agent's changes to the dashboard",
    });
  });

  it('applies the attachment in place in edit mode on an unsaved dashboard when its linked dashboard was deleted', async () => {
    const dashboardApi = buildDashboardApi(undefined);
    const dashboardLocator = buildLocator();

    await handlePreview({
      attachment: buildAttachment('deleted-dashboard'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      toasts: buildToasts(),
      checkSavedDashboardExist: async () => false,
    });

    expect(dashboardApi.setState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Agent dashboard' }),
      { changedBy: ['agent'] }
    );
    expect(dashboardApi.setViewMode).toHaveBeenCalledWith('edit');
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
  });

  it('opens the attachment in a new dashboard and warns when the viewed linked dashboard is managed', async () => {
    const dashboardApi = { ...buildDashboardApi('dashboard-1'), isManaged: true };
    const dashboardLocator = buildLocator();
    const toasts = buildToasts();
    const linkNextDashboard = jest.fn();

    await handlePreview({
      attachment: buildAttachment('dashboard-1'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      toasts,
      checkSavedDashboardExist: async () => true,
      linkNextDashboard,
    });

    expect(dashboardApi.setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.not.objectContaining({ dashboardId: expect.anything() })
    );
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    expect(linkNextDashboard).toHaveBeenCalledWith('attachment-1');
  });
});
