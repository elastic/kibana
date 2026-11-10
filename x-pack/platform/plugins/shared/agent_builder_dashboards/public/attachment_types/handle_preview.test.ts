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

const buildToasts = () => ({ addWarning: jest.fn() } as unknown as NotificationsStart['toasts']);

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

      expect(dashboardLocator.navigate).toHaveBeenCalledWith({
        title: 'Agent dashboard',
        description: 'Built by the agent',
        panels: [],
        time_range: { from: 'now-7d', to: 'now' },
        dashboardId,
        viewMode: 'edit',
        changedBy: ['agent'],
      });
      expect(dashboardApi.locator.navigate).not.toHaveBeenCalled();
      expect(dashboardApi.setState).not.toHaveBeenCalled();
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

    await handlePreview({
      attachment: buildAttachment('dashboard-1'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      toasts,
      checkSavedDashboardExist: async () => true,
    });

    expect(dashboardApi.setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.not.objectContaining({ dashboardId: expect.anything() })
    );
    expect(toasts.addWarning).toHaveBeenCalledTimes(1);
  });
});
