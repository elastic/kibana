/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type {
  ChatEvent,
  Conversation,
  ConversationRound,
  RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import {
  ATTACHMENT_REF_OPERATION,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import { registerDashboardAppIntegration } from './dashboard_app_integration';
import type { IdGenerator } from '..';

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
  savedObjectId$: BehaviorSubject<string | undefined>;
  onSave$: Subject<DashboardSaveEvent>;
  layout$: BehaviorSubject<unknown>;
  children$: BehaviorSubject<Record<string, MockChildApi>>;
  title$: BehaviorSubject<string>;
  description$: BehaviorSubject<string>;
  filters$: BehaviorSubject<unknown[]>;
  query$: BehaviorSubject<unknown>;
  timeRange$: BehaviorSubject<unknown>;
  projectRouting$: BehaviorSubject<unknown>;
  hideTitle$: BehaviorSubject<boolean>;
  hideBorder$: BehaviorSubject<boolean>;
  settings?: {
    autoApplyFilters$?: BehaviorSubject<boolean>;
    syncColors$?: BehaviorSubject<boolean>;
    syncCursor$?: BehaviorSubject<boolean>;
    syncTooltips$?: BehaviorSubject<boolean>;
    useMargins$?: BehaviorSubject<boolean>;
  };
  setState: jest.Mock;
  getSerializedState: jest.Mock;
}

interface MockChildApi {
  uuid: string;
  hasUnsavedChanges$: BehaviorSubject<boolean>;
  resetUnsavedChanges: jest.Mock;
  serializeState: jest.Mock;
  applySerializedState: jest.Mock;
}

const createMockDashboardApi = (): MockDashboardApi => ({
  savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
  onSave$: new Subject<DashboardSaveEvent>(),
  layout$: new BehaviorSubject<unknown>([]),
  children$: new BehaviorSubject<Record<string, MockChildApi>>({
    'panel-1': {
      uuid: 'panel-1',
      hasUnsavedChanges$: new BehaviorSubject<boolean>(false),
      resetUnsavedChanges: jest.fn(),
      serializeState: jest.fn().mockReturnValue({}),
      applySerializedState: jest.fn(),
    },
  }),
  title$: new BehaviorSubject<string>('Test Dashboard'),
  description$: new BehaviorSubject<string>('Test Description'),
  filters$: new BehaviorSubject<unknown[]>([]),
  query$: new BehaviorSubject<unknown>({ query: '', language: 'kuery' }),
  timeRange$: new BehaviorSubject<unknown>({ from: 'now-15m', to: 'now' }),
  projectRouting$: new BehaviorSubject<unknown>(undefined),
  hideTitle$: new BehaviorSubject<boolean>(false),
  hideBorder$: new BehaviorSubject<boolean>(false),
  settings: {
    autoApplyFilters$: new BehaviorSubject<boolean>(true),
    syncColors$: new BehaviorSubject<boolean>(false),
    syncCursor$: new BehaviorSubject<boolean>(true),
    syncTooltips$: new BehaviorSubject<boolean>(true),
    useMargins$: new BehaviorSubject<boolean>(true),
  },
  setState: jest.fn(),
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

const createMockRoundCompleteEvent = (
  attachments: VersionedAttachment[],
  attachmentRefs: Array<{
    attachment_id: string;
    operation: typeof ATTACHMENT_REF_OPERATION.created | typeof ATTACHMENT_REF_OPERATION.updated;
  }>
): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: {
      input: {
        attachment_refs: attachmentRefs.map((ref) => ({
          attachment_id: ref.attachment_id,
          version: 1,
          operation: ref.operation,
        })),
      },
    } as ConversationRound,
    attachments,
  },
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
  let chat$: Subject<ChatEvent>;
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

  beforeEach(() => {
    jest.useFakeTimers();
    mockApi = createMockDashboardApi();
    chat$ = new Subject<ChatEvent>();
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

  const register = () => {
    const activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    const agentBuilder = {
      addAttachment,
      updateAttachmentOrigin,
      events: {
        chat$,
        ui: { activeConversation$: activeConversation$.asObservable() },
      },
    } as unknown as AgentBuilderPluginStart;

    emitConversationChange = (change) => {
      activeConversation$.next(createActiveConversation(change));
    };

    cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: mockApi as unknown as DashboardApi,
      draftAttachmentId,
      checkSavedDashboardExist,
      getUpdateOrigin,
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

    mockApi.title$.next('Updated Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dashboard-attachment-id',
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-1',
      })
    );
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

    mockApi.title$.next('Updated Title');
    jest.advanceTimersByTime(200);

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
    mockApi.title$.next('Updated Title');
    jest.advanceTimersByTime(200);

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
    mockApi.title$.next('Updated Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).not.toHaveBeenCalled();

    addAttachment.mockClear();
    emitConversationChange({ id: 'conversation-2', attachments: [] });

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('regenerates the pending attachment id after the draft attachment is created in a round', () => {
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
    chat$.next(
      createMockRoundCompleteEvent(
        [createVersionedAttachment(createDashboardAttachment({ id: firstDraftAttachment.id }))],
        [{ attachment_id: firstDraftAttachment.id, operation: ATTACHMENT_REF_OPERATION.created }]
      )
    );

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
