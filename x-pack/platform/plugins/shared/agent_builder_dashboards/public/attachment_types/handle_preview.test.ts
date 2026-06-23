/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { handlePreview } from './handle_preview';
import { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment';

jest.mock('./dashboard_integration/preview_attachment', () => ({
  previewAttachmentInDashboard: jest.fn(),
}));

const attachment: DashboardAttachment = {
  id: 'attachment-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  data: { title: 'Test Dashboard', description: '', panels: [] },
  hidden: false,
};

describe('handlePreview', () => {
  const dashboardApi = {} as DashboardApi;
  const checkSavedDashboardExist = jest.fn();
  const openCanvas = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs to the dashboard app when dashboardApi is available', async () => {
    await handlePreview({
      attachment,
      dashboardApi,
      canWriteDashboards: true,
      isSidebar: false,
      checkSavedDashboardExist,
      openCanvas,
    });

    expect(previewAttachmentInDashboard).toHaveBeenCalled();
    expect(openCanvas).not.toHaveBeenCalled();
  });

  it('opens canvas in agent-first chrome even when dashboardApi is available', async () => {
    await handlePreview({
      attachment,
      dashboardApi,
      canWriteDashboards: true,
      isSidebar: false,
      checkSavedDashboardExist,
      openCanvas,
      preferCanvasPreview: true,
    });

    expect(previewAttachmentInDashboard).not.toHaveBeenCalled();
    expect(openCanvas).toHaveBeenCalled();
  });
});
