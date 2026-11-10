/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, skip, Subject } from 'rxjs';
import { ChatEventType, type ChatEvent, type Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import {
  MANUAL_CHANGES_DEBOUNCE_MS,
  registerDashboardAppIntegration,
} from './dashboard_app_integration';
import type { IdGenerator } from '..';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';

const createDashboardSaveState = (): DashboardSaveEvent['dashboardState'] => ({
  title: 'Saved Dashboard',
  description: '',
  panels: [],
  pinned_panels: [],
  options: {
    hide_panel_titles: false,
    hide_panel_borders: false,
    use_margins: true,
    auto_apply_filters: true,
    sync_colors: false,
    sync_cursor: true,
    sync_tooltips: false,
  },
});

interface MockDashboardApi {
  anyStateChange$: Observable<void>;
  savedObjectId$: BehaviorSubject<string | undefined>;
  onSave$: Subject<DashboardSaveEvent>;
  filters$: BehaviorSubject<unknown[]>;
  query$: BehaviorSubject<unknown>;
  timeRange$: BehaviorSubject<unknown>;
  getAppContext: () => { currentAppId: string };
  isEditableByUser: boolean;
  isManaged: boolean;
  setState: jest.Mock;
  setViewMode: jest.Mock;
  getSerializedState: jest.Mock;
}

const createMockDashboardApi = (anyStateChange$: Observable<void>): MockDashboardApi => ({
  anyStateChange$,
  savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
  onSave$: new Subject<DashboardSaveEvent>(),
  filters$: new BehaviorSubject<unknown[]>([]),
  query$: new BehaviorSubject<unknown>({ query: '', language: 'kuery' }),
  timeRange$: new BehaviorSubject<unknown>({ from: 'now-15m', to: 'now' }),
  getAppContext: () => ({ currentAppId: 'dashboards' }),
  isEditableByUser: true,
  isManaged: false,
  setState: jest.fn(),
  setViewMode: jest.fn(),
  getSerializedState: jest.fn().mockReturnValue({
    attributes: {
      title: 'Test Dashboard',
      description: 'Test Description',
      panels: [],
    },
  }),
});

const createVersionedAttachment = (
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

const createDashboardAttachment = (
  overrides?: Partial<DashboardAttachment>
): DashboardAttachment => ({
  id: 'dashboard-attachment-id',
  type: DASHBOARD_ATTACHMENT_TYPE,
  data: {
    title: 'Test Dashboard',
    description: 'Test Description',
    panels: [],
  },
  origin: undefined,
  ...overrides,
});

const createActiveConversation = ({
  id,
  attachments,
}: {
  id?: string;
  attachments?: VersionedAttachment[];
}): ActiveConversation => ({
  id,
  conversation: id
    ? ({
        id,
        agent_id: 'test-agent',
        user: { id: 'user-1', username: 'user-1' },
        title: 'Test conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rounds: [],
        attachments,
      } as Conversation)
    : undefined,
});

describe('registerDashboardAppIntegration', () => {
  let mockApi: MockDashboardApi;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;
  let addAttachment: jest.Mock;
  let updateAttachmentOrigin: jest.Mock;
  let getUpdateOrigin: jest.Mock;
  let checkSavedDashboardExist: jest.Mock;
  let draftAttachmentId: IdGenerator;
  let emitConversationChange: (change: {
    id?: string;
    attachments?: VersionedAttachment[];
  }) => void;
  let cleanup: () => void;
  let simulateDashboardStateChange: () => void;
  let toasts: ReturnType<typeof notificationServiceMock.createStartContract>['toasts'];

  beforeEach(() => {
    toasts = notificationServiceMock.createStartContract().toasts;
    const mockAnyStateChange$ = new BehaviorSubject(undefined);
    simulateDashboardStateChange = () => {
      mockAnyStateChange$.next(undefined);
    };
    jest.useFakeTimers();
    mockApi = createMockDashboardApi(mockAnyStateChange$.pipe(skip(1)));
    chatEventsByConversationId = new Map();
    addAttachment = jest.fn();
    updateAttachmentOrigin = jest.fn().mockResolvedValue(undefined);
    getUpdateOrigin = jest.fn(
      (attachmentId: string) => async (origin: string) =>
        updateAttachmentOrigin('conversation-1', attachmentId, origin)
    );
    checkSavedDashboardExist = jest.fn().mockResolvedValue(true);
    let currentDraftAttachmentId = 'draft-attachment-id-1';
    draftAttachmentId = {
      get current() {
        return currentDraftAttachmentId;
      },
      next: jest.fn(() => {
        currentDraftAttachmentId = 'draft-attachment-id-2';
        return currentDraftAttachmentId;
      }),
    };
  });

  afterEach(() => {
    cleanup?.();
    jest.useRealTimers();
  });

  const register = ({ linkedAttachmentId }: { linkedAttachmentId?: string } = {}) => {
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    const agentBuilder = {
      addAttachment,
      updateAttachmentOrigin,
      events: {
        getChatEvents$: jest.fn((conversationId: string) => {
          let chatEvents$ = chatEventsByConversationId.get(conversationId);

          if (!chatEvents$) {
            chatEvents$ = new Subject<ChatEvent>();
            chatEventsByConversationId.set(conversationId, chatEvents$);
          }

          return chatEvents$.asObservable();
        }),
        ui: { activeConversation$: activeConversation$.asObservable() },
      },
    } as unknown as AgentBuilderPluginStart;

    emitConversationChange = (change) => {
      activeConversation$.next(createActiveConversation(change));
    };

    cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: mockApi as unknown as DashboardApi,
      canWriteDashboards: true,
      toasts,
      draftAttachmentId,
      checkSavedDashboardExist,
      getUpdateOrigin,
      linkedAttachmentId,
      linkNextDashboard: jest.fn(),
    });
  };

  it('syncs manual dashboard changes for an existing dashboard attachment', () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    simulateDashboardStateChange();
    jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dashboard-attachment-id',
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-1',
      })
    );
  });

  it('stages the attachment of a managed dashboard without linking it to the dashboard', () => {
    mockApi.savedObjectId$.next('managed-dashboard');
    mockApi.isManaged = true;
    register();
    emitConversationChange({});

    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-attachment-id-1', origin: undefined })
    );
  });

  it('does not sync manual changes of a managed dashboard into an unlinked attachment of an existing conversation', () => {
    mockApi.savedObjectId$.next('managed-dashboard');
    mockApi.isManaged = true;
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(createDashboardAttachment())],
    });

    jest.runOnlyPendingTimers();
    simulateDashboardStateChange();
    jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('moves the origin of the attachment a new dashboard was opened from to it once saved', async () => {
    const attachment = createDashboardAttachment({ origin: 'managed-dashboard' });
    register({ linkedAttachmentId: attachment.id });
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'new-dashboard',
      dashboardState: createDashboardSaveState(),
    });
    await Promise.resolve();

    expect(updateAttachmentOrigin).toHaveBeenCalledWith(
      'conversation-1',
      'dashboard-attachment-id',
      'new-dashboard'
    );
  });

  it('syncs manual changes of a new dashboard into the attachment it was opened from', () => {
    const attachment = createDashboardAttachment({ origin: 'managed-dashboard' });
    register({ linkedAttachmentId: attachment.id });
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dashboard-attachment-id' })
    );
  });

  it('tells the user when the agent updated a different dashboard, until they leave this one', () => {
    const toast = { id: 'toast-1' };
    toasts.addInfo.mockReturnValue(toast);
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    chatEventsByConversationId.get('conversation-1')?.next({
      type: ChatEventType.toolUi,
      data: {
        tool_id: 'tool',
        tool_call_id: 'call',
        custom_event: DASHBOARD_UPDATED_UI_EVENT,
        data: { attachment: createDashboardAttachment({ origin: 'dashboard-2' }) },
      },
    } as unknown as ChatEvent);

    expect(mockApi.setState).not.toHaveBeenCalled();
    expect(toasts.addInfo).toHaveBeenCalledTimes(1);

    cleanup();

    expect(toasts.remove).toHaveBeenCalledWith(toast);
  });

  it('selects the matching existing dashboard attachment for manual sync', () => {
    mockApi.savedObjectId$.next('dashboard-2');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [
        createVersionedAttachment(
          createDashboardAttachment({
            id: 'dashboard-attachment-1',
            origin: 'dashboard-1',
          })
        ),
        createVersionedAttachment(
          createDashboardAttachment({
            id: 'dashboard-attachment-2',
            origin: 'dashboard-2',
          })
        ),
      ],
    });

    simulateDashboardStateChange();
    jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dashboard-attachment-2',
        origin: 'dashboard-2',
      })
    );
  });

  it('updates the persisted origin for an existing dashboard attachment on save', async () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    mockApi.onSave$.next({
      previousDashboardId: 'dashboard-1',
      dashboardId: 'dashboard-2',
      dashboardState: createDashboardSaveState(),
    });
    await Promise.resolve();

    expect(updateAttachmentOrigin).toHaveBeenCalledWith(
      'conversation-1',
      'dashboard-attachment-id',
      'dashboard-2'
    );
  });

  it('updates the first attachment whose saved origin no longer exists on save', async () => {
    checkSavedDashboardExist.mockImplementation(
      async (dashboardId: string) => dashboardId === 'dashboard-1'
    );
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [
        createVersionedAttachment(
          createDashboardAttachment({
            id: 'dashboard-attachment-1',
            origin: 'dashboard-1',
          })
        ),
        createVersionedAttachment(
          createDashboardAttachment({
            id: 'dashboard-attachment-2',
            origin: 'dashboard-2',
          })
        ),
      ],
    });

    mockApi.onSave$.next({
      previousDashboardId: 'dashboard-3',
      dashboardId: 'dashboard-4',
      dashboardState: createDashboardSaveState(),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(updateAttachmentOrigin).toHaveBeenCalledWith(
      'conversation-1',
      'dashboard-attachment-2',
      'dashboard-4'
    );
  });

  it('creates a new attachment from the current dashboard state when switching away from a conversation', () => {
    const attachment = createDashboardAttachment({ origin: 'dashboard-1' });
    mockApi.savedObjectId$.next('dashboard-1');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });

    jest.runOnlyPendingTimers();
    addAttachment.mockClear();
    simulateDashboardStateChange();
    jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).toHaveBeenCalledTimes(1);

    addAttachment.mockClear();
    emitConversationChange({ id: undefined, attachments: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-1',
        data: expect.any(Object),
      })
    );
  });

  it('does not create a pending attachment state until the dashboard changes', () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not create a pending attachment on save when none exists yet', async () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    addAttachment.mockClear();

    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'saved-dashboard-id',
      dashboardState: createDashboardSaveState(),
    });
    await Promise.resolve();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not create attachments when switching conversations without a draft', () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    expect(addAttachment).not.toHaveBeenCalled();

    addAttachment.mockClear();
    emitConversationChange({ id: 'conversation-2', attachments: [] });

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not create an unsaved attachment from manual changes in an existing conversation', () => {
    register();
    emitConversationChange({ id: 'conversation-1', attachments: [] });

    addAttachment.mockClear();
    simulateDashboardStateChange();
    jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(addAttachment).not.toHaveBeenCalled();

    addAttachment.mockClear();
    emitConversationChange({ id: 'conversation-2', attachments: [] });

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('regenerates the pending attachment id once the draft attachment is in the conversation', () => {
    register();

    emitConversationChange({ id: undefined, attachments: undefined });
    jest.runOnlyPendingTimers();

    const firstDraftAttachment = addAttachment.mock.calls[0]?.[0];
    expect(firstDraftAttachment).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
      })
    );

    addAttachment.mockClear();
    emitConversationChange({ id: 'conversation-1', attachments: [] });
    emitConversationChange({
      id: 'conversation-1',
      attachments: [
        createVersionedAttachment(createDashboardAttachment({ id: firstDraftAttachment.id })),
      ],
    });

    emitConversationChange({ id: undefined, attachments: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
      })
    );
    expect(addAttachment.mock.calls[0][0].id).not.toBe(firstDraftAttachment.id);
  });
});
