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
    refresh_interval: { pause: false, value: 60000 },
    query: { expression: 'host.name: web-1', language: 'kql' },
    options: { hide_panel_titles: true },
  },
});

const buildLocator = () => ({ navigate: jest.fn(), getRedirectUrl: jest.fn() });

const buildDashboardApi = (savedObjectId: string | undefined, panels: object = {}) => ({
  savedObjectId$: { getValue: () => savedObjectId },
  setState: jest.fn(),
  getSerializedState: () => ({ attributes: { title: '', panels: [] } }),
  layout$: new BehaviorSubject({ panels, pinnedPanels: {} }),
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

      expect(dashboardLocator.navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Agent dashboard',
          description: 'Built by the agent',
          panels: [],
          time_range: { from: 'now-7d', to: 'now' },
          refresh_interval: { pause: false, value: 60000 },
          query: { query: 'host.name: web-1', language: 'kuery' },
          filters: [],
          preserveSavedFilters: false,
          options: expect.objectContaining({ hide_panel_titles: true }),
          pinned_panels: [],
          dashboardId,
          viewMode: 'edit',
          changedBy: ['agent'],
        })
      );
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

  it('opens the saved dashboard of an attachment previewed on an empty unsaved dashboard', async () => {
    const dashboardApi = buildDashboardApi(undefined);
    const dashboardLocator = buildLocator();

    await handlePreview({
      attachment: buildAttachment('dashboard-2'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      appliedAttachments: createAppliedAttachmentsStore(),
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      checkSavedDashboardExist: async () => true,
    });

    expect(dashboardApi.setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardId: 'dashboard-2' })
    );
  });

  it('links the new dashboard it opens when the linked dashboard was deleted', async () => {
    const dashboardApi = buildDashboardApi(undefined, { 'panel-1': {} });
    const dashboardLocator = buildLocator();
    const appliedAttachments = createAppliedAttachmentsStore();

    await handlePreview({
      attachment: buildAttachment('deleted-dashboard'),
      dashboardApi: dashboardApi as unknown as DashboardApi,
      appliedAttachments,
      canWriteDashboards: true,
      isSidebar: true,
      dashboardLocator,
      checkSavedDashboardExist: async () => false,
    });
    const openedDashboardApi = buildDashboardApi(undefined) as unknown as DashboardApi;
    appliedAttachments.claimNextDashboardLink(openedDashboardApi);

    expect(dashboardApi.setState).not.toHaveBeenCalled();
    expect(dashboardLocator.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardId: undefined })
    );
    expect(appliedAttachments.getLinkedAttachmentId(openedDashboardApi)).toBe('attachment-1');
  });
});
