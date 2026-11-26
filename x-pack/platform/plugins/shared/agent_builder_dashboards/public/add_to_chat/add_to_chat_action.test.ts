/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { AggregateQuery } from '@kbn/es-query';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { ActiveConversation } from '@kbn/agent-builder-browser';
import { AGENT_BUILDER_EVENT_TYPES, type Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { createStagedDashboards, type IdGenerator } from '../attachment_types';
import {
  createDashboardAddToChatAction,
  DASHBOARD_PANEL_ADD_TO_CHAT_PATHWAY,
  type DashboardAddToChatActionDeps,
} from './add_to_chat_action';

const DRAFT_ID = 'draft-attachment-id';
const pointerId = (dashboardAttachmentId: string) =>
  getDashboardPanelAttachmentId({ dashboardAttachmentId, panelId: 'panel-1' });

const metricPanel = {
  type: LENS_EMBEDDABLE_TYPE,
  id: 'panel-1',
  grid: { x: 0, y: 0, w: 24, h: 15 },
  config: {
    type: 'metric',
    metrics: [{ type: 'primary', column: 'Total Web Requests' }],
    data_source: { type: 'esql', query: 'FROM logs | STATS c = COUNT(*)' },
  },
};

const createDashboardApi = ({
  viewMode = 'edit',
  unsaved = false,
  managed = false,
  panels = [metricPanel],
}: {
  viewMode?: string;
  unsaved?: boolean;
  managed?: boolean;
  panels?: unknown[];
} = {}): DashboardApi =>
  ({
    viewMode$: new BehaviorSubject(viewMode),
    isEditableByUser: true,
    isManaged: managed,
    savedObjectId$: new BehaviorSubject<string | undefined>(unsaved ? undefined : 'dash-1'),
    getSerializedState: () => ({ attributes: { title: 'Test', panels } }),
    timeRange$: new BehaviorSubject({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
    }),
  } as unknown as DashboardApi);

interface EmbeddableOptions {
  type?: string;
  parentApi: unknown;
  esql?: AggregateQuery[];
  untitled?: boolean;
  typeDisplayName?: string;
}

const createEmbeddable = ({
  type = LENS_EMBEDDABLE_TYPE,
  parentApi,
  esql = [{ esql: 'FROM logs | LIMIT 10' }],
  untitled = false,
  typeDisplayName,
}: EmbeddableOptions) => ({
  type,
  uuid: 'panel-1',
  parentApi,
  esql$: new BehaviorSubject(esql),
  approximationApplied$: new BehaviorSubject<boolean | undefined>(undefined),
  title$: new BehaviorSubject<string | undefined>(untitled ? undefined : 'CPU usage'),
  hideTitle$: new BehaviorSubject(false),
  ...(typeDisplayName ? { getTypeDisplayName: () => typeDisplayName } : {}),
});

const linkedDashboardAttachment = (origin: string | undefined): VersionedAttachment =>
  ({
    id: 'linked-attachment-id',
    type: DASHBOARD_ATTACHMENT_TYPE,
    origin,
    current_version: 1,
    versions: [{ version: 1, data: { title: 'Test', panels: [metricPanel] } }],
  } as unknown as VersionedAttachment);

const activeConversation = (attachments: VersionedAttachment[] = []): ActiveConversation => ({
  id: 'conversation-1',
  conversation: { id: 'conversation-1', attachments } as unknown as Conversation,
});

const expectedPointer = (dashboardAttachmentId: string, label = 'CPU usage') => ({
  id: pointerId(dashboardAttachmentId),
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  data: {
    dashboard_attachment_id: dashboardAttachmentId,
    panel_id: 'panel-1',
    label,
    panel_type: LENS_EMBEDDABLE_TYPE,
    editable: true,
    time_range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
    request_id: expect.any(String),
  },
});

const createAction = ({
  dashboardApi = createDashboardApi(),
  active = null,
  canWriteDashboards = true,
}: {
  dashboardApi?: DashboardApi;
  active?: ActiveConversation | null;
  canWriteDashboards?: boolean;
} = {}) => {
  const openChat = jest.fn();
  const addAttachment = jest.fn();
  const reportEvent = jest.fn();
  const draftAttachmentId: IdGenerator = { current: DRAFT_ID, next: () => DRAFT_ID };
  const agentBuilder = {
    openChat,
    addAttachment,
    getAgentBuilderAccess: jest
      .fn()
      .mockResolvedValue({ hasRequiredLicense: true, hasLlmConnector: true }),
    events: {
      ui: { activeConversation$: new BehaviorSubject<ActiveConversation | null>(active) },
    },
  } as unknown as DashboardAddToChatActionDeps['agentBuilder'];
  const action = createDashboardAddToChatAction({
    agentBuilder,
    dashboardAppApi$: new BehaviorSubject<DashboardApi | undefined>(dashboardApi),
    analytics: { reportEvent } as unknown as AnalyticsServiceStart,
    areEqual: jest.fn().mockResolvedValue(true),
    canWriteDashboards,
    draftAttachmentId,
    nowProvider: { get: () => new Date() },
    stagedDashboards: createStagedDashboards(),
    toasts: { addWarning: jest.fn() } as unknown as DashboardAddToChatActionDeps['toasts'],
  });
  return { action, dashboardApi, openChat, addAttachment, reportEvent };
};

type Action = ReturnType<typeof createAction>['action'];
const context = (embeddable: unknown) =>
  ({ embeddable, trigger: { id: ON_OPEN_PANEL_MENU } } as Parameters<Action['execute']>[0]);
const isCompatible = async (action: Action, embeddable: unknown) =>
  action.isCompatible?.(context(embeddable));
const execute = (action: Action, embeddable: unknown) => action.execute(context(embeddable));
const expectReported = (reportEvent: jest.Mock, attachments: string[]) =>
  expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, {
    pathway: DASHBOARD_PANEL_ADD_TO_CHAT_PATHWAY,
    attachments,
  });

describe('createDashboardAddToChatAction', () => {
  it.each<[string, Parameters<typeof createAction>[0], Partial<EmbeddableOptions>, boolean]>([
    ['accepts an ES|QL Lens panel in edit mode', {}, {}, true],
    [
      'accepts an ES|QL Lens panel in view mode',
      { dashboardApi: createDashboardApi({ viewMode: 'view' }) },
      {},
      true,
    ],
    [
      'accepts a custom panel without a query',
      {},
      { type: CUSTOM_CONTENT_EMBEDDABLE_TYPE, esql: [] },
      true,
    ],
    ['accepts a Lens panel without an ES|QL query', {}, { esql: [] }, true],
    ['accepts a markdown panel', {}, { type: 'markdown', esql: [] }, true],
    ['accepts other panel types', {}, { type: 'visualization', esql: [] }, true],
    ['rejects panels of another dashboard', {}, { parentApi: createDashboardApi() }, false],
    ['accepts without dashboard write access', { canWriteDashboards: false }, {}, true],
  ])('isCompatible %s', async (_, actionOptions, embeddableOptions, expected) => {
    const { action, dashboardApi } = createAction(actionOptions);

    await expect(
      isCompatible(action, createEmbeddable({ parentApi: dashboardApi, ...embeddableOptions }))
    ).resolves.toBe(expected);
  });

  describe('execute', () => {
    it('opens a new conversation with the dashboard and the pointer when no chat is bound', async () => {
      const { action, dashboardApi, openChat, addAttachment, reportEvent } = createAction();

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment).not.toHaveBeenCalled();
      expect(openChat).toHaveBeenCalledWith({
        newConversation: true,
        sessionTag: 'dashboard',
        attachments: [
          expect.objectContaining({
            id: DRAFT_ID,
            type: DASHBOARD_ATTACHMENT_TYPE,
            origin: 'dash-1',
          }),
          expectedPointer(DRAFT_ID),
        ],
      });
      expectReported(reportEvent, [DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_PANEL_ATTACHMENT_TYPE]);
    });

    it.each([
      ['a saved dashboard to its attachment', false, 'dash-1'],
      ['an unsaved dashboard to an origin-less attachment', true, undefined],
    ])('points %s', async (_, unsaved, origin) => {
      const { action, dashboardApi, openChat, addAttachment, reportEvent } = createAction({
        dashboardApi: createDashboardApi({ unsaved }),
        active: activeConversation([linkedDashboardAttachment(origin)]),
      });

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(openChat).not.toHaveBeenCalled();
      expect(addAttachment.mock.calls).toEqual([[expectedPointer('linked-attachment-id')]]);
      expectReported(reportEvent, [DASHBOARD_PANEL_ATTACHMENT_TYPE]);
    });

    it.each([
      ['when nothing is linked', false, 'another-dashboard', 'dash-1'],
      ['without an origin when the dashboard is managed', true, 'dash-1', undefined],
    ])('stages the dashboard before the pointer %s', async (_, managed, linkedOrigin, origin) => {
      const { action, dashboardApi, addAttachment, reportEvent } = createAction({
        dashboardApi: createDashboardApi({ managed }),
        active: activeConversation([linkedDashboardAttachment(linkedOrigin)]),
      });

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment.mock.calls).toEqual([
        [expect.objectContaining({ id: DRAFT_ID, type: DASHBOARD_ATTACHMENT_TYPE, origin })],
        [expectedPointer(DRAFT_ID)],
      ]);
      expectReported(reportEvent, [DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_PANEL_ATTACHMENT_TYPE]);
    });

    it.each<[string, unknown[], Partial<EmbeddableOptions>, string, string]>([
      [
        'a fallback for an untitled Lens panel',
        [],
        { typeDisplayName: 'visualization' },
        'Visualization',
        LENS_EMBEDDABLE_TYPE,
      ],
      [
        'derived from the chart config of an untitled Lens panel',
        [metricPanel],
        {},
        'Total Web Requests',
        LENS_EMBEDDABLE_TYPE,
      ],
      [
        'the type display name of an untitled custom panel',
        [],
        { type: CUSTOM_CONTENT_EMBEDDABLE_TYPE, esql: [], typeDisplayName: 'Custom panel' },
        'Custom panel',
        CUSTOM_CONTENT_EMBEDDABLE_TYPE,
      ],
    ])('sets the label %s', async (_, panels, embeddableOptions, label, panelType) => {
      const { action, dashboardApi, openChat } = createAction({
        dashboardApi: createDashboardApi({ panels }),
      });

      await execute(
        action,
        createEmbeddable({ parentApi: dashboardApi, untitled: true, ...embeddableOptions })
      );

      expect(openChat.mock.calls[0][0].attachments[1].data).toMatchObject({
        label,
        panel_type: panelType,
      });
    });

    it('does nothing when the panel is not compatible', async () => {
      const { action, openChat, addAttachment, reportEvent } = createAction();

      await execute(action, createEmbeddable({ parentApi: createDashboardApi() }));

      expect(openChat).not.toHaveBeenCalled();
      expect(addAttachment).not.toHaveBeenCalled();
      expect(reportEvent).not.toHaveBeenCalled();
    });
  });
});
