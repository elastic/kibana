/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  OPEN_DASHBOARD_PRETTIFY_ACTION_ID,
  type DashboardInternalApi,
  type OpenDashboardPrettifyActionContext,
} from '@kbn/dashboard-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import { createPrettifyDashboardAction } from './prettify_dashboard_action';

const grid = { x: 0, y: 0, w: 24, h: 15 };

const lensPanel = {
  type: LENS_EMBEDDABLE_TYPE,
  id: 'lens-1',
  grid,
  config: {
    type: 'metric',
    data_source: { type: 'data_view', id: 'logs-*' },
  },
};

const imageData = {
  file_id: 'file-1',
  name: 'dashboard-prettify.png',
  mime_type: 'image/png' as const,
};

const createDashboardApi = ({
  viewMode = 'edit',
  isEditableByUser = true,
  savedObjectId = 'dash-1',
  panels = [lensPanel],
}: {
  viewMode?: ViewMode;
  isEditableByUser?: boolean;
  savedObjectId?: string | undefined;
  panels?: unknown[];
} = {}): DashboardApi =>
  ({
    viewMode$: new BehaviorSubject<ViewMode>(viewMode),
    isEditableByUser,
    savedObjectId$: new BehaviorSubject<string | undefined>(savedObjectId),
    dataLoading$: new BehaviorSubject<boolean | undefined>(false),
    layout$: new BehaviorSubject({
      panels: {},
      pinnedPanels: {},
      sections: {},
    }),
    getSerializedState: () => ({
      attributes: {
        title: 'Metrics',
        panels,
      },
    }),
  } as unknown as DashboardApi);

const createInternalApi = (element: HTMLElement | null = document.createElement('div')) =>
  ({
    dashboardContainerRef$: new BehaviorSubject(element),
  } as unknown as DashboardInternalApi);

const context = (
  dashboardApi: DashboardApi,
  dashboardInternalApi: DashboardInternalApi = createInternalApi()
): OpenDashboardPrettifyActionContext => ({
  dashboardApi,
  dashboardInternalApi,
  trigger: { id: OPEN_DASHBOARD_PRETTIFY_ACTION_ID },
});

describe('createPrettifyDashboardAction', () => {
  const openChat = jest.fn() as jest.MockedFunction<AgentBuilderPluginStart['openChat']>;
  const captureDashboardImage = jest.fn();
  const uploadImage = jest.fn();
  const toasts = { addDanger: jest.fn() };

  const createAction = (canWriteDashboards = true) =>
    createPrettifyDashboardAction({
      openChat,
      canWriteDashboards,
      captureDashboardImage,
      uploadImage,
      toasts,
      waitForPaint: async () => undefined,
    });

  beforeEach(() => {
    openChat.mockClear();
    captureDashboardImage.mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    uploadImage.mockReset().mockResolvedValue(imageData);
    toasts.addDanger.mockClear();
  });

  it('uses the sparkles icon and Prettify label', () => {
    const action = createAction();
    const ctx = context(createDashboardApi());

    expect(action.getIconType?.(ctx)).toBe('sparkles');
    expect(action.getDisplayName?.(ctx)).toBe('Prettify');
  });

  it('is compatible in edit mode when the user can write and the dashboard has a visualization', async () => {
    const action = createAction();

    await expect(action.isCompatible?.(context(createDashboardApi()))).resolves.toBe(true);
  });

  it('is not compatible without write access', async () => {
    const action = createAction(false);

    await expect(action.isCompatible?.(context(createDashboardApi()))).resolves.toBe(false);
  });

  it('is not compatible when the dashboard is not editable by the user', async () => {
    const action = createAction();

    await expect(
      action.isCompatible?.(context(createDashboardApi({ isEditableByUser: false })))
    ).resolves.toBe(false);
  });

  it('is not compatible in view mode', async () => {
    const action = createAction();

    await expect(
      action.isCompatible?.(context(createDashboardApi({ viewMode: 'view' })))
    ).resolves.toBe(false);
  });

  it('opens a new dashboard chat with the live dashboard and captured image, then auto-sends Prettify', async () => {
    const action = createAction();
    const dashboardApi = createDashboardApi();
    const element = document.createElement('div');

    await action.execute(context(dashboardApi, createInternalApi(element)));

    expect(captureDashboardImage).toHaveBeenCalledWith(element);
    expect(uploadImage).toHaveBeenCalled();
    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: '/dashboard-management prettify this dashboard',
      autoSendInitialMessage: true,
      sessionTag: 'dashboard',
      attachments: [
        expect.objectContaining({
          type: DASHBOARD_ATTACHMENT_TYPE,
          origin: 'dash-1',
          data: expect.objectContaining({
            title: 'Metrics',
            panels: [expect.objectContaining({ id: 'lens-1', type: LENS_EMBEDDABLE_TYPE })],
          }),
        }),
        {
          type: AttachmentType.image,
          data: imageData,
        },
      ],
    });
  });

  it('does not start Prettify when capture fails', async () => {
    captureDashboardImage.mockRejectedValue(new Error('blank png'));
    const action = createAction();

    await action.execute(context(createDashboardApi()));

    expect(openChat).not.toHaveBeenCalled();
    expect(toasts.addDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Could not capture this dashboard',
        text: 'blank png',
      })
    );
  });

  it('does not start Prettify when the dashboard is not rendered', async () => {
    const action = createAction();

    await action.execute(context(createDashboardApi(), createInternalApi(null)));

    expect(captureDashboardImage).not.toHaveBeenCalled();
    expect(openChat).not.toHaveBeenCalled();
    expect(toasts.addDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Could not capture this dashboard',
      })
    );
  });

  it('restores collapsed sections after a failed capture', async () => {
    const layout$ = new BehaviorSubject({
      panels: {},
      pinnedPanels: {},
      sections: {
        s1: { collapsed: true, title: 'One', grid: { y: 0 } },
      },
    });
    const dashboardApi = {
      ...createDashboardApi(),
      layout$,
    } as DashboardApi;
    captureDashboardImage.mockRejectedValue(new Error('blank png'));
    const action = createAction();

    await action.execute(context(dashboardApi));

    expect(layout$.value.sections.s1.collapsed).toBe(true);
  });
});
