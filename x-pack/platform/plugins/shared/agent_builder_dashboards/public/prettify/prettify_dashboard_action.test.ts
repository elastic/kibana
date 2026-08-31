/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { EmbeddableChatAccess } from '@kbn/agent-builder-browser';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { PRETTIFY_DASHBOARD_ACTION_ID } from '@kbn/dashboard-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { IdGenerator } from '../attachment_types';
import {
  createPrettifyDashboardAction,
  PRETTIFY_DASHBOARD_PROMPT,
} from './prettify_dashboard_action';

const esqlLens = {
  type: LENS_EMBEDDABLE_TYPE,
  id: 'a',
  grid: { x: 0, y: 0, w: 24, h: 15 },
  config: {
    type: 'metric',
    data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
  },
};

const child = (usesEsql: boolean) => ({
  usesEsql$: new BehaviorSubject(usesEsql),
});

const layoutPanel = {
  type: LENS_EMBEDDABLE_TYPE,
  grid: { x: 0, y: 0, w: 24, h: 15 },
};

const createLayout = (panelIds: string[]) => ({
  panels: Object.fromEntries(panelIds.map((id) => [id, layoutPanel])),
  sections: {},
  pinnedPanels: {},
});

const createDashboardApi = ({
  viewMode = 'edit',
  children = { a: child(true) },
  panels = [esqlLens],
  layout = createLayout(Object.keys(children)),
}: {
  viewMode?: string;
  children?: Record<string, ReturnType<typeof child>>;
  panels?: unknown[];
  layout?: ReturnType<typeof createLayout>;
} = {}): DashboardApi =>
  ({
    viewMode$: new BehaviorSubject(viewMode),
    children$: new BehaviorSubject(children),
    layout$: new BehaviorSubject(layout),
    savedObjectId$: new BehaviorSubject('dash-1'),
    getSerializedState: () => ({
      attributes: {
        title: 'Test',
        panels,
      },
    }),
  } as unknown as DashboardApi);

const createDraftAttachmentId = (id = 'draft-attachment-id'): IdGenerator => ({
  current: id,
  next: () => id,
});

const createAction = ({
  openChat = jest.fn(),
  getAgentBuilderAccess = jest.fn(
    async (): Promise<EmbeddableChatAccess> => ({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    })
  ),
  canWriteDashboards = true,
  draftAttachmentId = createDraftAttachmentId(),
} = {}) => {
  return {
    openChat,
    getAgentBuilderAccess,
    action: createPrettifyDashboardAction({
      openChat,
      getAgentBuilderAccess,
      canWriteDashboards,
      draftAttachmentId,
    }),
  };
};

describe('createPrettifyDashboardAction', () => {
  it('is compatible when a child uses ES|QL', async () => {
    const { action } = createAction();

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi(),
      })
    ).resolves.toBe(true);
  });

  it('is compatible when at least one child uses ES|QL', async () => {
    const { action } = createAction();

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi({
          children: { a: child(true), c: child(false) },
        }),
      })
    ).resolves.toBe(true);
  });

  it('is incompatible when no child uses ES|QL', async () => {
    const { action } = createAction();

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi({
          children: { c: child(false) },
        }),
      })
    ).resolves.toBe(false);
  });

  it('is incompatible when there are no children', async () => {
    const { action } = createAction();

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi({
          children: {},
        }),
      })
    ).resolves.toBe(false);
  });

  it('is incompatible when an ES|QL child is not in layout$.panels', async () => {
    const { action } = createAction();

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi({
          children: { a: child(true) },
          layout: createLayout([]),
        }),
      })
    ).resolves.toBe(false);
  });

  it.each(['view', 'print', 'preview'] as const)('is incompatible in %s mode', async (viewMode) => {
    const { action } = createAction();

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi({ viewMode }),
      })
    ).resolves.toBe(false);
  });

  it('is incompatible without write access', async () => {
    const { action } = createAction({ canWriteDashboards: false });

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi(),
      })
    ).resolves.toBe(false);
  });

  it('is incompatible without a required license', async () => {
    const { action } = createAction({
      getAgentBuilderAccess: jest.fn(async () => ({
        hasRequiredLicense: false,
        hasLlmConnector: true,
      })),
    });

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi(),
      })
    ).resolves.toBe(false);
  });

  it('is incompatible without an LLM connector', async () => {
    const { action } = createAction({
      getAgentBuilderAccess: jest.fn(async () => ({
        hasRequiredLicense: true,
        hasLlmConnector: false,
      })),
    });

    await expect(
      action.isCompatible!({
        dashboardApi: createDashboardApi(),
      })
    ).resolves.toBe(false);
  });

  it('opens chat with a shared draft dashboard attachment', async () => {
    const draftAttachmentId = createDraftAttachmentId('shared-draft-id');
    const { action, openChat } = createAction({ draftAttachmentId });
    const dashboardApi = createDashboardApi();

    await action.execute!({
      dashboardApi,
    });

    expect(openChat).toHaveBeenCalledTimes(1);
    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: PRETTIFY_DASHBOARD_PROMPT,
      autoSendInitialMessage: true,
      sessionTag: 'dashboard',
      attachments: [
        {
          id: 'shared-draft-id',
          origin: 'dash-1',
          type: DASHBOARD_ATTACHMENT_TYPE,
          data: expect.objectContaining({
            title: 'Test',
            panels: [
              expect.objectContaining({
                id: 'a',
                type: LENS_EMBEDDABLE_TYPE,
              }),
            ],
          }),
        },
      ],
    });
  });

  it('does not open chat when the dashboard is ineligible', async () => {
    const { action, openChat } = createAction();

    await action.execute!({
      dashboardApi: createDashboardApi({
        children: { c: child(false) },
      }),
    });

    expect(openChat).not.toHaveBeenCalled();
  });

  it('uses the prettify action id', () => {
    const { action } = createAction();
    expect(action.id).toBe(PRETTIFY_DASHBOARD_ACTION_ID);
  });

  it('getCompatibilityChangesSubject emits when layout$.panels length changes', () => {
    const { action } = createAction();
    const dashboardApi = createDashboardApi();
    const next = jest.fn();
    const subscription = action.getCompatibilityChangesSubject!({ dashboardApi })?.subscribe(next);

    (dashboardApi.layout$ as BehaviorSubject<ReturnType<typeof createLayout>>).next(
      createLayout([])
    );

    expect(next).toHaveBeenCalledTimes(1);
    subscription?.unsubscribe();
  });

  it('getCompatibilityChangesSubject does not emit when a panel is only repositioned', () => {
    const { action } = createAction();
    const dashboardApi = createDashboardApi();
    const next = jest.fn();
    const subscription = action.getCompatibilityChangesSubject!({ dashboardApi })?.subscribe(next);

    (dashboardApi.layout$ as BehaviorSubject<ReturnType<typeof createLayout>>).next({
      panels: {
        a: { type: LENS_EMBEDDABLE_TYPE, grid: { x: 8, y: 4, w: 24, h: 15 } },
      },
      sections: {},
      pinnedPanels: {},
    });

    expect(next).not.toHaveBeenCalled();
    subscription?.unsubscribe();
  });
});
