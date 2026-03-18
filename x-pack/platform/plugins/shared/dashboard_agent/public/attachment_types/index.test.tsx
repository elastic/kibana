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
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import { registerDashboardAttachmentUiDefinition } from '.';

describe('registerDashboardAttachmentUiDefinition', () => {
  let deps: ReturnType<typeof createMockDeps>;
  let uiDefinition: ReturnType<typeof deps.addAttachmentType.mock.calls>[0][1];
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

  const createMockAttachment = (
    id: string,
    origin?: string
  ): AttachmentLifecycleParams<DashboardAttachment>['attachment'] => ({
    id,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: { title: 'Test Dashboard', panels: [] },
    origin,
    hidden: false,
  });

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
      const attachment = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount({ attachment, conversationId: 'conv-1' });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('new-dashboard-id');

      expect(deps.updateAttachmentOrigin).toHaveBeenCalledWith(
        'conv-1',
        'attachment-1',
        'new-dashboard-id'
      );
      cleanup?.();
    });

    it('updates origin when the same dashboard is saved again', () => {
      const attachment = createMockAttachment('attachment-1', 'existing-dashboard-id');
      const mockApi = createMockDashboardApi('existing-dashboard-id');

      const cleanup = uiDefinition.onAttachmentMount({ attachment, conversationId: 'conv-1' });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('new-saved-as-id');

      expect(deps.updateAttachmentOrigin).toHaveBeenCalledWith(
        'conv-1',
        'attachment-1',
        'new-saved-as-id'
      );
      cleanup?.();
    });

    it('does NOT update origin when navigating to an unrelated dashboard', () => {
      const attachment = createMockAttachment('attachment-1', 'original-dashboard-id');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount({ attachment, conversationId: 'conv-1' });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('unrelated-dashboard-id');

      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('does NOT update origin when savedObjectId is undefined', () => {
      const attachment = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount({ attachment, conversationId: 'conv-1' });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId(undefined);

      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('does NOT update origin when savedObjectId equals attachment origin', () => {
      const attachment = createMockAttachment('attachment-1', 'same-dashboard-id');
      const mockApi = createMockDashboardApi('same-dashboard-id');

      const cleanup = uiDefinition.onAttachmentMount({ attachment, conversationId: 'conv-1' });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      mockApi.setSavedObjectId('same-dashboard-id');

      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });

    it('cleans up subscriptions when cleanup is called', () => {
      const attachment = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount({ attachment, conversationId: 'conv-1' });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
      cleanup?.();

      mockApi.setSavedObjectId('new-id-after-cleanup');

      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();
    });

    it('cleans up savedObjectId subscription when dashboard API becomes unavailable', () => {
      const attachment = createMockAttachment('attachment-1');
      const mockApi = createMockDashboardApi();

      const cleanup = uiDefinition.onAttachmentMount({ attachment, conversationId: 'conv-1' });
      deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);

      mockApi.setSavedObjectId('first-dashboard-id');
      expect(deps.updateAttachmentOrigin).toHaveBeenCalledWith(
        'conv-1',
        'attachment-1',
        'first-dashboard-id'
      );

      deps.updateAttachmentOrigin.mockClear();
      deps.dashboardAppClientApi$.next(undefined);
      mockApi.setSavedObjectId('second-dashboard-id');

      expect(deps.updateAttachmentOrigin).not.toHaveBeenCalled();
      cleanup?.();
    });
  });

  describe('getLabel', () => {
    it('returns attachment title when available', () => {
      expect(uiDefinition.getLabel({ data: { title: 'My Custom Dashboard' } })).toBe(
        'My Custom Dashboard'
      );
    });

    it('returns default label when title is not available', () => {
      expect(uiDefinition.getLabel({ data: {} })).toBe('New Dashboard');
    });
  });

  describe('getIcon', () => {
    it('returns productDashboard icon', () => {
      expect(uiDefinition.getIcon()).toBe('productDashboard');
    });
  });

  describe('getActionButtons', () => {
    it('returns empty array when in canvas mode', () => {
      const buttons = uiDefinition.getActionButtons({
        attachment: createMockAttachment('1'),
        isCanvas: true,
      });
      expect(buttons).toEqual([]);
    });

    it('returns preview button when not in canvas mode', () => {
      const buttons = uiDefinition.getActionButtons({
        attachment: createMockAttachment('1'),
        isCanvas: false,
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
