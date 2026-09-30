/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { AggregateQuery } from '@kbn/es-query';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { ActiveConversation, EmbeddableChatAccess } from '@kbn/agent-builder-browser';
import type { Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { REFINE_WITH_CHAT_ACTION_ID, type DashboardApi } from '@kbn/dashboard-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { IdGenerator } from '../attachment_types';
import { DASHBOARD_PANEL_REFINE_WITH_CHAT_CLICKED } from '../telemetry/event_types';
import {
  createRefineWithChatAction,
  REFINE_WITH_CHAT_INITIAL_MESSAGE,
  type RefineWithChatActionDeps,
} from './refine_with_chat_action';

const DRAFT_ID = 'draft-attachment-id';
const POINTER_ID = getDashboardPanelAttachmentId('panel-1');

const createDashboardApi = ({
  viewMode = 'edit',
  unsaved = false,
  panels = [],
}: { viewMode?: string; unsaved?: boolean; panels?: unknown[] } = {}): DashboardApi =>
  ({
    viewMode$: new BehaviorSubject(viewMode),
    savedObjectId$: new BehaviorSubject<string | undefined>(unsaved ? undefined : 'dash-1'),
    getSerializedState: () => ({ attributes: { title: 'Test', panels } }),
  } as unknown as DashboardApi);

const createEmbeddable = ({
  type = LENS_EMBEDDABLE_TYPE,
  parentApi,
  esql = [{ esql: 'FROM logs | LIMIT 10' }],
  untitled = false,
  typeDisplayName,
}: {
  type?: string;
  parentApi: unknown;
  esql?: AggregateQuery[];
  untitled?: boolean;
  typeDisplayName?: string;
}) => ({
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
    versions: [{ version: 1, data: { title: 'Test', panels: [] } }],
  } as unknown as VersionedAttachment);

const activeConversation = (attachments: VersionedAttachment[] = []): ActiveConversation => ({
  id: 'conversation-1',
  conversation: { id: 'conversation-1', attachments } as unknown as Conversation,
});

const expectedPointer = (dashboardAttachmentId: string, label = 'CPU usage') => ({
  id: POINTER_ID,
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  data: {
    dashboard_attachment_id: dashboardAttachmentId,
    panel_id: 'panel-1',
    label,
    panel_type: LENS_EMBEDDABLE_TYPE,
  },
});

const createAction = ({
  dashboardApi = createDashboardApi(),
  active = null,
  canWriteDashboards = true,
  access = { hasRequiredLicense: true, hasLlmConnector: true },
}: {
  dashboardApi?: DashboardApi;
  active?: ActiveConversation | null;
  canWriteDashboards?: boolean;
  access?: EmbeddableChatAccess;
} = {}) => {
  const openChat = jest.fn();
  const addAttachment = jest.fn();
  const reportEvent = jest.fn();
  const draftAttachmentId: IdGenerator = { current: DRAFT_ID, next: () => DRAFT_ID };
  const agentBuilder = {
    openChat,
    addAttachment,
    getAgentBuilderAccess: jest.fn(async () => access),
    events: {
      ui: { activeConversation$: new BehaviorSubject<ActiveConversation | null>(active) },
    },
  } as unknown as RefineWithChatActionDeps['agentBuilder'];
  const action = createRefineWithChatAction({
    agentBuilder,
    dashboardAppApi$: new BehaviorSubject<DashboardApi | undefined>(dashboardApi),
    analytics: { reportEvent } as unknown as AnalyticsServiceStart,
    canWriteDashboards,
    draftAttachmentId,
  });
  return { action, dashboardApi, openChat, addAttachment, reportEvent };
};

type Action = ReturnType<typeof createAction>['action'];
const isCompatible = (action: Action, embeddable: unknown) => action.isCompatible!({ embeddable });
const execute = (action: Action, embeddable: unknown) => action.execute({ embeddable });

describe('createRefineWithChatAction', () => {
  it('registers under the shared action id', () => {
    expect(createAction().action.id).toBe(REFINE_WITH_CHAT_ACTION_ID);
  });

  it('prefills the input with the dashboard management skill badge and a caret-able separator', () => {
    expect(REFINE_WITH_CHAT_INITIAL_MESSAGE).toBe(
      '[/dashboard-management](skill://dashboard-management)\u00A0'
    );
  });

  describe('isCompatible', () => {
    it('accepts an ES|QL Lens panel of the dashboard open in the app, in edit mode', async () => {
      const { action, dashboardApi } = createAction();

      await expect(
        isCompatible(action, createEmbeddable({ parentApi: dashboardApi }))
      ).resolves.toBe(true);
    });

    it('accepts a custom panel even without a query', async () => {
      const { action, dashboardApi } = createAction();

      await expect(
        isCompatible(
          action,
          createEmbeddable({
            type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
            parentApi: dashboardApi,
            esql: [],
          })
        )
      ).resolves.toBe(true);
    });

    it('rejects a Lens panel without an ES|QL query', async () => {
      const { action, dashboardApi } = createAction();

      await expect(
        isCompatible(action, createEmbeddable({ parentApi: dashboardApi, esql: [] }))
      ).resolves.toBe(false);
    });

    it('rejects other panel types', async () => {
      const { action, dashboardApi } = createAction();

      await expect(
        isCompatible(action, createEmbeddable({ type: 'markdown', parentApi: dashboardApi }))
      ).resolves.toBe(false);
    });

    it('rejects panels that do not belong to the dashboard open in the app', async () => {
      const { action } = createAction();

      await expect(
        isCompatible(action, createEmbeddable({ parentApi: createDashboardApi() }))
      ).resolves.toBe(false);
    });

    it('rejects panels in view mode', async () => {
      const { action, dashboardApi } = createAction({
        dashboardApi: createDashboardApi({ viewMode: 'view' }),
      });

      await expect(
        isCompatible(action, createEmbeddable({ parentApi: dashboardApi }))
      ).resolves.toBe(false);
    });

    it('rejects when the user cannot write dashboards', async () => {
      const { action, dashboardApi } = createAction({ canWriteDashboards: false });

      await expect(
        isCompatible(action, createEmbeddable({ parentApi: dashboardApi }))
      ).resolves.toBe(false);
    });

    it('rejects when agent builder has no LLM connector', async () => {
      const { action, dashboardApi } = createAction({
        access: { hasRequiredLicense: true, hasLlmConnector: false },
      });

      await expect(
        isCompatible(action, createEmbeddable({ parentApi: dashboardApi }))
      ).resolves.toBe(false);
    });
  });

  describe('execute', () => {
    it('opens a new conversation with the dashboard and the pointer when no chat is bound', async () => {
      const { action, dashboardApi, openChat, addAttachment, reportEvent } = createAction();

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment).not.toHaveBeenCalled();
      expect(openChat).toHaveBeenCalledWith({
        newConversation: true,
        sessionTag: 'dashboard',
        initialMessage: REFINE_WITH_CHAT_INITIAL_MESSAGE,
        autoSendInitialMessage: false,
        attachments: [
          expect.objectContaining({
            id: DRAFT_ID,
            type: DASHBOARD_ATTACHMENT_TYPE,
            origin: 'dash-1',
          }),
          expectedPointer(DRAFT_ID),
        ],
      });
      expect(reportEvent).toHaveBeenCalledWith(DASHBOARD_PANEL_REFINE_WITH_CHAT_CLICKED, {
        panel_type: LENS_EMBEDDABLE_TYPE,
        chat_state: 'new_conversation',
        is_saved_dashboard: true,
      });
    });

    it('points at the dashboard attachment linked to the open dashboard', async () => {
      const { action, dashboardApi, openChat, addAttachment, reportEvent } = createAction({
        active: activeConversation([linkedDashboardAttachment('dash-1')]),
      });

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(openChat).not.toHaveBeenCalled();
      expect(addAttachment).toHaveBeenCalledTimes(1);
      expect(addAttachment).toHaveBeenCalledWith(expectedPointer('linked-attachment-id'));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_REFINE_WITH_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'linked_attachment' })
      );
    });

    it('links an unsaved dashboard to an origin-less dashboard attachment', async () => {
      const { action, dashboardApi, addAttachment, reportEvent } = createAction({
        dashboardApi: createDashboardApi({ unsaved: true }),
        active: activeConversation([linkedDashboardAttachment(undefined)]),
      });

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment).toHaveBeenCalledTimes(1);
      expect(addAttachment).toHaveBeenCalledWith(expectedPointer('linked-attachment-id'));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_REFINE_WITH_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'linked_attachment', is_saved_dashboard: false })
      );
    });

    it('stages the dashboard under the draft id before the pointer when nothing is linked', async () => {
      const { action, dashboardApi, addAttachment, reportEvent } = createAction({
        active: activeConversation([linkedDashboardAttachment('another-dashboard')]),
      });

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment).toHaveBeenCalledTimes(2);
      expect(addAttachment).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: DRAFT_ID, type: DASHBOARD_ATTACHMENT_TYPE, origin: 'dash-1' })
      );
      expect(addAttachment).toHaveBeenNthCalledWith(2, expectedPointer(DRAFT_ID));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_REFINE_WITH_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'staged_attachment' })
      );
    });

    it('leaves the label empty for an untitled Lens panel', async () => {
      const { action, dashboardApi, openChat } = createAction();

      await execute(
        action,
        createEmbeddable({
          parentApi: dashboardApi,
          untitled: true,
          typeDisplayName: 'visualization',
        })
      );

      expect(openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [expect.anything(), expectedPointer(DRAFT_ID, '')],
        })
      );
    });

    it('derives the label of an untitled Lens panel from its chart config', async () => {
      const { action, dashboardApi, openChat } = createAction({
        dashboardApi: createDashboardApi({
          panels: [
            {
              type: LENS_EMBEDDABLE_TYPE,
              id: 'panel-1',
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: {
                type: 'metric',
                metrics: [{ type: 'primary', column: 'Total Web Requests' }],
                data_source: { type: 'esql', query: 'FROM logs | STATS c = COUNT(*)' },
              },
            },
          ],
        }),
      });

      await execute(action, createEmbeddable({ parentApi: dashboardApi, untitled: true }));

      expect(openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [expect.anything(), expectedPointer(DRAFT_ID, 'Total Web Requests')],
        })
      );
    });

    it('labels an untitled custom panel with its type display name', async () => {
      const { action, dashboardApi, openChat } = createAction();

      await execute(
        action,
        createEmbeddable({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          parentApi: dashboardApi,
          esql: [],
          untitled: true,
          typeDisplayName: 'Custom panel',
        })
      );

      expect(openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.anything(),
            expect.objectContaining({
              data: expect.objectContaining({
                label: 'Custom panel',
                panel_type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
              }),
            }),
          ],
        })
      );
    });

    it('does nothing when the panel is not compatible', async () => {
      const { action, dashboardApi, openChat, addAttachment, reportEvent } = createAction({
        dashboardApi: createDashboardApi({ viewMode: 'view' }),
      });

      await execute(action, createEmbeddable({ parentApi: dashboardApi }));

      expect(openChat).not.toHaveBeenCalled();
      expect(addAttachment).not.toHaveBeenCalled();
      expect(reportEvent).not.toHaveBeenCalled();
    });
  });
});
