/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import { registerDashboardAttachmentUiDefinition } from '.';

const updateOrigin = jest.fn();

describe('registerDashboardAttachmentUiDefinition', () => {
  let deps: ReturnType<typeof createMockDeps>;
  let uiDefinition: AttachmentUIDefinition<DashboardAttachment>;
  let unregister: () => void;

  const createMockDashboardApi = (savedObjectId?: string) => {
    const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);
    return {
      savedObjectId$,
      setSavedObjectId: (id: string | undefined) => savedObjectId$.next(id),
    } as unknown as DashboardApi & { setSavedObjectId: (id: string | undefined) => void };
  };

  const createMockDeps = () => {
    const dashboardAppClientApi$ = new Subject<DashboardApi | undefined>();
    const addAttachmentType = jest.fn();
    const updateAttachmentOrigin = jest.fn().mockResolvedValue(undefined);
    const findDashboardsService = jest.fn().mockResolvedValue({
      findById: jest.fn().mockResolvedValue({ status: 'success' }),
    });

    const agentBuilder: AgentBuilderPluginStart = {
      attachments: { addAttachmentType },
      updateAttachmentOrigin,
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
    };
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
    deps = createMockDeps();
    unregister = registerDashboardAttachmentUiDefinition(deps);
    uiDefinition = deps.addAttachmentType.mock.calls[0][1];
  });

  afterEach(() => {
    unregister();
  });

  it('registers dashboard attachment type', () => {
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

  describe('onAttachmentMount', () => {
    it('updates origin when dashboard is saved for the first time', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('new-dashboard-id');

      expect(updateOrigin).toHaveBeenCalledWith(
        'new-dashboard-id'
      );
      cleanup?.();
    });

    it('updates origin when the same dashboard is saved again', () => {
      const { getAttachment } = createMockAttachment('attachment-1', 'existing-dashboard-id');
      const mockApi = createMockDashboardApi('existing-dashboard-id');
      

      const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('new-saved-as-id');

      expect(updateOrigin).toHaveBeenCalledWith('new-saved-as-id');
      cleanup?.();
    });

    it('does NOT update origin when navigating to an unrelated dashboard', () => {
      const { getAttachment } = createMockAttachment('attachment-1', 'original-dashboard-id');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('unrelated-dashboard-id');
      expect(updateOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('does NOT update origin when savedObjectId is undefined', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId(undefined);

      expect(updateOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('does NOT update origin when savedObjectId equals attachment origin', () => {
      const { getAttachment } = createMockAttachment('attachment-1', 'same-dashboard-id');
      const mockApi = createMockDashboardApi('same-dashboard-id');

      const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('same-dashboard-id');

      expect(updateOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('cleans up subscriptions when cleanup is called', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      cleanup?.();

      mockApi.setSavedObjectId('new-id-after-cleanup');

      expect(updateOrigin).not.toHaveBeenCalled();
    });

    it('cleans up savedObjectId subscription when dashboard API becomes unavailable', () => {
      const { getAttachment } = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('first-dashboard-id');
      expect(updateOrigin).toHaveBeenCalledWith('first-dashboard-id');
      updateOrigin.mockClear();
      deps.dashboardAppClientApi$.next(undefined);
      mockApi.setSavedObjectId('second-dashboard-id');

      expect(updateOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    describe('subscription guards', () => {
      it('does NOT subscribe when attachment has origin and dashboard has different ID', () => {
        const { getAttachment } = createMockAttachment('attachment-1', 'origin-dashboard-id');
        const mockApi = createMockDashboardApi('different-dashboard-id');

        const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
        deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

        // Even if the dashboard saves with a new ID, we should not update origin
        mockApi.setSavedObjectId('newly-saved-id');

        expect(updateOrigin).not.toHaveBeenCalled();
        cleanup?.();
      });

      it('does NOT subscribe when attachment has no origin but dashboard has an ID (navigated to existing dashboard)', () => {
        const { getAttachment } = createMockAttachment('attachment-1'); // no origin
        const mockApi = createMockDashboardApi('existing-dashboard-id');

        const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
        deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

        // Even if the dashboard saves with a new ID, we should not update origin
        mockApi.setSavedObjectId('newly-saved-id');

        expect(updateOrigin).not.toHaveBeenCalled();
        cleanup?.();
      });

      it('subscribes when attachment has origin matching dashboard ID', () => {
        const { getAttachment } = createMockAttachment('attachment-1', 'same-dashboard-id');
        const mockApi = createMockDashboardApi('same-dashboard-id');

        const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
        deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

        // Save As to a new ID should trigger update
        mockApi.setSavedObjectId('new-saved-as-id');

        expect(updateOrigin).toHaveBeenCalledWith('new-saved-as-id');
        cleanup?.();
      });

      it('subscribes when attachment has no origin and dashboard has no ID (new dashboard)', () => {
        const { getAttachment } = createMockAttachment('attachment-1'); // no origin
        const mockApi = createMockDashboardApi(); // no savedObjectId

        const cleanup = uiDefinition.onAttachmentMount!({ getAttachment, updateOrigin });
        deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

        // First save should trigger update
        mockApi.setSavedObjectId('first-save-id');

        expect(updateOrigin).toHaveBeenCalledWith('first-save-id');
        cleanup?.();
      });
    });
  });

  describe('getLabel', () => {
    it('returns attachment title when available', () => {
      expect(
        uiDefinition.getLabel({
          data: { title: 'My Custom Dashboard', description: '', panels: [] },
        } as unknown as DashboardAttachment)
      ).toBe('My Custom Dashboard');
    });

    it('returns default label when title is not available', () => {
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
    it('returns empty array when in canvas mode', () => {
      const { attachment } = createMockAttachment('1');
      const buttons = uiDefinition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: true,
        updateOrigin: jest.fn(),
      });
      expect(buttons).toEqual([]);
    });

    it('returns preview button when not in canvas mode', () => {
      const { attachment } = createMockAttachment('1');
      const buttons = uiDefinition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toMatchObject({ label: 'Preview', icon: 'eye' });
    });
  });

  describe('cleanup on unregister', () => {
    it('returns cleanup function that unsubscribes from dashboardAppClientApi$', () => {
      expect(typeof unregister).toBe('function');
    });
  });
});
