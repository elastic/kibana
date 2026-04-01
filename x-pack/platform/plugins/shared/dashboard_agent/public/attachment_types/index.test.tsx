/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { ChatEvent, RoundCompleteEvent, ConversationRound } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_OPERATION } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { registerDashboardAttachmentUiDefinition } from '.';

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: jest.fn(() => null),
}));

const updateOrigin = jest.fn();

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

describe('registerDashboardAttachmentUiDefinition', () => {
  let deps: ReturnType<typeof createMockDeps>;
  let uiDefinition: AttachmentUIDefinition<DashboardAttachment>;
  let unregister: () => void;
  let chat$: Subject<ChatEvent>;

  const createMockDeps = () => {
    chat$ = new Subject<ChatEvent>();
    const dashboardAppClientApi$ = new Subject<DashboardApi | undefined>();
    const addAttachmentType = jest.fn();
    const updateAttachmentOrigin = jest.fn().mockResolvedValue(undefined);
    const findDashboardsService = jest.fn().mockResolvedValue({
      findById: jest.fn().mockResolvedValue({ status: 'success' }),
    });

    const mockAddAttachment = jest.fn();
    const agentBuilder: AgentBuilderPluginStart = {
      attachments: { addAttachmentType },
      addAttachment: mockAddAttachment,
      updateAttachmentOrigin,
      events: { chat$ },
    } as unknown as AgentBuilderPluginStart;

    const dashboardPlugin: DashboardStart = {
      dashboardAppClientApi$,
      findDashboardsService,
    } as unknown as DashboardStart;

    const unifiedSearch: UnifiedSearchPublicPluginStart = {
      ui: { SearchBar: jest.fn() },
    } as unknown as UnifiedSearchPublicPluginStart;

    return {
      agentBuilder,
      dashboardPlugin,
      unifiedSearch,
      dashboardLocator: undefined,
      dashboardAppClientApi$,
      addAttachmentType,
      updateAttachmentOrigin,
      chat$,
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
        onAttachmentMount: expect.any(Function),
        renderCanvasContent: expect.any(Function),
        getActionButtons: expect.any(Function),
      })
    );
  });

  describe('onAttachmentMount - origin sync', () => {
    it('updates origin when new dashboard is saved', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({
        getAttachment,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

      // First save triggers update
      mockApi.emitSave({
        previousDashboardId: undefined,
        dashboardId: 'new-dashboard-id',
        dashboardState: mockSavedDashboardState,
      });
      expect(updateOrigin).toHaveBeenCalledWith('new-dashboard-id');

      // Undefined doesn't trigger
      updateOrigin.mockClear();
      mockApi.emitSave({
        previousDashboardId: 'new-dashboard-id',
        dashboardId: undefined,
        dashboardState: mockSavedDashboardState,
      });
      expect(updateOrigin).not.toHaveBeenCalled();

      cleanup?.();
    });

    it('does not update origin when attachment is linked to a different dashboard', () => {
      const { getAttachment } = createMockAttachment('attachment-1', 'original-dashboard-id');
      const mockApi = createMockDashboardApi('different-dashboard-id');

      const cleanup = uiDefinition.onAttachmentMount!({
        getAttachment,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.emitSave({
        previousDashboardId: 'different-dashboard-id',
        dashboardId: 'newly-saved-id',
        dashboardState: mockSavedDashboardState,
      });

      expect(updateOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('cleans up subscriptions properly', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({
        getAttachment,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      cleanup?.();

      mockApi.setSavedObjectId('new-id-after-cleanup');
      expect(updateOrigin).not.toHaveBeenCalled();
    });
  });

  describe('onAttachmentMount - live changes from chat$', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('updates dashboard state on roundComplete with updated/created attachment', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({
        getAttachment,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

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

    it('does not update state for read-only operations or missing attachments', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({
        getAttachment,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

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

    it('respects dashboard origin matching', () => {
      // Different dashboard - no update
      const { getAttachment: getAttachment1 } = createMockAttachment(
        'attachment-1',
        'original-dashboard-id'
      );
      const mockApi1 = createMockDashboardApi('different-dashboard-id');

      const cleanup1 = uiDefinition.onAttachmentMount!({
        getAttachment: getAttachment1,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi1 as unknown as DashboardApi);

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

      const cleanup2 = uiDefinition.onAttachmentMount!({
        getAttachment: getAttachment2,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi2 as unknown as DashboardApi);

      chat$.next(
        createMockRoundCompleteEvent(
          [createMockVersionedAttachment('attachment-1', 'same-dashboard-id')],
          [{ attachment_id: 'attachment-1', operation: ATTACHMENT_REF_OPERATION.updated }]
        )
      );
      expect(mockApi2.setState).toHaveBeenCalled();
      cleanup2?.();
    });

    it('cleans up chat$ subscription on cleanup or API unavailable', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({
        getAttachment,
        updateOrigin,
      });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

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
