/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { CasesAnalyticsV2Service, V2_NOOP_DATA_VIEW_REFRESHER } from './service';
import { V2_NOOP_WRITER, type CasesAnalyticsV2WriterContract } from './writer';
import { V2_NOOP_ACTIVITY_WRITER, type CasesActivityV2WriterContract } from './writer/activity';
import {
  V2_NOOP_ATTACHMENTS_WRITER,
  type CasesAttachmentsV2WriterContract,
} from './writer/attachments';
import { ensureCaseIndex } from './ensure_indices/case';
import { ensureActivityIndex } from './ensure_indices/activity';
import { RESET_TASK_ID, RESET_TASK_TYPE } from './reconciliation/reset_task';
import { makeCase, makeUserAction } from './__test_helpers__';

jest.mock('./ensure_indices/case');
jest.mock('./ensure_indices/activity');

const buildService = () =>
  new CasesAnalyticsV2Service({
    logger: loggerMock.create(),
    enabled: false, // doesn't matter for proxy shape
    reconciliationIntervalMinutes: 30,
    enableAdminRoutes: false,
    resetTaskTimeoutMinutes: 60,
    resetPageDelayMs: 0,
  });

describe('CasesAnalyticsV2Service', () => {
  describe('writer proxy ↔ contract parity', () => {
    // Regression guard: the writer proxies held inside the service are what
    // the reconciliation task and SO-service hooks actually call. If a new
    // method is added to a contract and only the real writer + no-op
    // constant are updated (forgetting the proxy), reconciliation crashes
    // at runtime with "writer.<method> is not a function". These tests
    // fail the moment that drift happens.
    //
    // The no-op constant is the canonical implementation of each contract
    // — every key on it must exist as a function on the matching proxy.
    it('proxies every method on CasesAnalyticsV2WriterContract', () => {
      const proxy = buildService().getWriter();
      const contractKeys = Object.keys(V2_NOOP_WRITER) as Array<
        keyof CasesAnalyticsV2WriterContract
      >;
      expect(contractKeys.length).toBeGreaterThan(0);
      for (const key of contractKeys) {
        expect(typeof proxy[key]).toBe('function');
      }
    });

    it('proxies every method on CasesActivityV2WriterContract', () => {
      const proxy = buildService().getActivityWriter();
      const contractKeys = Object.keys(V2_NOOP_ACTIVITY_WRITER) as Array<
        keyof CasesActivityV2WriterContract
      >;
      expect(contractKeys.length).toBeGreaterThan(0);
      for (const key of contractKeys) {
        expect(typeof proxy[key]).toBe('function');
      }
    });

    it('proxies every method on CasesAttachmentsV2WriterContract', () => {
      const proxy = buildService().getAttachmentsWriter();
      const contractKeys = Object.keys(V2_NOOP_ATTACHMENTS_WRITER) as Array<
        keyof CasesAttachmentsV2WriterContract
      >;
      expect(contractKeys.length).toBeGreaterThan(0);
      for (const key of contractKeys) {
        expect(typeof proxy[key]).toBe('function');
      }
    });
  });

  describe('data view refresher proxy', () => {
    // Same pattern as the writer proxy: the refresher reference is captured
    // by the cases client factory once at initialize-time and bound into
    // every templates service instance. It must stay stable + always
    // resolvable across the v2 service's whole lifecycle.

    it('returns the same callable reference across calls', () => {
      const service = buildService();
      const refA = service.getDataViewRefresher();
      const refB = service.getDataViewRefresher();

      expect(refA).toBe(refB);
      expect(typeof refA).toBe('function');
    });

    it('no-ops safely when v2 is disabled (no underlying data view service)', () => {
      const service = buildService();
      const refresher = service.getDataViewRefresher();

      expect(() =>
        refresher({
          spaceId: 'default',
          request: {} as unknown as KibanaRequest,
          savedObjectsClient: {} as unknown as SavedObjectsClientContract,
        })
      ).not.toThrow();
    });

    it('exposes a no-op sentinel for callers that need a default before the service initializes', () => {
      expect(typeof V2_NOOP_DATA_VIEW_REFRESHER).toBe('function');
      // No-op sentinel must accept the same shape callers will actually pass.
      expect(() =>
        V2_NOOP_DATA_VIEW_REFRESHER({
          spaceId: 'default',
          request: {} as unknown as KibanaRequest,
          savedObjectsClient: {} as unknown as SavedObjectsClientContract,
        })
      ).not.toThrow();
      // Returns void.
      expect(
        V2_NOOP_DATA_VIEW_REFRESHER({
          spaceId: 'default',
          request: {} as unknown as KibanaRequest,
          savedObjectsClient: {} as unknown as SavedObjectsClientContract,
        })
      ).toBeUndefined();
    });
  });

  describe('start() — writer swap is gated per-surface on bootstrap success', () => {
    // Regression guard for the data-integrity fix: if an index fails to
    // bootstrap, its writer must stay a no-op so a later write can't
    // implicitly create a mis-mapped `.cases*` index (auto_create_index).
    // Observable via the ES client — a real writer reaches `esClient.index`,
    // a no-op never does.
    const buildStartedService = () =>
      new CasesAnalyticsV2Service({
        logger: loggerMock.create(),
        enabled: true,
        reconciliationIntervalMinutes: 30,
        enableAdminRoutes: false,
        resetTaskTimeoutMinutes: 60,
        resetPageDelayMs: 0,
      });

    const startService = async (service: CasesAnalyticsV2Service) => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      await service.start({
        esClient,
        taskManager: taskManagerMock.createStart(),
        internalSavedObjectsClient: savedObjectsClientMock.create(),
        dataViewsService: {} as unknown as DataViewsServerPluginStart,
      });
      return esClient;
    };

    // Fire-and-forget writes settle on a microtask; flush before asserting.
    const flush = () => new Promise((r) => setImmediate(r));

    afterEach(() => jest.clearAllMocks());

    it('swaps in both real writers when both indices bootstrap', async () => {
      (ensureCaseIndex as jest.Mock).mockResolvedValue(undefined);
      (ensureActivityIndex as jest.Mock).mockResolvedValue(undefined);
      const service = buildStartedService();
      const esClient = await startService(service);

      service.getWriter().upsertCase(makeCase('c-1'));
      service.getActivityWriter().upsertAction(makeUserAction('ua-1'));
      await flush();

      // One index call per surface — both writers are live.
      expect(esClient.index).toHaveBeenCalledTimes(2);
    });

    it('keeps the case writer a no-op when .cases bootstrap fails', async () => {
      (ensureCaseIndex as jest.Mock).mockRejectedValue(new Error('shard limit'));
      (ensureActivityIndex as jest.Mock).mockResolvedValue(undefined);
      const service = buildStartedService();
      const esClient = await startService(service);

      service.getWriter().upsertCase(makeCase('c-1')); // gated → no ES write
      service.getActivityWriter().upsertAction(makeUserAction('ua-1')); // live
      await flush();

      expect(esClient.index).toHaveBeenCalledTimes(1);
      expect((esClient.index as unknown as jest.Mock).mock.calls[0][0].id).toBe('ua-1');
    });

    it('keeps the activity writer a no-op when .cases-activity bootstrap fails', async () => {
      (ensureCaseIndex as jest.Mock).mockResolvedValue(undefined);
      (ensureActivityIndex as jest.Mock).mockRejectedValue(new Error('shard limit'));
      const service = buildStartedService();
      const esClient = await startService(service);

      service.getWriter().upsertCase(makeCase('c-1')); // live
      service.getActivityWriter().upsertAction(makeUserAction('ua-1')); // gated → no ES write
      await flush();

      expect(esClient.index).toHaveBeenCalledTimes(1);
      expect((esClient.index as unknown as jest.Mock).mock.calls[0][0].id).toBe('c-1');
    });
  });

  describe('triggerBackfillReconciliation', () => {
    const build = (enabled: boolean) =>
      new CasesAnalyticsV2Service({
        logger: loggerMock.create(),
        enabled,
        reconciliationIntervalMinutes: 30,
        enableAdminRoutes: false,
        resetTaskTimeoutMinutes: 60,
        resetPageDelayMs: 0,
      });

    const startWithTaskManager = async (service: CasesAnalyticsV2Service) => {
      (ensureCaseIndex as jest.Mock).mockResolvedValue(undefined);
      (ensureActivityIndex as jest.Mock).mockResolvedValue(undefined);
      const taskManager = taskManagerMock.createStart();
      await service.start({
        esClient: elasticsearchServiceMock.createElasticsearchClient(),
        taskManager,
        internalSavedObjectsClient: savedObjectsClientMock.create(),
        dataViewsService: {} as unknown as DataViewsServerPluginStart,
      });
      return taskManager;
    };

    afterEach(() => jest.clearAllMocks());

    it('no-ops when v2 is disabled', async () => {
      const service = build(false);
      await expect(service.triggerBackfillReconciliation()).resolves.toBeUndefined();
    });

    it('no-ops when the service has not started (no task manager captured yet)', async () => {
      const service = build(true); // enabled but start() never called
      await expect(service.triggerBackfillReconciliation()).resolves.toBeUndefined();
    });

    it('schedules the dedicated full-reset task (throttled, cursor-seeding) rather than clearing the periodic cursor', async () => {
      const service = build(true);
      const taskManager = await startWithTaskManager(service);

      await service.triggerBackfillReconciliation();

      // Routes through the one-shot reset task: removes any in-flight reset first (singleton id),
      // then schedules a fresh one. It must NOT touch the periodic reconciliation task's state.
      expect(taskManager.removeIfExists).toHaveBeenCalledWith(RESET_TASK_ID);
      expect(taskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ id: RESET_TASK_ID, taskType: RESET_TASK_TYPE })
      );
      expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
    });

    it('never throws when scheduling the reset task fails', async () => {
      const service = build(true);
      const taskManager = await startWithTaskManager(service);
      (taskManager.schedule as jest.Mock).mockRejectedValue(new Error('tm down'));

      await expect(service.triggerBackfillReconciliation()).resolves.toBeUndefined();
    });

    it('clears the per-space data-view bootstrap cache so migrated runtime fields project on next request', async () => {
      const service = build(true);
      await startWithTaskManager(service);

      // The migration creates templates via raw `repo.create`, bypassing the lifecycle hook that
      // normally refreshes per-space data views. Clearing the bootstrap cache is what forces the next
      // cases request to recompute the runtime-field map instead of waiting out the cache TTL.
      const dataViewService = (
        service as unknown as {
          dataViewService: { clearBootstrapCache: () => void };
        }
      ).dataViewService;
      const clearSpy = jest.spyOn(dataViewService, 'clearBootstrapCache');

      await service.triggerBackfillReconciliation();

      expect(clearSpy).toHaveBeenCalledTimes(1);
    });

    it('still clears the bootstrap cache even when scheduling the reset task fails', async () => {
      const service = build(true);
      const taskManager = await startWithTaskManager(service);
      (taskManager.schedule as jest.Mock).mockRejectedValue(new Error('tm down'));

      // The cache clear runs before (and independently of) the scheduling try/catch, so a Task
      // Manager failure must not strand the stale data views.
      const dataViewService = (
        service as unknown as {
          dataViewService: { clearBootstrapCache: () => void };
        }
      ).dataViewService;
      const clearSpy = jest.spyOn(dataViewService, 'clearBootstrapCache');

      await service.triggerBackfillReconciliation();

      expect(clearSpy).toHaveBeenCalledTimes(1);
    });
  });
});
