/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { DashboardSaveEvent } from '@kbn/dashboard-plugin/public';
import { onAttachmentMount, type OnAttachmentMountParams } from './on_attachment_mount';

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
  setState: jest.fn(),
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

describe('onAttachmentMount - manual changes sync', () => {
  let mockApi: MockDashboardApi;
  let dashboardAppClientApi$: BehaviorSubject<MockDashboardApi | undefined>;
  let chat$: Subject<ChatEvent>;
  let getAttachment: jest.Mock;
  let updateOrigin: jest.Mock;
  let addAttachment: jest.Mock;
  let cleanup: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    mockApi = createMockDashboardApi();
    dashboardAppClientApi$ = new BehaviorSubject<MockDashboardApi | undefined>(undefined);
    chat$ = new Subject<ChatEvent>();
    getAttachment = jest.fn().mockReturnValue(createMockAttachment());
    updateOrigin = jest.fn().mockResolvedValue(undefined);
    addAttachment = jest.fn();
  });

  afterEach(() => {
    cleanup?.();
    jest.useRealTimers();
  });

  const mountHandler = () => {
    cleanup = onAttachmentMount({
      dashboardPlugin: {
        dashboardAppClientApi$,
      },
      chat$,
      getAttachment,
      updateOrigin,
      addAttachment,
    } as unknown as OnAttachmentMountParams);
  };

  describe('subscription setup', () => {
    it('sets up manual changes subscription when api becomes available', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      // Verify subscription is set up by checking that observables can emit
      expect(() => mockApi.title$.next('New Title')).not.toThrow();
    });

    it('cleans up manual changes subscription when api becomes undefined', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);
      dashboardAppClientApi$.next(undefined);

      // After cleanup, emitting should not trigger addAttachment
      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).not.toHaveBeenCalled();
    });

    it('resubscribes when api changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      const newMockApi = createMockDashboardApi();
      dashboardAppClientApi$.next(newMockApi);

      // Old api emissions should not trigger addAttachment
      mockApi.title$.next('Old API Title');
      jest.advanceTimersByTime(200);
      expect(addAttachment).not.toHaveBeenCalled();

      // New api emissions should trigger addAttachment
      newMockApi.title$.next('New API Title');
      jest.advanceTimersByTime(200);
      expect(addAttachment).toHaveBeenCalled();
    });
  });

  describe('debouncing', () => {
    it('debounces rapid changes with 150ms delay', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      // Emit multiple changes rapidly
      mockApi.title$.next('Title 1');
      mockApi.title$.next('Title 2');
      mockApi.title$.next('Title 3');

      // Before debounce time, addAttachment should not be called
      jest.advanceTimersByTime(100);
      expect(addAttachment).not.toHaveBeenCalled();

      // After debounce time, addAttachment should be called once
      jest.advanceTimersByTime(100);
      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('resets debounce timer on each emission', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('Title 1');
      jest.advanceTimersByTime(100);

      mockApi.title$.next('Title 2');
      jest.advanceTimersByTime(100);

      // Still not called because timer was reset
      expect(addAttachment).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(addAttachment).toHaveBeenCalledTimes(1);
    });
  });

  describe('observable merging', () => {
    it('triggers sync when title changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when description changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.description$.next('New Description');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when filters change', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.filters$.next([{ meta: {}, query: {} }]);
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when query changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.query$.next({ query: 'new query', language: 'kuery' });
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when timeRange changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.timeRange$.next({ from: 'now-1h', to: 'now' });
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when layout changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.layout$.next([{ id: 'panel-1', row: 0, column: 0 }]);
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when child state changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      jest.advanceTimersByTime(150);
      mockApi.children$.value['panel-1'].hasUnsavedChanges$.next(true);
      jest.advanceTimersByTime(300);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('triggers sync when settings change', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.settings.useMargins$.next(false);
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('batches multiple different observable emissions', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('New Title');
      mockApi.description$.next('New Description');
      mockApi.filters$.next([]);
      jest.advanceTimersByTime(200);

      // All changes batched into single addAttachment call
      expect(addAttachment).toHaveBeenCalledTimes(1);
    });
  });

  describe('savedObjectId filtering', () => {
    it('does not sync when viewing a saved dashboard that differs from attachment origin', () => {
      getAttachment.mockReturnValue(createMockAttachment({ origin: 'attachment-dashboard-id' }));
      mockApi.savedObjectId$.next('different-dashboard-id');

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).not.toHaveBeenCalled();
    });

    it('syncs when viewing the same saved dashboard as attachment origin', () => {
      getAttachment.mockReturnValue(createMockAttachment({ origin: 'same-dashboard-id' }));
      mockApi.savedObjectId$.next('same-dashboard-id');

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('syncs when there is no saved dashboard (unsaved state)', () => {
      getAttachment.mockReturnValue(createMockAttachment({ origin: undefined }));
      mockApi.savedObjectId$.next(undefined);

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });
  });

  describe('save origin sync', () => {
    it('updates origin on the first save of an unsaved dashboard', () => {
      getAttachment.mockReturnValue(createMockAttachment({ origin: undefined }));

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.onSave$.next({
        previousDashboardId: undefined,
        dashboardId: 'new-dashboard-id',
        dashboardState: mockSavedDashboardState,
      });

      expect(updateOrigin).toHaveBeenCalledWith('new-dashboard-id');
    });

    it('updates origin on save as when the attachment is linked to the previous dashboard', () => {
      getAttachment.mockReturnValue(createMockAttachment({ origin: 'dashboard-a' }));

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.onSave$.next({
        previousDashboardId: 'dashboard-a',
        dashboardId: 'dashboard-b',
        dashboardState: mockSavedDashboardState,
      });

      expect(updateOrigin).toHaveBeenCalledWith('dashboard-b');
    });

    it('does not relink the attachment after navigating to a different saved dashboard', () => {
      getAttachment.mockReturnValue(createMockAttachment({ origin: 'dashboard-a' }));
      mockApi.savedObjectId$.next('dashboard-b');

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.onSave$.next({
        previousDashboardId: 'dashboard-b',
        dashboardId: 'dashboard-b',
        dashboardState: mockSavedDashboardState,
      });

      expect(updateOrigin).not.toHaveBeenCalled();
    });
  });

  describe('attachment data', () => {
    it('calls addAttachment with correct attachment structure', () => {
      const attachment = createMockAttachment({ id: 'my-attachment-id' });
      getAttachment.mockReturnValue(attachment);
      mockApi.getSerializedState.mockReturnValue({
        attributes: {
          title: 'Serialized Title',
          description: 'Serialized Description',
          panels: [{ id: 'panel-1' }],
        },
      });

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledWith({
        id: 'my-attachment-id',
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: expect.any(Object),
      });
    });

    it('does not sync when getSerializedState returns no attributes', () => {
      mockApi.getSerializedState.mockReturnValue({ attributes: undefined });

      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).not.toHaveBeenCalled();
    });
  });

  describe('skipping initial emissions', () => {
    it('skips initial BehaviorSubject emissions and only reacts to changes', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      // After mounting, initial emissions are skipped synchronously
      jest.advanceTimersByTime(200);

      // Initial emissions should not trigger addAttachment
      expect(addAttachment).not.toHaveBeenCalled();

      // Actual change should trigger addAttachment
      mockApi.title$.next('Changed Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('unsubscribes from all observables on cleanup', () => {
      mountHandler();
      dashboardAppClientApi$.next(mockApi);

      cleanup();

      // After cleanup, changes should not trigger addAttachment
      mockApi.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).not.toHaveBeenCalled();
    });
  });

  describe('handles missing settings observables', () => {
    it('works when some settings observables are undefined', () => {
      const apiWithMissingSettings = {
        ...mockApi,
        settings: {
          autoApplyFilters$: undefined,
          syncColors$: undefined,
          syncCursor$: undefined,
          syncTooltips$: undefined,
          useMargins$: new BehaviorSubject<boolean>(true),
        },
      } as unknown as MockDashboardApi;

      mountHandler();
      dashboardAppClientApi$.next(apiWithMissingSettings);

      // Should not throw and should still work with available observables
      apiWithMissingSettings.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });

    it('works when settings object is undefined', () => {
      const apiWithoutSettings = {
        ...mockApi,
        settings: undefined,
      } as unknown as MockDashboardApi;

      mountHandler();
      dashboardAppClientApi$.next(apiWithoutSettings);

      // Should not throw and should still work with available observables
      apiWithoutSettings.title$.next('New Title');
      jest.advanceTimersByTime(200);

      expect(addAttachment).toHaveBeenCalledTimes(1);
    });
  });
});
