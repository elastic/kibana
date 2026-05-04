/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type {
  ChatEvent,
  Conversation,
  RoundCompleteEvent,
  ConversationRound,
} from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_OPERATION } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import { registerDashboardAttachmentUiDefinition } from '.';

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: jest.fn(() => null),
}));

const createMockRoundCompleteEvent = (
  attachments: VersionedAttachment[],
  attachmentRefs: { attachment_id: string; operation: string }[]
): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: {
      input: {
        attachment_refs: attachmentRefs.map((ref) => ({
          attachment_id: ref.attachment_id,
          version: 1,
          operation: ref.operation as typeof ATTACHMENT_REF_OPERATION.updated,
        })),
      },
    } as ConversationRound,
    attachments,
  },
});

const createMockVersionedAttachment = (
  id: string,
  origin?: string,
  hasVersions = true
): VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE> => ({
  id,
  type: DASHBOARD_ATTACHMENT_TYPE,
  versions: hasVersions
    ? [
        {
          version: 1,
          data: { title: 'Updated Dashboard', description: '', panels: [] },
          created_at: new Date().toISOString(),
          content_hash: 'hash123',
        },
      ]
    : [],
  current_version: hasVersions ? 1 : 0,
  origin,
});

const createMockConversation = (
  id: string,
  attachments: VersionedAttachment[] | undefined
): Conversation => ({
  id,
  agent_id: 'test-agent',
  user: { id: 'user-1', username: 'user-1' },
  title: 'Test conversation',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  rounds: [],
  attachments,
});

const toVersionedDashboardAttachment = (
  attachment: DashboardAttachment
): VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE> => ({
  id: attachment.id,
  type: attachment.type,
  versions: [
    {
      version: 1,
      data: attachment.data,
      created_at: new Date().toISOString(),
      content_hash: 'hash123',
    },
  ],
  current_version: 1,
  origin: attachment.origin,
});

const createMockDashboardApi = (
  savedObjectId?: string
): DashboardApi & {
  setSavedObjectId: (id: string | undefined) => void;
  emitSave: (event: DashboardSaveEvent) => void;
  setState: jest.Mock;
  getSerializedState: jest.Mock;
} => {
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);
  const onSave$ = new Subject<DashboardSaveEvent>();
  const layout$ = new BehaviorSubject({});
  const title$ = new BehaviorSubject<string>('');
  const description$ = new BehaviorSubject<string | undefined>('');
  const filters$ = new BehaviorSubject<undefined>(undefined);
  const query$ = new BehaviorSubject<undefined>(undefined);
  const timeRange$ = new BehaviorSubject<undefined>(undefined);
  const projectRouting$ = new BehaviorSubject<undefined>(undefined);
  const hideTitle$ = new BehaviorSubject<boolean>(false);
  const hideBorder$ = new BehaviorSubject<boolean>(false);
  const children$ = new BehaviorSubject<Record<string, unknown>>({});
  const settings = {
    autoApplyFilters$: new BehaviorSubject<boolean>(true),
    syncColors$: new BehaviorSubject<boolean>(true),
    syncCursor$: new BehaviorSubject<boolean>(true),
    syncTooltips$: new BehaviorSubject<boolean>(true),
    useMargins$: new BehaviorSubject<boolean>(true),
  };
  const setState = jest.fn();
  const getSerializedState = jest.fn().mockReturnValue({ attributes: { title: '', panels: [] } });
  return {
    savedObjectId$,
    onSave$,
    layout$,
    title$,
    description$,
    filters$,
    query$,
    timeRange$,
    projectRouting$,
    hideTitle$,
    hideBorder$,
    children$,
    settings,
    setState,
    getSerializedState,
    setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
    emitSave: (event: DashboardSaveEvent) => onSave$.next(event),
  } as unknown as DashboardApi & {
    setSavedObjectId: (id: string | undefined) => void;
    emitSave: (event: DashboardSaveEvent) => void;
    setState: jest.Mock;
    getSerializedState: jest.Mock;
  };
};

const mockSavedDashboardState = {
  title: 'Saved Dashboard',
  description: '',
  panels: [],
} as unknown as DashboardSaveEvent['dashboardState'];

const createMockAttachment = (id: string, origin?: string) => {
  let currentOrigin = origin;
  const attachment: DashboardAttachment = {
    id,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: { title: 'Test Dashboard', description: '', panels: [] },
    origin: currentOrigin,
    hidden: false,
  };
  return {
    attachment,
    getAttachment: (): DashboardAttachment => ({
      ...attachment,
      origin: currentOrigin,
    }),
    setOrigin: (newOrigin: string | undefined) => {
      currentOrigin = newOrigin;
    },
  };
};

const flushAsyncServices = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('registerDashboardAttachmentUiDefinition', () => {
  let deps: ReturnType<typeof createMockDeps>;
  let uiDefinition: AttachmentUIDefinition<DashboardAttachment>;
  let unregister: () => void;
  let chat$: Subject<ChatEvent>;
  let currentAppId$: BehaviorSubject<string | null>;

  const createMockDeps = () => {
    chat$ = new Subject<ChatEvent>();
    currentAppId$ = new BehaviorSubject<string | null>('agentBuilder');
    const dashboardAppClientApi$ = new Subject<DashboardApi | undefined>();
    const addAttachmentType = jest.fn();
    const updateAttachmentOrigin = jest.fn().mockResolvedValue(undefined);
    const findDashboardsService = jest.fn().mockResolvedValue({
      findById: jest.fn().mockResolvedValue({ status: 'success' }),
    });
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    const emitConversationChange = (change: ActiveConversation) => {
      activeConversation$.next(change);
    };

    const mockAddAttachment = jest.fn();
    const agentBuilder: AgentBuilderPluginStart = {
      attachments: { addAttachmentType },
      addAttachment: mockAddAttachment,
      updateAttachmentOrigin,
      events: {
        chat$,
        ui: { activeConversation$: activeConversation$.asObservable() },
      },
    } as unknown as AgentBuilderPluginStart;

    const chrome: ChromeStart = {
      sidebar: {
        getCurrentAppId$: () => currentAppId$.asObservable(),
      },
    } as unknown as ChromeStart;

    const dashboardPlugin: DashboardStart = {
      dashboardAppClientApi$,
      findDashboardsService,
    } as unknown as DashboardStart;

    const data = dataPluginMock.createStartContract();

    const unifiedSearch: UnifiedSearchPublicPluginStart = {
      ui: { SearchBar: jest.fn() },
    } as unknown as UnifiedSearchPublicPluginStart;

    return {
      agentBuilder,
      chrome,
      addAttachment: mockAddAttachment,
      canWriteDashboards: true,
      data,
      dashboardPlugin,
      unifiedSearch,
      dashboardLocator: undefined,
      dashboardAppClientApi$,
      addAttachmentType,
      updateAttachmentOrigin,
      findDashboardsService,
      emitConversationChange,
      chat$,
      currentAppId$,
    };
  };

  const mountAttachment = async ({
    getAttachment,
    api,
    conversationId = 'conversation-1',
  }: {
    getAttachment: () => DashboardAttachment;
    api: DashboardApi;
    conversationId?: string;
  }) => {
    const attachment = getAttachment();
    uiDefinition.getActionButtons?.({
      attachment,
      isSidebar: false,
      isCanvas: false,
      openCanvas: jest.fn(),
      updateOrigin: (origin: string) =>
        deps.updateAttachmentOrigin(conversationId, attachment.id, origin),
    });

    deps.dashboardAppClientApi$.next(api);
    deps.emitConversationChange({
      id: conversationId,
      conversation: createMockConversation(conversationId, [
        toVersionedDashboardAttachment(attachment),
      ]),
    });

    await flushAsyncServices();

    return () => {
      deps.dashboardAppClientApi$.next(undefined);
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deps = createMockDeps();
    unregister = registerDashboardAttachmentUiDefinition(deps);
    uiDefinition = deps.addAttachmentType.mock.calls[0][1];
  });

  afterEach(() => {
    unregister();
  });

  it('registers dashboard attachment type with required methods', () => {
    expect(deps.addAttachmentType).toHaveBeenCalledWith(
      DASHBOARD_ATTACHMENT_TYPE,
      expect.objectContaining({
        getLabel: expect.any(Function),
        getIcon: expect.any(Function),
        renderCanvasContent: expect.any(Function),
        getActionButtons: expect.any(Function),
      })
    );
  });

  it('registers safely when dashboardAppClientApi$ emits synchronously on subscribe', () => {
    const dashboardAppClientApi$ = new BehaviorSubject<DashboardApi | undefined>(
      createMockDashboardApi() as unknown as DashboardApi
    );
    const addAttachmentType = jest.fn();
    const findDashboardsService = jest.fn().mockResolvedValue({
      findById: jest.fn().mockResolvedValue({ status: 'success' }),
    });

    const syncDeps = {
      agentBuilder: {
        attachments: { addAttachmentType },
        addAttachment: jest.fn(),
        updateAttachmentOrigin: jest.fn().mockResolvedValue(undefined),
        events: {
          chat$: new Subject<ChatEvent>(),
          ui: {
            activeConversation$: new BehaviorSubject<ActiveConversation | null>(
              null
            ).asObservable(),
          },
        },
      } as unknown as AgentBuilderPluginStart,
      chrome: {
        sidebar: {
          getCurrentAppId$: () => new BehaviorSubject<string | null>('agentBuilder').asObservable(),
        },
      } as unknown as ChromeStart,
      canWriteDashboards: true,
      dashboardLocator: undefined,
      dashboardPlugin: {
        dashboardAppClientApi$,
        findDashboardsService,
      } as unknown as DashboardStart,
      data: dataPluginMock.createStartContract(),
      unifiedSearch: {
        ui: { SearchBar: jest.fn() },
      } as unknown as UnifiedSearchPublicPluginStart,
    };

    let cleanup: (() => void) | undefined;
    expect(() => {
      cleanup = registerDashboardAttachmentUiDefinition(syncDeps);
    }).not.toThrow();
    cleanup?.();
  });

  describe('dashboard app integration - origin sync', () => {
    it('updates origin when new dashboard is saved', async () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = await mountAttachment({
        getAttachment,
        api: mockApi as unknown as DashboardApi,
      });

      // First save triggers update
      mockApi.emitSave({
        previousDashboardId: undefined,
        dashboardId: 'new-dashboard-id',
        dashboardState: mockSavedDashboardState,
      });
      await Promise.resolve();
      expect(deps.updateAttachmentOrigin).toHaveBeenCalledWith(
        'conversation-1',
        'attachment-1',
        'new-dashboard-id'
      );

      // Undefined doesn't trigger
      deps.updateAttachmentOrigin.mockClear();
      mockApi.emitSave({
        previousDashboardId: 'new-dashboard-id',
        dashboardId: undefined,
        dashboardState: mockSavedDashboardState,
      });
      await Promise.resolve();
      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();

      cleanup?.();
    });

    it('does not relink the attachment when an unrelated dashboard is saved', async () => {
      const { getAttachment } = createMockAttachment('attachment-1', 'original-dashboard-id');
      const mockApi = createMockDashboardApi('different-dashboard-id');

      const cleanup = await mountAttachment({
        getAttachment,
        api: mockApi as unknown as DashboardApi,
      });
      mockApi.emitSave({
        previousDashboardId: 'different-dashboard-id',
        dashboardId: 'newly-saved-id',
        dashboardState: mockSavedDashboardState,
      });
      await Promise.resolve();

      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('relinks to the current dashboard when the attachment origin points to a deleted dashboard', async () => {
      const { getAttachment } = createMockAttachment('attachment-1', 'deleted-dashboard-id');
      const mockApi = createMockDashboardApi('current-dashboard-id');

      deps.findDashboardsService.mockResolvedValue({
        findById: jest.fn().mockResolvedValue({ status: 'error' }),
      });
      unregister();
      unregister = registerDashboardAttachmentUiDefinition(deps);
      uiDefinition = deps.addAttachmentType.mock.calls.at(-1)?.[1];

      const cleanup = await mountAttachment({
        getAttachment,
        api: mockApi as unknown as DashboardApi,
      });

      mockApi.emitSave({
        previousDashboardId: 'current-dashboard-id',
        dashboardId: 'current-dashboard-id',
        dashboardState: mockSavedDashboardState,
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(deps.updateAttachmentOrigin).toHaveBeenCalledWith(
        'conversation-1',
        'attachment-1',
        'current-dashboard-id'
      );
      cleanup?.();
    });

    it('cleans up subscriptions properly', async () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = await mountAttachment({
        getAttachment,
        api: mockApi as unknown as DashboardApi,
      });
      cleanup?.();

      mockApi.setSavedObjectId('new-id-after-cleanup');
      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();
    });
  });

  describe('dashboard app integration - activation lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not attach the dashboard when navigating to a dashboard with an existing conversation already open', async () => {
      const mockApi = createMockDashboardApi();

      deps.emitConversationChange({
        id: 'conversation-1',
        conversation: createMockConversation('conversation-1', []),
      });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      await flushAsyncServices();
      jest.runOnlyPendingTimers();

      expect(deps.addAttachment).not.toHaveBeenCalled();
    });

    it('attaches the dashboard when navigating to a dashboard with a new conversation already open', async () => {
      const mockApi = createMockDashboardApi();

      deps.emitConversationChange({ id: undefined });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      await flushAsyncServices();
      jest.runOnlyPendingTimers();

      expect(deps.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DASHBOARD_ATTACHMENT_TYPE,
          origin: undefined,
        })
      );
    });

    it('does not attach the dashboard when opening an existing conversation from a dashboard', async () => {
      const mockApi = createMockDashboardApi();

      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      deps.emitConversationChange({
        id: 'conversation-1',
        conversation: createMockConversation('conversation-1', []),
      });
      await flushAsyncServices();
      jest.runOnlyPendingTimers();

      expect(deps.addAttachment).not.toHaveBeenCalled();
    });

    it('attaches the dashboard when opening a new conversation from a dashboard', async () => {
      const mockApi = createMockDashboardApi();

      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      deps.emitConversationChange({ id: undefined });
      await flushAsyncServices();
      jest.runOnlyPendingTimers();

      expect(deps.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DASHBOARD_ATTACHMENT_TYPE,
          origin: undefined,
        })
      );
    });

    it('waits for the chat to open before activating dashboard integration', async () => {
      const mockApi = createMockDashboardApi();

      deps.currentAppId$.next(null);
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      deps.emitConversationChange({ id: undefined });

      expect(deps.addAttachment).not.toHaveBeenCalled();

      deps.currentAppId$.next('agentBuilder');
      await flushAsyncServices();
      jest.runOnlyPendingTimers();

      expect(deps.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DASHBOARD_ATTACHMENT_TYPE,
          origin: undefined,
        })
      );
    });
  });

  describe('dashboard app integration - live changes from chat$', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('updates dashboard state on roundComplete with updated/created attachment', async () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = await mountAttachment({
        getAttachment,
        api: mockApi as unknown as DashboardApi,
      });

      // Updated operation triggers state update
      const versionedAttachment = createMockVersionedAttachment('attachment-1');
      chat$.next(
        createMockRoundCompleteEvent(
          [versionedAttachment],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );

      expect(mockApi.setState).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Dashboard' })
      );
      jest.runAllTimers();

      // Created operation also triggers
      mockApi.setState.mockClear();
      chat$.next(
        createMockRoundCompleteEvent(
          [versionedAttachment],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.created }]
        )
      );
      expect(mockApi.setState).toHaveBeenCalled();

      cleanup?.();
    });

    it('does not update state for read-only operations or missing attachments', async () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = await mountAttachment({
        getAttachment,
        api: mockApi as unknown as DashboardApi,
      });

      // Read operation - no update
      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('attachment-1')],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.read }]
        )
      );
      expect(mockApi.setState).not.toHaveBeenCalled();

      // No attachment in event - no update
      chat$.next(
        createMockRoundCompleteEvent(
          [],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(mockApi.setState).not.toHaveBeenCalled();

      // Attachment without versions - no update
      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('attachment-1', undefined, false)],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(mockApi.setState).not.toHaveBeenCalled();

      cleanup?.();
    });

    it('respects dashboard origin matching', async () => {
      // Different dashboard - no update
      const { getAttachment: getAttachment1 } = createMockAttachment(
        'attachment-1',
        'original-dashboard-id'
      );
      const mockApi1 = createMockDashboardApi('different-dashboard-id');

      const cleanup1 = await mountAttachment({
        getAttachment: getAttachment1,
        api: mockApi1 as unknown as DashboardApi,
      });

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('attachment-1', 'original-dashboard-id')],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(mockApi1.setState).not.toHaveBeenCalled();
      cleanup1?.();

      // Same dashboard - updates
      deps = createMockDeps();
      unregister();
      unregister = registerDashboardAttachmentUiDefinition(deps);
      uiDefinition = deps.addAttachmentType.mock.calls[0][1];

      const { getAttachment: getAttachment2 } = createMockAttachment(
        'attachment-1',
        'same-dashboard-id'
      );
      const mockApi2 = createMockDashboardApi('same-dashboard-id');

      const cleanup2 = await mountAttachment({
        getAttachment: getAttachment2,
        api: mockApi2 as unknown as DashboardApi,
      });

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('attachment-1', 'same-dashboard-id')],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(mockApi2.setState).toHaveBeenCalled();
      cleanup2?.();
    });

    it('cleans up chat$ subscription on cleanup or API unavailable', async () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = await mountAttachment({
        getAttachment,
        api: mockApi as unknown as DashboardApi,
      });

      // API becomes unavailable
      deps.dashboardAppClientApi$.next(undefined);
      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('attachment-1')],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(mockApi.setState).not.toHaveBeenCalled();

      // After cleanup
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      cleanup?.();
      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('attachment-1')],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(mockApi.setState).not.toHaveBeenCalled();
    });
  });

  describe('getLabel', () => {
    it('returns title or default', () => {
      expect(
        uiDefinition.getLabel({
          data: { title: 'My Dashboard', description: '', panels: [] },
        } as unknown as DashboardAttachment)
      ).toBe('My Dashboard');

      expect(
        uiDefinition.getLabel({
          data: { description: '', panels: [] },
        } as unknown as DashboardAttachment)
      ).toBe('New Dashboard');
    });
  });

  describe('getIcon', () => {
    it('returns productDashboard icon', () => {
      expect(uiDefinition.getIcon!()).toBe('productDashboard');
    });
  });

  describe('getActionButtons', () => {
    it('returns preview button only when not in canvas mode', () => {
      const { attachment } = createMockAttachment('1');

      const canvasButtons = uiDefinition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: true,
        updateOrigin: jest.fn(),
      });
      expect(canvasButtons).toEqual([]);

      const normalButtons = uiDefinition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });
      expect(normalButtons).toHaveLength(1);
      expect(normalButtons[0]).toMatchObject({ label: 'Preview', icon: 'eye' });
    });
  });
});
