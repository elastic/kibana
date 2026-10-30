/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { handlePreview } from './handle_preview';
import { createAppliedAttachmentsStore } from './dashboard_integration/applied_attachments_store';

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

const buildDashboardApi = (savedObjectId: string | undefined) => ({
  savedObjectId$: { getValue: () => savedObjectId },
  setState: jest.fn(),
  getSerializedState: () => ({ attributes: { title: '', panels: [] } }),
  layout$: new BehaviorSubject({ panels: {}, pinnedPanels: {} }),
  diffStates: (baseline: unknown, current: unknown) => (isEqual(baseline, current) ? {} : current),
  getChildApi: jest.fn(),
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
        appliedAttachments: createAppliedAttachmentsStore(),
        canWriteDashboards: true,
        isSidebar: true,
        dashboardLocator,
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

  it('applies the attachment in place when it is linked to the viewed dashboard', async () => {
    const dashboardApi = buildDashboardApi('dashboard-1');
    const dashboardLocator = buildLocator();

    await handlePreview({
      attachment: buildAttachment('dashboard-1'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      appliedAttachments: createAppliedAttachmentsStore(),
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      checkSavedDashboardExist: async () => true,
    });

    expect(dashboardApi.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Agent dashboard',
        time_range: { from: 'now-7d', to: 'now' },
      }),
      { changedBy: ['agent'] }
    );
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
  });

  it('applies the attachment in place on an unsaved dashboard when its linked dashboard was deleted', async () => {
    const dashboardApi = buildDashboardApi(undefined);
    const dashboardLocator = buildLocator();

    await handlePreview({
      attachment: buildAttachment('deleted-dashboard'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      appliedAttachments: createAppliedAttachmentsStore(),
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      checkSavedDashboardExist: async () => false,
    });

    expect(dashboardApi.setState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Agent dashboard' }),
      { changedBy: ['agent'] }
    );
    expect(dashboardLocator.navigate).not.toHaveBeenCalled();
  });
});
