/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { ChatEvent, RoundCompleteEvent, ConversationRound } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_OPERATION } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createDashboardAppIntegration$, registerDashboardAppIntegration } from './dashboard_app_integration';

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

interface MockChildApi {
  uuid: string;
  hasUnsavedChanges$: BehaviorSubject<boolean>;
  resetUnsavedChanges: jest.Mock;
  serializeState: jest.Mock;
  applySerializedState: jest.Mock;
}

interface MockDashboardApi {
  savedObjectId$: BehaviorSubject<string | undefined>;
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
  settings: {
    autoApplyFilters$: BehaviorSubject<boolean>;
    syncColors$: BehaviorSubject<boolean>;
    syncCursor$: BehaviorSubject<boolean>;
    syncTooltips$: BehaviorSubject<boolean>;
    useMargins$: BehaviorSubject<boolean>;
  };
  setState: jest.Mock;
  getSerializedState: jest.Mock;
}

const createMockDashboardApi = (savedObjectId?: string): MockDashboardApi => {
  return {
    savedObjectId$: new BehaviorSubject<string | undefined>(savedObjectId),
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
    title$: new BehaviorSubject<string>('Current Dashboard'),
    description$: new BehaviorSubject<string>('Dashboard description'),
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
        title: 'Current Dashboard',
        description: 'Dashboard description',
        panels: [],
      },
    }),
  };
};

const getPendingAttachmentId = (
  agentBuilder: jest.Mocked<AgentBuilderPluginStart>,
  callIndex = 0
): string => {
  const attachment = agentBuilder.addAttachment.mock.calls[callIndex][0];
  if (!attachment.id) {
    throw new Error('Expected attachment to have an id');
  }
  return attachment.id;
};

describe('registerDashboardAppIntegration', () => {
  let agentBuilder: jest.Mocked<AgentBuilderPluginStart>;
  let dashboardApi: MockDashboardApi;
  let chat$: Subject<ChatEvent>;

  beforeEach(() => {
    jest.useFakeTimers();
    chat$ = new Subject<ChatEvent>();
    agentBuilder = {
      setChatConfig: jest.fn(),
      clearChatConfig: jest.fn(),
      addAttachment: jest.fn(),
      removeAttachment: jest.fn(),
      updateAttachmentOrigin: jest.fn().mockResolvedValue({}),
      events: {
        chat$,
      },
    } as unknown as jest.Mocked<AgentBuilderPluginStart>;
    dashboardApi = createMockDashboardApi();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets dashboard chat config for the provided dashboard api', () => {
    registerDashboardAppIntegration({
      agentBuilder,
      api: dashboardApi as unknown as DashboardApi,
    });

    expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        onConversationChange: expect.any(Function),
      })
    );
  });

  it('attaches the current dashboard when no existing dashboard attachments', () => {
    const dashboardApiWithId = createMockDashboardApi('dashboard-123');

    registerDashboardAppIntegration({
      agentBuilder,
      api: dashboardApiWithId as unknown as DashboardApi,
    });

    const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

    // No attachments - should add dashboard attachment
    onConversationChange({ id: undefined });
    const addedAttachment = agentBuilder.addAttachment.mock.calls[0][0];
    expect(addedAttachment).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-123',
        data: expect.objectContaining({
          title: 'Current Dashboard',
          description: 'Dashboard description',
        }),
      })
    );
  });

  it('attaches the current dashboard for existing conversation without dashboard attachments', () => {
    const dashboardApiWithId = createMockDashboardApi('dashboard-123');

    registerDashboardAppIntegration({
      agentBuilder,
      api: dashboardApiWithId as unknown as DashboardApi,
    });

    const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

    // Existing conversation with no dashboard attachments - should add dashboard attachment
    onConversationChange({ id: 'existing-conversation', attachments: [] });
    expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
  });

  it('removes pending attachment when switching to conversation with existing dashboard attachments', () => {
    const dashboardApiWithId = createMockDashboardApi('dashboard-123');

    registerDashboardAppIntegration({
      agentBuilder,
      api: dashboardApiWithId as unknown as DashboardApi,
    });

    const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

    // First, add a pending attachment (no existing dashboard attachments)
    onConversationChange({ id: undefined });
    const addedAttachment = agentBuilder.addAttachment.mock.calls[0][0];

    // Switch to conversation with existing dashboard attachment - should remove pending
    onConversationChange({
      id: 'existing-conversation',
      attachments: [
        {
          id: 'existing-dashboard-attachment',
          type: DASHBOARD_ATTACHMENT_TYPE,
          versions: [],
          current_version: 1,
        },
      ],
    });
    expect(agentBuilder.removeAttachment).toHaveBeenCalledWith(addedAttachment.id);
  });

  it('removes and recreates pending attachment when switching to conversation without dashboard attachments', () => {
    const dashboardApiWithId = createMockDashboardApi('dashboard-123');

    registerDashboardAppIntegration({
      agentBuilder,
      api: dashboardApiWithId as unknown as DashboardApi,
    });

    const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

    // First, add a pending attachment
    onConversationChange({ id: undefined });
    const firstAttachment = agentBuilder.addAttachment.mock.calls[0][0];

    // Switch to conversation with non-dashboard attachments
    // Should remove old pending and create new one
    onConversationChange({
      id: 'existing-conversation',
      attachments: [
        {
          id: 'other-attachment',
          type: 'other_type',
          versions: [],
          current_version: 1,
        },
      ],
    });
    expect(agentBuilder.removeAttachment).toHaveBeenCalledWith(firstAttachment.id);
    // Should have added a new attachment for the new conversation
    expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(2);
  });

  it('clears dashboard chat config on cleanup', () => {
    const cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: dashboardApi as unknown as DashboardApi,
    });

    cleanup();

    expect(agentBuilder.clearChatConfig).toHaveBeenCalledTimes(1);
  });

  it('removes the pending dashboard attachment during cleanup', () => {
    const cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: dashboardApi as unknown as DashboardApi,
    });
    const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

    onConversationChange({ id: undefined });

    const addedAttachment = agentBuilder.addAttachment.mock.calls[0][0];

    cleanup();

    expect(agentBuilder.removeAttachment).toHaveBeenCalledWith(addedAttachment.id);
  });

  it('runs setup on subscribe and cleanup on unsubscribe', () => {
    const subscription = createDashboardAppIntegration$({
      agentBuilder,
      api: dashboardApi as unknown as DashboardApi,
    }).subscribe();

    expect(agentBuilder.setChatConfig).toHaveBeenCalledTimes(1);

    subscription.unsubscribe();

    expect(agentBuilder.clearChatConfig).toHaveBeenCalledTimes(1);
  });

  describe('origin sync for existing attachments', () => {
    it('sets up origin sync when switching to conversation with existing dashboard attachment', () => {
      const dashboardApiWithId = createMockDashboardApi('dashboard-123');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [],
            current_version: 1,
            origin: 'dashboard-123',
          },
        ],
      });

      // Save the dashboard with a new ID
      dashboardApiWithId.savedObjectId$.next('new-dashboard-id');

      expect(agentBuilder.updateAttachmentOrigin).toHaveBeenCalledWith(
        'existing-conversation',
        'existing-dashboard-attachment',
        'new-dashboard-id'
      );
    });

    it('updates origin when dashboard is saved for the first time (no previous origin)', () => {
      const dashboardApiWithId = createMockDashboardApi(undefined);

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [],
            current_version: 1,
            origin: undefined,
          },
        ],
      });

      // Save the dashboard for the first time
      dashboardApiWithId.savedObjectId$.next('newly-saved-dashboard-id');

      expect(agentBuilder.updateAttachmentOrigin).toHaveBeenCalledWith(
        'existing-conversation',
        'existing-dashboard-attachment',
        'newly-saved-dashboard-id'
      );
    });

    it('does not update origin when savedObjectId becomes undefined', () => {
      const dashboardApiWithId = createMockDashboardApi('dashboard-123');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [],
            current_version: 1,
            origin: 'dashboard-123',
          },
        ],
      });

      // Navigate to unsaved dashboard
      dashboardApiWithId.savedObjectId$.next(undefined);

      expect(agentBuilder.updateAttachmentOrigin).not.toHaveBeenCalled();
    });

    it('does not update origin when savedObjectId matches current origin', () => {
      const dashboardApiWithId = createMockDashboardApi('dashboard-123');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [],
            current_version: 1,
            origin: 'dashboard-123',
          },
        ],
      });

      // Emit same ID - should not trigger update
      dashboardApiWithId.savedObjectId$.next('dashboard-123');

      expect(agentBuilder.updateAttachmentOrigin).not.toHaveBeenCalled();
    });

    it('cleans up origin sync subscription when switching conversations', () => {
      const dashboardApiWithId = createMockDashboardApi('dashboard-123');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      // Switch to conversation with existing dashboard attachment
      onConversationChange({
        id: 'conversation-1',
        attachments: [
          {
            id: 'attachment-1',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [],
            current_version: 1,
            origin: 'dashboard-123',
          },
        ],
      });

      // Switch to a new conversation (no attachments)
      onConversationChange({ id: undefined });

      // Save the dashboard - should NOT update the old attachment
      dashboardApiWithId.savedObjectId$.next('new-dashboard-id');

      expect(agentBuilder.updateAttachmentOrigin).not.toHaveBeenCalled();
    });

    it('cleans up origin sync subscription on cleanup', () => {
      const dashboardApiWithId = createMockDashboardApi('dashboard-123');

      const cleanup = registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [],
            current_version: 1,
            origin: 'dashboard-123',
          },
        ],
      });

      cleanup();

      // Save the dashboard after cleanup - should NOT update
      dashboardApiWithId.savedObjectId$.next('new-dashboard-id');

      expect(agentBuilder.updateAttachmentOrigin).not.toHaveBeenCalled();
    });
  });

  describe('manual changes sync', () => {
    it('debounces rapid changes with 150ms delay', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      // Clear the initial addAttachment call from onConversationChange
      agentBuilder.addAttachment.mockClear();

      // Emit multiple changes rapidly
      dashboardApi.title$.next('Title 1');
      dashboardApi.title$.next('Title 2');
      dashboardApi.title$.next('Title 3');

      // Before debounce time, addAttachment should not be called
      jest.advanceTimersByTime(100);
      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();

      // After debounce time, addAttachment should be called once
      jest.advanceTimersByTime(100);
      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when title changes', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when description changes', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.description$.next('New Description');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when filters change', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.filters$.next([{ meta: {}, query: {} }]);
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when query changes', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.query$.next({ query: 'new query', language: 'kuery' });
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when timeRange changes', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.timeRange$.next({ from: 'now-1h', to: 'now' });
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when layout changes', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.layout$.next([{ id: 'panel-1', row: 0, column: 0 }]);
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when child state changes', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      jest.advanceTimersByTime(150);
      dashboardApi.children$.value['panel-1'].hasUnsavedChanges$.next(true);
      jest.advanceTimersByTime(300);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when settings change', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.settings.useMargins$.next(false);
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('batches multiple different observable emissions', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.title$.next('New Title');
      dashboardApi.description$.next('New Description');
      dashboardApi.filters$.next([]);
      jest.advanceTimersByTime(200);

      // All changes batched into single addAttachment call
      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('does not sync when viewing a saved dashboard that differs from attachment origin', () => {
      const dashboardApiWithDifferentOrigin = createMockDashboardApi('different-dashboard-id');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithDifferentOrigin as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      // Switch to conversation with existing dashboard attachment with different origin
      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [{ version: 1, data: { title: 'Test' }, content_hash: 'hash', created_at: new Date().toISOString() }],
            current_version: 1,
            origin: 'attachment-dashboard-id',
          },
        ],
      });
      agentBuilder.addAttachment.mockClear();

      dashboardApiWithDifferentOrigin.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    });

    it('syncs when viewing the same saved dashboard as attachment origin', () => {
      const dashboardApiWithSameOrigin = createMockDashboardApi('same-dashboard-id');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithSameOrigin as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      // Switch to conversation with existing dashboard attachment with same origin
      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [{ version: 1, data: { title: 'Test' }, content_hash: 'hash', created_at: new Date().toISOString() }],
            current_version: 1,
            origin: 'same-dashboard-id',
          },
        ],
      });
      agentBuilder.addAttachment.mockClear();

      dashboardApiWithSameOrigin.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('does not sync when getSerializedState returns no attributes', () => {
      dashboardApi.getSerializedState.mockReturnValue({ attributes: undefined });

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      dashboardApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    });

    it('skips initial BehaviorSubject emissions and only reacts to changes', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      // After mounting, initial emissions are skipped synchronously
      jest.advanceTimersByTime(200);

      // Initial emissions should not trigger addAttachment
      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();

      // Actual change should trigger addAttachment
      dashboardApi.title$.next('Changed Title');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from manual changes on cleanup', () => {
      const cleanup = registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });
      agentBuilder.addAttachment.mockClear();

      cleanup();

      // After cleanup, changes should not trigger addAttachment
      dashboardApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    });

    it('calls addAttachment with correct attachment structure', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      const pendingAttachmentId = getPendingAttachmentId(agentBuilder);
      agentBuilder.addAttachment.mockClear();

      dashboardApi.getSerializedState.mockReturnValue({
        attributes: {
          title: 'Serialized Title',
          description: 'Serialized Description',
          panels: [{ id: 'panel-1' }],
        },
      });

      dashboardApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(agentBuilder.addAttachment).toHaveBeenCalledWith({
        id: pendingAttachmentId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: expect.any(Object),
        origin: undefined,
      });
    });
  });

  describe('agent live updates', () => {
    it('updates dashboard state on roundComplete with updated attachment', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      const pendingAttachmentId = getPendingAttachmentId(agentBuilder);

      const versionedAttachment = createMockVersionedAttachment(pendingAttachmentId);
      chat$.next(
        createMockRoundCompleteEvent(
          [versionedAttachment],
          [{ attachment_id: pendingAttachmentId, operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );

      expect(dashboardApi.setState).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Dashboard' })
      );
    });

    it('updates dashboard state on roundComplete with created attachment', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      const pendingAttachmentId = getPendingAttachmentId(agentBuilder);

      const versionedAttachment = createMockVersionedAttachment(pendingAttachmentId);
      chat$.next(
        createMockRoundCompleteEvent(
          [versionedAttachment],
          [{ attachment_id: pendingAttachmentId, operation: ATTACHMENT_REF_OPERATION.created }]
        )
      );

      expect(dashboardApi.setState).toHaveBeenCalled();
    });

    it('does not update state for read-only operations', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      const pendingAttachmentId = getPendingAttachmentId(agentBuilder);

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment(pendingAttachmentId)],
          [{ attachment_id: pendingAttachmentId, operation: ATTACHMENT_REF_OPERATION.read }]
        )
      );
      expect(dashboardApi.setState).not.toHaveBeenCalled();
    });

    it('does not update state when attachment is not in event', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      const pendingAttachmentId = getPendingAttachmentId(agentBuilder);

      chat$.next(
        createMockRoundCompleteEvent(
          [],
          [{ attachment_id: pendingAttachmentId, operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(dashboardApi.setState).not.toHaveBeenCalled();
    });

    it('does not update state when attachment has no versions', () => {
      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      const pendingAttachmentId = getPendingAttachmentId(agentBuilder);

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment(pendingAttachmentId, undefined, false)],
          [{ attachment_id: pendingAttachmentId, operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(dashboardApi.setState).not.toHaveBeenCalled();
    });

    it('does not update state when viewing different dashboard than attachment origin', () => {
      const dashboardApiWithDifferentId = createMockDashboardApi('different-dashboard-id');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithDifferentId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      // Switch to conversation with existing dashboard attachment linked to different dashboard
      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [{ version: 1, data: { title: 'Test' }, content_hash: 'hash', created_at: new Date().toISOString() }],
            current_version: 1,
            origin: 'original-dashboard-id',
          },
        ],
      });

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('existing-dashboard-attachment', 'original-dashboard-id')],
          [
            {
              attachment_id: 'existing-dashboard-attachment',
              operation: ATTACHMENT_REF_OPERATION.updated,
            },
          ]
        )
      );

      expect(dashboardApiWithDifferentId.setState).not.toHaveBeenCalled();
    });

    it('updates state when viewing same dashboard as attachment origin', () => {
      const dashboardApiWithSameId = createMockDashboardApi('same-dashboard-id');

      registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApiWithSameId as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;

      // Switch to conversation with existing dashboard attachment linked to same dashboard
      onConversationChange({
        id: 'existing-conversation',
        attachments: [
          {
            id: 'existing-dashboard-attachment',
            type: DASHBOARD_ATTACHMENT_TYPE,
            versions: [{ version: 1, data: { title: 'Test' }, content_hash: 'hash', created_at: new Date().toISOString() }],
            current_version: 1,
            origin: 'same-dashboard-id',
          },
        ],
      });

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('existing-dashboard-attachment', 'same-dashboard-id')],
          [
            {
              attachment_id: 'existing-dashboard-attachment',
              operation: ATTACHMENT_REF_OPERATION.updated,
            },
          ]
        )
      );

      expect(dashboardApiWithSameId.setState).toHaveBeenCalled();
    });

    it('cleans up chat$ subscription on cleanup', () => {
      const cleanup = registerDashboardAppIntegration({
        agentBuilder,
        api: dashboardApi as unknown as DashboardApi,
      });

      const onConversationChange = agentBuilder.setChatConfig.mock.calls[0][0].onConversationChange!;
      onConversationChange({ id: undefined });

      const pendingAttachmentId = getPendingAttachmentId(agentBuilder);

      cleanup();

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment(pendingAttachmentId)],
          [{ attachment_id: pendingAttachmentId, operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );

      expect(dashboardApi.setState).not.toHaveBeenCalled();
    });
  });
});
