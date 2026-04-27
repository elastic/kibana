/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { ViewSyncService } from './view_sync_service';

const setupArgs = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  // No extended fields discovered → no per-owner extended-field EVALs.
  // Tests focused on extended-field discovery live in
  // mapping_fields_loader.test.ts.
  esClient.search.mockResolvedValue({
    took: 0,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
  } as never);
  esClient.transport.request.mockResolvedValue({ statusCode: 200, body: {} });
  return { esClient, logger };
};

describe('ViewSyncService', () => {
  describe('regenerateNow', () => {
    it('PUTs all 9 views (3 owners × 3 surfaces) on a single regenerate', async () => {
      const { esClient, logger } = setupArgs();
      const svc = new ViewSyncService({ esClient, logger });
      await svc.regenerateNow();
      expect(esClient.transport.request).toHaveBeenCalledTimes(9);
      const putPaths = esClient.transport.request.mock.calls.map(([params]) => {
        const p = params as { method: string; path: string };
        expect(p.method).toBe('PUT');
        return p.path;
      });
      expect(new Set(putPaths)).toEqual(
        new Set([
          '/_query/view/cases.case.cases',
          '/_query/view/cases.case.observability',
          '/_query/view/cases.case.securitysolution',
          '/_query/view/cases.case_activity.cases',
          '/_query/view/cases.case_activity.observability',
          '/_query/view/cases.case_activity.securitysolution',
          '/_query/view/cases.case_lifecycle.cases',
          '/_query/view/cases.case_lifecycle.observability',
          '/_query/view/cases.case_lifecycle.securitysolution',
        ])
      );
    });

    it('records lastRegenAt and clears lastRegenError on success', async () => {
      const { esClient, logger } = setupArgs();
      const svc = new ViewSyncService({ esClient, logger });
      await svc.regenerateNow();
      const status = svc.getStatus();
      expect(status.lastRegenAt).toBeInstanceOf(Date);
      expect(status.lastRegenError).toBeNull();
      expect(status.regenInFlight).toBe(false);
    });

    it('downgrades the security_exception from missing manage_view to a WARN with operator guidance, not an ERROR (kibana_system gap is expected on this branch)', async () => {
      /*
       * FAILURE SCENARIO: plugin-start fire-and-forget regen runs as
       * kibana_system, which lacks manage_view on cases.* until the
       * parallel ES role change ships. Logging this as ERROR every
       * Kibana start would be noisy and misleading — operators can
       * land views via the rebuild route. Downgrade to WARN with a
       * clear next-step hint.
       */
      const { esClient, logger } = setupArgs();
      const securityExc = new EsErrors.ResponseError({
        statusCode: 403,
        body: {
          error: {
            type: 'security_exception',
            reason:
              'action [indices:admin/esql/view/put] is unauthorized for user [kibana_system] with effective roles [kibana_system] on indices [cases.case.cases], this action is granted by the index privileges [create_view,manage_view,manage,all]',
          },
        },
        headers: {},
        meta: {} as never,
        warnings: null,
      });
      esClient.transport.request.mockRejectedValueOnce(securityExc);
      const svc = new ViewSyncService({ esClient, logger });

      await expect(svc.regenerateNow()).resolves.toBeUndefined();

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'POST /internal/cases/_analytics/views/_rebuild'
        )
      );
      // The status still reflects the failure so the rebuild route can
      // surface it in its response body.
      expect(svc.getStatus().lastRegenError).toContain('security_exception');
    });

    it('logs and surfaces error on the status object when ES rejects, but does not throw to the caller (fire-and-forget contract)', async () => {
      /*
       * FAILURE SCENARIO: ES is unhealthy and the PUT _query/view call fails.
       * The view sync service is invoked from the templates client write
       * path (fire-and-forget); throwing here would surface ES errors
       * inside template create/update/delete responses, which is wrong.
       */
      const { esClient, logger } = setupArgs();
      esClient.transport.request.mockRejectedValueOnce(new Error('cluster_block'));
      const svc = new ViewSyncService({ esClient, logger });
      await expect(svc.regenerateNow()).resolves.toBeUndefined();
      const status = svc.getStatus();
      expect(status.lastRegenError).toBe('cluster_block');
      expect(status.lastRegenAt).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ES|QL view regeneration failed: cluster_block'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('returns the same in-flight promise when called concurrently (single-flight)', async () => {
      const { esClient, logger } = setupArgs();
      // Hold the first regen open until we explicitly release it so we can
      // observe the second concurrent call piggybacking on it.
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      esClient.transport.request.mockImplementationOnce(async () => {
        await gate;
        return { statusCode: 200, body: {} };
      });

      const svc = new ViewSyncService({ esClient, logger });
      const first = svc.regenerateNow();
      const second = svc.regenerateNow();
      // Both promises represent the same "current" in-flight regen.
      expect(first).toBe(second);

      release();
      await first;
      // 9 PUTs from the original regen + 9 from the queued follow-up
      // (the second concurrent call set regenAfterCurrent → re-runs).
      // We don't assert the exact count here because it depends on timer
      // semantics, but it must be at least 9.
      expect(esClient.transport.request.mock.calls.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('scheduleRegeneration (debounce + coalesce)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('coalesces a burst of writes into one regenerate after the debounce window', async () => {
      const { esClient, logger } = setupArgs();
      const svc = new ViewSyncService({ esClient, logger, debounceMs: 100 });

      svc.scheduleRegeneration();
      svc.scheduleRegeneration();
      svc.scheduleRegeneration();

      // Before the timer fires, no PUTs have been issued.
      expect(esClient.transport.request).not.toHaveBeenCalled();

      // advanceTimersByTimeAsync also flushes microtasks between timer
      // ticks, which is required because the regenerate awaits per-owner
      // template loads + per-view PUTs (15 awaits per cycle).
      await jest.advanceTimersByTimeAsync(100);

      // Exactly one regen ran — three calls within the debounce window
      // collapsed into a single 9-PUT regenerate.
      expect(esClient.transport.request).toHaveBeenCalledTimes(9);
    });

    it('resets the debounce window when called again before the timer fires', async () => {
      const { esClient, logger } = setupArgs();
      const svc = new ViewSyncService({ esClient, logger, debounceMs: 100 });

      svc.scheduleRegeneration();
      await jest.advanceTimersByTimeAsync(50);
      svc.scheduleRegeneration();
      await jest.advanceTimersByTimeAsync(50);
      // The second schedule reset the timer; we are at 100ms total elapsed
      // but only 50ms since the latest schedule, so no regen yet.
      expect(esClient.transport.request).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(50);
      await Promise.resolve();
      await Promise.resolve();
      expect(esClient.transport.request).toHaveBeenCalledTimes(9);
    });
  });

  describe('stop', () => {
    it('cancels a pending debounced regenerate', async () => {
      jest.useFakeTimers();
      try {
        const { esClient, logger } = setupArgs();
        const svc = new ViewSyncService({ esClient, logger, debounceMs: 100 });
        svc.scheduleRegeneration();
        await svc.stop();
        jest.advanceTimersByTime(500);
        expect(esClient.transport.request).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getViewNames', () => {
    it('returns the 9 owned view names so the status route and legacy-cleanup route share one source of truth', () => {
      const { esClient, logger } = setupArgs();
      const svc = new ViewSyncService({ esClient, logger });
      expect(svc.getViewNames()).toEqual(
        expect.arrayContaining([
          'cases.case.securitysolution',
          'cases.case_activity.securitysolution',
          'cases.case_lifecycle.securitysolution',
          'cases.case.observability',
          'cases.case_activity.observability',
          'cases.case_lifecycle.observability',
          'cases.case.cases',
          'cases.case_activity.cases',
          'cases.case_lifecycle.cases',
        ])
      );
      expect(svc.getViewNames()).toHaveLength(9);
    });
  });
});
