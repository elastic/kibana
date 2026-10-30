/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omit } from 'lodash';
import type { Observable } from 'rxjs';
import { BehaviorSubject, skip, Subject } from 'rxjs';
import { ChatEventType, type ChatEvent, type Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_UPDATED_UI_EVENT } from '../../../common';
import { registerDashboardAppIntegration } from './dashboard_app_integration';
import { applyAttachmentToDashboard, MANUAL_CHANGES_DEBOUNCE_MS } from './apply_attachment';
import {
  createAppliedAttachmentsStore,
  toShownVersionKey,
  type AppliedAttachmentsStore,
} from './applied_attachments_store';
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
  anyStateChange$: Observable<void>;
  hasUnsavedChanges$: BehaviorSubject<boolean>;
  savedObjectId$: BehaviorSubject<string | undefined>;
  onSave$: Subject<DashboardSaveEvent>;
  filters$: BehaviorSubject<unknown[]>;
  query$: BehaviorSubject<unknown>;
  timeRange$: BehaviorSubject<unknown>;
  children$: BehaviorSubject<{ [id: string]: unknown }>;
  diffStates: jest.Mock;
  layout$: BehaviorSubject<{ panels: object; pinnedPanels: object }>;
  getChildApi: jest.Mock;
  setState: jest.Mock;
  getSerializedState: jest.Mock;
}

const createMockDashboardApi = (anyStateChange$: Observable<void>): MockDashboardApi => ({
  anyStateChange$,
  hasUnsavedChanges$: new BehaviorSubject(false),
  savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
  onSave$: new Subject<DashboardSaveEvent>(),
  filters$: new BehaviorSubject<unknown[]>([]),
  query$: new BehaviorSubject<unknown>({ query: '', language: 'kuery' }),
  timeRange$: new BehaviorSubject<unknown>({ from: 'now-15m', to: 'now' }),
  children$: new BehaviorSubject({}),
  diffStates: jest.fn((baseline: unknown, current: unknown) =>
    isEqual(baseline, current) ? {} : current
  ),
  layout$: new BehaviorSubject({ panels: {}, pinnedPanels: {} }),
  getChildApi: jest.fn(),
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
  let draftAttachmentId: IdGenerator;
  let emitConversationChange: (change: {
    id?: string;
    attachments?: VersionedAttachment[];
  }) => void;
  let cleanup: () => void;
  let simulateDashboardStateChange: () => void;
  let emitDashboardStateChange: () => void;
  let removeAttachment: jest.Mock;
  let appliedAttachments: AppliedAttachmentsStore;
  let notifyOtherDashboardUpdated: jest.Mock;

  beforeEach(() => {
    const mockAnyStateChange$ = new BehaviorSubject(undefined);
    simulateDashboardStateChange = () => {
      mockApi.hasUnsavedChanges$.next(true);
      mockApi.getSerializedState.mockReturnValue({
        attributes: {
          title: 'Edited Dashboard',
          description: 'Test Description',
          panels: [],
        },
      });
      mockAnyStateChange$.next(undefined);
    };
    emitDashboardStateChange = () => {
      mockAnyStateChange$.next(undefined);
    };
    jest.useFakeTimers();
    mockApi = createMockDashboardApi(mockAnyStateChange$.pipe(skip(1)));
    chatEventsByConversationId = new Map();
    addAttachment = jest.fn();
    removeAttachment = jest.fn();
    updateAttachmentOrigin = jest.fn().mockResolvedValue(undefined);
    getUpdateOrigin = jest.fn(
      (attachmentId: string) => async (origin: string) =>
        updateAttachmentOrigin('conversation-1', attachmentId, origin)
    );
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
      removeAttachment,
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

    appliedAttachments = createAppliedAttachmentsStore();
    notifyOtherDashboardUpdated = jest.fn();
    cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: mockApi as unknown as DashboardApi,
      draftAttachmentId,
      appliedAttachments,
      getUpdateOrigin,
      notifyOtherDashboardUpdated,
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

  it('updates the linked attachment when an unsaved dashboard is saved', async () => {
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
          })
        ),
      ],
    });
    jest.runOnlyPendingTimers();

    mockApi.onSave$.next({
      previousDashboardId: undefined,
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
    expect(updateAttachmentOrigin).toHaveBeenCalledTimes(1);
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

  it('stages a pending version when the dashboard differs from the last attachment', () => {
    // The save button compares the open dashboard with the saved dashboard. A clean save
    // button does not mean the open dashboard matches the chat attachment.
    mockApi.savedObjectId$.next('dashboard-1');
    mockApi.hasUnsavedChanges$.next(false);
    mockApi.getSerializedState.mockReturnValue({
      attributes: {
        title: 'Test Dashboard',
        description: 'Test Description',
        panels: [{ id: 'panel-added-on-save', type: 'lens', grid: { x: 0, y: 0, w: 12, h: 8 } }],
      },
    });
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [
        createVersionedAttachment(createDashboardAttachment({ origin: 'dashboard-1' })),
      ],
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(appliedAttachments.shownVersions$.getValue()).toEqual(new Set());
  });

  it('drops the pending version when the dashboard matches the last attachment again', () => {
    const openSection = {
      id: 'section-1',
      title: 'Logs',
      collapsed: false,
      grid: { y: 0 },
      panels: [],
    };
    const attachment = createDashboardAttachment({
      origin: 'dashboard-1',
      data: {
        title: 'Test Dashboard',
        description: 'Test Description',
        panels: [openSection],
      },
    });
    mockApi.savedObjectId$.next('dashboard-1');
    mockApi.getSerializedState.mockReturnValue({
      attributes: {
        title: 'Test Dashboard',
        description: 'Test Description',
        panels: [openSection],
      },
    });
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [createVersionedAttachment(attachment)],
    });
    jest.runOnlyPendingTimers();
    expect(addAttachment).not.toHaveBeenCalled();
    expect(appliedAttachments.shownVersions$.getValue()).toEqual(
      new Set([toShownVersionKey('dashboard-attachment-id', 1)])
    );

    mockApi.getSerializedState.mockReturnValue({
      attributes: {
        title: 'Test Dashboard',
        description: 'Test Description',
        panels: [{ ...openSection, collapsed: true }],
      },
    });
    emitDashboardStateChange();
    jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);
    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(appliedAttachments.shownVersions$.getValue()).toEqual(new Set());

    addAttachment.mockClear();
    removeAttachment.mockClear();
    mockApi.getSerializedState.mockReturnValue({
      attributes: {
        title: 'Test Dashboard',
        description: 'Test Description',
        panels: [openSection],
      },
    });
    emitDashboardStateChange();
    jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

    expect(removeAttachment).toHaveBeenCalledWith('dashboard-attachment-id');
    expect(addAttachment).not.toHaveBeenCalled();
    expect(appliedAttachments.shownVersions$.getValue()).toEqual(
      new Set([toShownVersionKey('dashboard-attachment-id', 1)])
    );
  });

  describe('previewing the latest version on an unsaved dashboard', () => {
    // once applied, the dashboard fills in what the agent left out: a paused refresh interval for
    // the time range, and panel settings that the dashboard's panel comparators treat as defaults
    const defaultPanelSettings = { open_links_in_new_tab: false };
    const withoutPanelSettings = (state: { panels?: Array<{ config?: object }> }) => ({
      ...state,
      panels: state.panels?.map(({ config, ...panel }) => ({
        ...panel,
        config: omit(config, 'settings'),
      })),
    });
    const agentAttachment = createDashboardAttachment({
      data: {
        title: 'Agent Dashboard',
        description: 'Written by the agent',
        panels: [
          {
            type: 'markdown',
            id: 'panel-1',
            grid: { x: 0, y: 0, w: 12, h: 8 },
            config: { content: '# Logs' },
          },
        ],
        time_range: { from: 'now-7d', to: 'now' },
      },
    });

    const previewAgentAttachment = async () => {
      mockApi.diffStates.mockImplementation((baseline, current) =>
        isEqual(withoutPanelSettings(baseline), withoutPanelSettings(current)) ? {} : current
      );
      mockApi.setState.mockImplementation(async (dashboardState) => {
        mockApi.getSerializedState.mockReturnValue({
          attributes: {
            ...dashboardState,
            panels: dashboardState.panels.map((panel: { config: object }) => ({
              ...panel,
              config: { ...panel.config, settings: defaultPanelSettings },
            })),
            refresh_interval: { pause: true, value: 60000 },
          },
        });
        emitDashboardStateChange();
      });
      register();
      emitConversationChange({
        id: 'conversation-1',
        attachments: [createVersionedAttachment(agentAttachment)],
      });
      jest.runOnlyPendingTimers();

      const applied = applyAttachmentToDashboard({
        store: appliedAttachments,
        api: mockApi as unknown as DashboardApi,
        attachment: agentAttachment,
      });
      await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS * 2);
      await applied;
    };

    it('marks the previewed version as shown', async () => {
      await previewAgentAttachment();

      expect(appliedAttachments.shownVersions$.getValue()).toEqual(
        new Set([toShownVersionKey('dashboard-attachment-id', 1)])
      );
    });

    it('drops the pending version staged before the preview', async () => {
      await previewAgentAttachment();

      expect(removeAttachment).toHaveBeenLastCalledWith('dashboard-attachment-id');
    });

    it('stages a pending version again once the user edits the previewed dashboard', async () => {
      await previewAgentAttachment();
      addAttachment.mockClear();

      simulateDashboardStateChange();
      await jest.advanceTimersByTimeAsync(MANUAL_CHANGES_DEBOUNCE_MS);

      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dashboard-attachment-id' })
      );
      expect(appliedAttachments.shownVersions$.getValue()).toEqual(new Set());
    });
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

  it('stages the open dashboard in an existing conversation that does not have it', () => {
    mockApi.savedObjectId$.next('dashboard-2');
    register();
    emitConversationChange({
      id: 'conversation-1',
      attachments: [
        createVersionedAttachment(
          createDashboardAttachment({ id: 'dashboard-attachment-1', origin: 'dashboard-1' })
        ),
      ],
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'draft-attachment-id-1', origin: 'dashboard-2' })
    );

    cleanup();

    expect(removeAttachment).toHaveBeenCalledWith('draft-attachment-id-1');
  });

  describe('an unsaved dashboard linked to an attachment of another conversation', () => {
    const linkedAttachment = createDashboardAttachment({ id: 'linked-attachment-id' });
    const otherAttachment = createDashboardAttachment({
      id: 'other-attachment-id',
      data: { title: 'Other Dashboard', description: '', panels: [] },
    });

    beforeEach(() => {
      mockApi.layout$.next({ panels: { 'panel-1': {} }, pinnedPanels: {} });
    });

    const emitAgentUpdate = (conversationId: string, attachment: DashboardAttachment) => {
      chatEventsByConversationId.get(conversationId)?.next({
        type: ChatEventType.toolUi,
        data: {
          tool_id: 'tool',
          tool_call_id: 'call',
          custom_event: DASHBOARD_UPDATED_UI_EVENT,
          data: {
            attachment: {
              ...attachment,
              data: { title: 'Agent Dashboard', description: '', panels: [] },
            },
          },
        },
      } as ChatEvent);
    };

    it('stays a draft when edited in a conversation with a single unsaved attachment', () => {
      register();
      emitConversationChange({
        id: 'conversation-1',
        attachments: [createVersionedAttachment(linkedAttachment)],
      });
      jest.runOnlyPendingTimers();
      emitConversationChange({
        id: 'conversation-2',
        attachments: [createVersionedAttachment(otherAttachment)],
      });
      jest.runOnlyPendingTimers();
      addAttachment.mockClear();

      simulateDashboardStateChange();
      jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

      expect(addAttachment).toHaveBeenCalledTimes(1);
      expect(addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'draft-attachment-id-1' })
      );
    });

    it('applies agent updates again after visiting another conversation', () => {
      const conversation1Attachments = [
        createVersionedAttachment(linkedAttachment),
        createVersionedAttachment(otherAttachment),
      ];
      register();
      emitConversationChange({ id: 'conversation-1', attachments: conversation1Attachments });
      jest.runOnlyPendingTimers();
      simulateDashboardStateChange();
      jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

      emitConversationChange({ id: 'conversation-2', attachments: [] });
      jest.runOnlyPendingTimers();
      emitConversationChange({ id: 'conversation-1', attachments: conversation1Attachments });
      jest.runOnlyPendingTimers();

      expect(addAttachment).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'linked-attachment-id' })
      );

      emitAgentUpdate('conversation-1', linkedAttachment);

      expect(notifyOtherDashboardUpdated).not.toHaveBeenCalled();
      expect(mockApi.setState).toHaveBeenCalledTimes(1);
    });

    it('stays linked after sending a draft in another conversation', () => {
      const conversation1Attachments = [
        createVersionedAttachment(linkedAttachment),
        createVersionedAttachment(otherAttachment),
      ];
      register();
      emitConversationChange({ id: 'conversation-1', attachments: conversation1Attachments });
      jest.runOnlyPendingTimers();
      simulateDashboardStateChange();
      jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

      emitConversationChange({ id: 'conversation-2', attachments: [] });
      jest.runOnlyPendingTimers();
      emitConversationChange({
        id: 'conversation-2',
        attachments: [
          createVersionedAttachment(
            createDashboardAttachment({
              id: 'draft-attachment-id-1',
              data: { title: 'Edited Dashboard', description: 'Test Description', panels: [] },
            })
          ),
        ],
      });
      jest.runOnlyPendingTimers();
      emitConversationChange({ id: 'conversation-1', attachments: conversation1Attachments });
      jest.runOnlyPendingTimers();

      expect(addAttachment).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'linked-attachment-id' })
      );
    });

    it('keeps the link of a new conversation once it gets its id', () => {
      const draftAttachment = createDashboardAttachment({
        id: 'draft-attachment-id-1',
        data: { title: 'Edited Dashboard', description: 'Test Description', panels: [] },
      });
      register();
      emitConversationChange({});
      jest.runOnlyPendingTimers();
      simulateDashboardStateChange();
      jest.advanceTimersByTime(MANUAL_CHANGES_DEBOUNCE_MS);

      emitConversationChange({
        id: 'conversation-1',
        attachments: [createVersionedAttachment(draftAttachment)],
      });
      emitAgentUpdate('conversation-1', draftAttachment);

      expect(notifyOtherDashboardUpdated).not.toHaveBeenCalled();
      expect(mockApi.setState).toHaveBeenCalledTimes(1);
    });
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
