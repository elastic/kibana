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
import type { Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createCanvasDashboardRegistry, type IdGenerator } from '../attachment_types';
import { DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED } from '../telemetry/event_types';
import {
  createDashboardAddToChatProvider,
  DASHBOARD_PANEL_ADD_TO_CHAT_PROVIDER_ID,
  type DashboardAddToChatProviderDeps,
} from './add_to_chat_provider';

const DRAFT_ID = 'draft-attachment-id';
const pointerId = (dashboardAttachmentId: string) =>
  getDashboardPanelAttachmentId({ dashboardAttachmentId, panelId: 'panel-1' });

const createDashboardApi = ({
  viewMode = 'edit',
  unsaved = false,
  managed = false,
  panels = [],
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
  id: pointerId(dashboardAttachmentId),
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  data: {
    dashboard_attachment_id: dashboardAttachmentId,
    panel_id: 'panel-1',
    label,
    panel_type: LENS_EMBEDDABLE_TYPE,
  },
});

const CANVAS_ATTACHMENT_ID = 'canvas-attachment-id';

const createProvider = ({
  dashboardApi = createDashboardApi(),
  canvasDashboardApi,
  closeCanvas = jest.fn(),
  active = null,
  canWriteDashboards = true,
}: {
  dashboardApi?: DashboardApi;
  canvasDashboardApi?: DashboardApi;
  closeCanvas?: () => void;
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
    events: {
      ui: { activeConversation$: new BehaviorSubject<ActiveConversation | null>(active) },
    },
  } as unknown as DashboardAddToChatProviderDeps['agentBuilder'];
  const canvasDashboards = createCanvasDashboardRegistry();
  if (canvasDashboardApi) {
    canvasDashboards.register(canvasDashboardApi, {
      attachmentId: CANVAS_ATTACHMENT_ID,
      closeCanvas,
    });
  }
  const provider = createDashboardAddToChatProvider({
    agentBuilder,
    dashboardAppApi$: new BehaviorSubject<DashboardApi | undefined>(dashboardApi),
    canvasDashboards,
    analytics: { reportEvent } as unknown as AnalyticsServiceStart,
    canWriteDashboards,
    draftAttachmentId,
  });
  return { provider, dashboardApi, openChat, addAttachment, reportEvent };
};

type Provider = ReturnType<typeof createProvider>['provider'];
const isCompatible = async (provider: Provider, embeddable: unknown) =>
  provider.isCompatible(embeddable);
const execute = (provider: Provider, embeddable: unknown) => provider.execute(embeddable);

describe('createDashboardAddToChatProvider', () => {
  it('reports the dashboard panel pathway', () => {
    expect(createProvider().provider.id).toBe(DASHBOARD_PANEL_ADD_TO_CHAT_PROVIDER_ID);
  });

  describe('isCompatible', () => {
    it('accepts an ES|QL Lens panel of the dashboard open in the app, in edit mode', async () => {
      const { provider, dashboardApi } = createProvider();

      await expect(
        isCompatible(provider, createEmbeddable({ parentApi: dashboardApi }))
      ).resolves.toBe(true);
    });

    it('accepts a custom panel even without a query', async () => {
      const { provider, dashboardApi } = createProvider();

      await expect(
        isCompatible(
          provider,
          createEmbeddable({
            type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
            parentApi: dashboardApi,
            esql: [],
          })
        )
      ).resolves.toBe(true);
    });

    it('rejects a Lens panel without an ES|QL query', async () => {
      const { provider, dashboardApi } = createProvider();

      await expect(
        isCompatible(provider, createEmbeddable({ parentApi: dashboardApi, esql: [] }))
      ).resolves.toBe(false);
    });

    it('rejects other panel types', async () => {
      const { provider, dashboardApi } = createProvider();

      await expect(
        isCompatible(provider, createEmbeddable({ type: 'markdown', parentApi: dashboardApi }))
      ).resolves.toBe(false);
    });

    it('rejects panels that do not belong to the dashboard open in the app or the canvas', async () => {
      const { provider } = createProvider();

      await expect(
        isCompatible(provider, createEmbeddable({ parentApi: createDashboardApi() }))
      ).resolves.toBe(false);
    });

    it('accepts panels in view mode', async () => {
      const { provider, dashboardApi } = createProvider({
        dashboardApi: createDashboardApi({ viewMode: 'view' }),
      });

      await expect(
        isCompatible(provider, createEmbeddable({ parentApi: dashboardApi }))
      ).resolves.toBe(true);
    });

    it('accepts panels of a dashboard rendered in the chat canvas', async () => {
      const canvasDashboardApi = createDashboardApi({ viewMode: 'view' });
      const { provider } = createProvider({ canvasDashboardApi });

      await expect(
        isCompatible(provider, createEmbeddable({ parentApi: canvasDashboardApi }))
      ).resolves.toBe(true);
    });

    it('rejects when the user cannot write dashboards', async () => {
      const { provider, dashboardApi } = createProvider({ canWriteDashboards: false });

      await expect(
        isCompatible(provider, createEmbeddable({ parentApi: dashboardApi }))
      ).resolves.toBe(false);
    });
  });

  describe('execute', () => {
    it('opens a new conversation with the dashboard and the pointer when no chat is bound', async () => {
      const { provider, dashboardApi, openChat, addAttachment, reportEvent } = createProvider();

      const result = await execute(provider, createEmbeddable({ parentApi: dashboardApi }));

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
      expect(reportEvent).toHaveBeenCalledWith(DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED, {
        panel_type: LENS_EMBEDDABLE_TYPE,
        chat_state: 'new_conversation',
        is_saved_dashboard: true,
      });
      expect(result).toEqual({
        attachmentTypes: [DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_PANEL_ATTACHMENT_TYPE],
      });
    });

    it('points at the dashboard attachment linked to the open dashboard', async () => {
      const { provider, dashboardApi, openChat, addAttachment, reportEvent } = createProvider({
        active: activeConversation([linkedDashboardAttachment('dash-1')]),
      });

      await execute(provider, createEmbeddable({ parentApi: dashboardApi }));

      expect(openChat).not.toHaveBeenCalled();
      expect(addAttachment).toHaveBeenCalledTimes(1);
      expect(addAttachment).toHaveBeenCalledWith(expectedPointer('linked-attachment-id'));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'linked_attachment' })
      );
    });

    it('links an unsaved dashboard to an origin-less dashboard attachment', async () => {
      const { provider, dashboardApi, addAttachment, reportEvent } = createProvider({
        dashboardApi: createDashboardApi({ unsaved: true }),
        active: activeConversation([linkedDashboardAttachment(undefined)]),
      });

      await execute(provider, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment).toHaveBeenCalledTimes(1);
      expect(addAttachment).toHaveBeenCalledWith(expectedPointer('linked-attachment-id'));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'linked_attachment', is_saved_dashboard: false })
      );
    });

    it('stages the dashboard under the draft id before the pointer when nothing is linked', async () => {
      const { provider, dashboardApi, addAttachment, reportEvent } = createProvider({
        active: activeConversation([linkedDashboardAttachment('another-dashboard')]),
      });

      await execute(provider, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment).toHaveBeenCalledTimes(2);
      expect(addAttachment).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: DRAFT_ID, type: DASHBOARD_ATTACHMENT_TYPE, origin: 'dash-1' })
      );
      expect(addAttachment).toHaveBeenNthCalledWith(2, expectedPointer(DRAFT_ID));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'staged_attachment' })
      );
    });

    it('stages a managed dashboard without an origin instead of pointing at its attachment', async () => {
      const { provider, dashboardApi, addAttachment, reportEvent } = createProvider({
        dashboardApi: createDashboardApi({ managed: true }),
        active: activeConversation([linkedDashboardAttachment('dash-1')]),
      });

      await execute(provider, createEmbeddable({ parentApi: dashboardApi }));

      expect(addAttachment).toHaveBeenCalledTimes(2);
      expect(addAttachment).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: DRAFT_ID,
          type: DASHBOARD_ATTACHMENT_TYPE,
          origin: undefined,
        })
      );
      expect(addAttachment).toHaveBeenNthCalledWith(2, expectedPointer(DRAFT_ID));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'staged_attachment' })
      );
    });

    it('points at the dashboard attachment a canvas panel belongs to', async () => {
      const canvasDashboardApi = createDashboardApi({ viewMode: 'view' });
      const { provider, openChat, addAttachment, reportEvent } = createProvider({
        canvasDashboardApi,
        active: activeConversation(),
      });

      const result = await execute(provider, createEmbeddable({ parentApi: canvasDashboardApi }));

      expect(openChat).not.toHaveBeenCalled();
      expect(addAttachment).toHaveBeenCalledTimes(1);
      expect(addAttachment).toHaveBeenCalledWith(expectedPointer(CANVAS_ATTACHMENT_ID));
      expect(reportEvent).toHaveBeenCalledWith(
        DASHBOARD_PANEL_ADD_TO_CHAT_CLICKED,
        expect.objectContaining({ chat_state: 'canvas' })
      );
      expect(result).toEqual({ attachmentTypes: [DASHBOARD_PANEL_ATTACHMENT_TYPE] });
    });

    it('closes the canvas after adding the pointer so the chat input shows it', async () => {
      const canvasDashboardApi = createDashboardApi({ viewMode: 'view' });
      const closeCanvas = jest.fn();
      const { provider, addAttachment } = createProvider({ canvasDashboardApi, closeCanvas });

      await execute(provider, createEmbeddable({ parentApi: canvasDashboardApi }));

      expect(addAttachment).toHaveBeenCalledWith(expectedPointer(CANVAS_ATTACHMENT_ID));
      expect(closeCanvas).toHaveBeenCalledTimes(1);
    });

    it('leaves the label empty for an untitled Lens panel', async () => {
      const { provider, dashboardApi, openChat } = createProvider();

      await execute(
        provider,
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
      const { provider, dashboardApi, openChat } = createProvider({
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

      await execute(provider, createEmbeddable({ parentApi: dashboardApi, untitled: true }));

      expect(openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [expect.anything(), expectedPointer(DRAFT_ID, 'Total Web Requests')],
        })
      );
    });

    it('labels an untitled custom panel with its type display name', async () => {
      const { provider, dashboardApi, openChat } = createProvider();

      await execute(
        provider,
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
      const { provider, dashboardApi, openChat, addAttachment, reportEvent } = createProvider({
        canWriteDashboards: false,
      });

      await execute(provider, createEmbeddable({ parentApi: dashboardApi }));

      expect(openChat).not.toHaveBeenCalled();
      expect(addAttachment).not.toHaveBeenCalled();
      expect(reportEvent).not.toHaveBeenCalled();
    });
  });
});
