/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardApi, DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import { registerDashboardAppIntegration } from './dashboard_app_integration';

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
  getSerializedState: jest.Mock;
}

interface MockChildApi {
  uuid: string;
  hasUnsavedChanges$: BehaviorSubject<boolean>;
  resetUnsavedChanges: jest.Mock;
  serializeState: jest.Mock;
  applySerializedState: jest.Mock;
}

const mockSavedDashboardState = {
  title: 'Saved Dashboard',
  description: '',
  panels: [],
} as unknown as DashboardSaveEvent['dashboardState'];

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
  getSerializedState: jest.fn().mockReturnValue({
    attributes: {
      title: 'Test Dashboard',
      description: 'Test Description',
      panels: [],
    },
  }),
});

const createMockAttachment = (overrides?: Partial<DashboardAttachment>): DashboardAttachment => ({
  id: 'test-attachment-id',
  type: DASHBOARD_ATTACHMENT_TYPE,
  data: {
    title: 'Test Dashboard',
    description: 'Test Description',
    panels: [],
  },
  origin: undefined,
  ...overrides,
});

describe('registerDashboardAppIntegration', () => {
  let mockApi: MockDashboardApi;
  let getAttachment: jest.Mock;
  let getSyncAttachment: jest.Mock;
  let checkSavedDashboardExist: jest.Mock;
  let updateOrigin: jest.Mock;
  let addAttachment: jest.Mock;
  let chat$: Subject<ChatEvent>;
  let cleanup: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    mockApi = createMockDashboardApi();
    getAttachment = jest.fn().mockReturnValue(createMockAttachment());
    getSyncAttachment = jest
      .fn()
      .mockImplementation((_savedObjectId: string | undefined) => getAttachment());
    checkSavedDashboardExist = jest.fn().mockResolvedValue(true);
    updateOrigin = jest.fn().mockResolvedValue(undefined);
    addAttachment = jest.fn();
    chat$ = new Subject<ChatEvent>();
  });

  afterEach(() => {
    cleanup?.();
    jest.useRealTimers();
  });

  const register = () => {
    const agentBuilder = {
      addAttachment,
      events: { chat$ },
    } as unknown as AgentBuilderPluginStart;

    cleanup = registerDashboardAppIntegration({
      agentBuilder,
      api: mockApi as unknown as DashboardApi,
      getAttachment,
      getSyncAttachment,
      checkSavedDashboardExist,
      updateOrigin,
    });
  };

  it('syncs manual dashboard changes back to the attachment', () => {
    register();

    mockApi.title$.next('New Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-attachment-id',
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: expect.any(Object),
      })
    );
  });

  it('skips syncing when viewing a different saved dashboard', () => {
    getAttachment.mockReturnValue(createMockAttachment({ origin: 'attachment-dashboard-id' }));
    getSyncAttachment.mockReturnValue(undefined);
    mockApi.savedObjectId$.next('different-dashboard-id');

    register();

    mockApi.title$.next('New Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('skips syncing when another attachment owns the current dashboard', () => {
    const currentAttachment = createMockAttachment({
      id: 'current-attachment-id',
      origin: 'dashboard-a',
    });
    getAttachment.mockReturnValue(currentAttachment);
    getSyncAttachment.mockReturnValue(
      createMockAttachment({
        id: 'other-attachment-id',
        origin: 'dashboard-a',
      })
    );
    mockApi.savedObjectId$.next('dashboard-a');

    register();

    mockApi.title$.next('New Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not sync when serialized attributes are missing', () => {
    mockApi.getSerializedState.mockReturnValue({ attributes: undefined });

    register();

    mockApi.title$.next('New Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('handles missing settings observables', () => {
    mockApi = {
      ...mockApi,
      settings: {
        useMargins$: new BehaviorSubject<boolean>(true),
      },
    };

    register();

    mockApi.title$.next('New Title');
    jest.advanceTimersByTime(200);

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('updates origin on first save of an unsaved dashboard', async () => {
    getAttachment.mockReturnValue(createMockAttachment({ origin: undefined }));

    register();

    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'new-dashboard-id',
      dashboardState: mockSavedDashboardState,
    });
    await Promise.resolve();

    expect(updateOrigin).toHaveBeenCalledWith('new-dashboard-id');
  });

  it('updates origin on save as when linked to the previous dashboard', async () => {
    getAttachment.mockReturnValue(createMockAttachment({ origin: 'dashboard-a' }));

    register();

    mockApi.onSave$.next({
      previousDashboardId: 'dashboard-a',
      dashboardId: 'dashboard-b',
      dashboardState: mockSavedDashboardState,
    });
    await Promise.resolve();

    expect(updateOrigin).toHaveBeenCalledWith('dashboard-b');
  });

  it('avoids checking existence when saving the dashboard already linked by origin', async () => {
    getAttachment.mockReturnValue(createMockAttachment({ origin: 'dashboard-a' }));

    register();

    mockApi.onSave$.next({
      previousDashboardId: 'some-other-dashboard',
      dashboardId: 'dashboard-a',
      dashboardState: mockSavedDashboardState,
    });
    await Promise.resolve();

    expect(checkSavedDashboardExist).not.toHaveBeenCalled();
    expect(updateOrigin).toHaveBeenCalledWith('dashboard-a');
  });

  it('does not relink after navigating to a different saved dashboard', async () => {
    getAttachment.mockReturnValue(createMockAttachment({ origin: 'dashboard-a' }));
    mockApi.savedObjectId$.next('dashboard-b');

    register();

    mockApi.onSave$.next({
      previousDashboardId: 'dashboard-b',
      dashboardId: 'dashboard-b',
      dashboardState: mockSavedDashboardState,
    });
    await Promise.resolve();

    expect(updateOrigin).not.toHaveBeenCalled();
  });

  it('relinks to the current dashboard when the stored origin no longer exists', async () => {
    getAttachment.mockReturnValue(createMockAttachment({ origin: 'deleted-dashboard' }));
    checkSavedDashboardExist.mockResolvedValue(false);

    register();

    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'current-dashboard',
      dashboardState: mockSavedDashboardState,
    });
    await Promise.resolve();

    expect(checkSavedDashboardExist).toHaveBeenCalledWith('deleted-dashboard');
    expect(updateOrigin).toHaveBeenCalledWith('current-dashboard');
  });

  it('does not relink when another attachment owns the current dashboard', async () => {
    const currentAttachment = createMockAttachment({
      id: 'current-attachment-id',
      origin: undefined,
    });
    getAttachment.mockReturnValue(currentAttachment);
    getSyncAttachment.mockReturnValue(
      createMockAttachment({
        id: 'other-attachment-id',
        origin: undefined,
      })
    );

    register();

    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'new-dashboard-id',
      dashboardState: mockSavedDashboardState,
    });
    await Promise.resolve();

    expect(updateOrigin).not.toHaveBeenCalled();
  });

  it('unsubscribes from manual and origin subscriptions on cleanup', async () => {
    register();
    cleanup();

    mockApi.title$.next('New Title');
    jest.advanceTimersByTime(200);
    mockApi.onSave$.next({
      previousDashboardId: undefined,
      dashboardId: 'new-dashboard-id',
      dashboardState: mockSavedDashboardState,
    });
    await Promise.resolve();

    expect(addAttachment).not.toHaveBeenCalled();
    expect(updateOrigin).not.toHaveBeenCalled();
  });
});
