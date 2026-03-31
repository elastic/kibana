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
import type { ChatEvent } from '@kbn/agent-builder-common';
import { registerDashboardAttachmentUiDefinition } from '.';

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: jest.fn(() => null),
}));

const createMockDashboardApi = (
  savedObjectId?: string
): DashboardApi & {
  setSavedObjectId: (id: string | undefined) => void;
  setState: jest.Mock;
  getSerializedState: jest.Mock;
} => {
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);
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
  } as unknown as DashboardApi & {
    setSavedObjectId: (id: string | undefined) => void;
    setState: jest.Mock;
    getSerializedState: jest.Mock;
  };
};

const createMockAttachment = (id: string, origin?: string) => {
  const attachment: DashboardAttachment = {
    id,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: { title: 'Test Dashboard', description: '', panels: [] },
    origin,
    hidden: false,
  };
  return { attachment };
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
    const setChatConfig = jest.fn();
    const clearChatConfig = jest.fn();
    const addAttachment = jest.fn();
    const removeAttachment = jest.fn();
    const findDashboardsService = jest.fn().mockResolvedValue({
      findById: jest.fn().mockResolvedValue({ status: 'success' }),
    });
    const agentBuilder: AgentBuilderPluginStart = {
      attachments: { addAttachmentType },
      setChatConfig,
      clearChatConfig,
      addAttachment,
      removeAttachment,
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
      setChatConfig,
      clearChatConfig,
      addAttachment,
      removeAttachment,
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
        renderCanvasContent: expect.any(Function),
        getActionButtons: expect.any(Function),
      })
    );
  });

  it('registers chat config only while a dashboard api is available', () => {
    const mockApi = createMockDashboardApi();

    expect(deps.setChatConfig).not.toHaveBeenCalled();
    expect(deps.clearChatConfig).not.toHaveBeenCalled();

    deps.dashboardAppClientApi$.next(mockApi as unknown as DashboardApi);
    expect(deps.setChatConfig).toHaveBeenCalledTimes(1);

    deps.dashboardAppClientApi$.next(undefined);
    expect(deps.clearChatConfig).toHaveBeenCalledTimes(1);
  });

  it('re-registers chat config when the dashboard api changes', () => {
    const firstApi = createMockDashboardApi('first-dashboard');
    const secondApi = createMockDashboardApi('second-dashboard');

    deps.dashboardAppClientApi$.next(firstApi as unknown as DashboardApi);
    deps.dashboardAppClientApi$.next(secondApi as unknown as DashboardApi);

    expect(deps.setChatConfig).toHaveBeenCalledTimes(2);
    expect(deps.clearChatConfig).toHaveBeenCalledTimes(1);
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
