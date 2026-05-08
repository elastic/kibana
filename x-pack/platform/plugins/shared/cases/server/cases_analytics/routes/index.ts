/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  CASES_ANALYTICS_BACKFILL_RUN_SOON_URL,
  CASES_ANALYTICS_RECONCILE_RUN_SOON_URL,
  CASES_ANALYTICS_RECONCILIATION_TASK_TYPE,
  CASES_ANALYTICS_STATE_SO_ID,
  CASES_ANALYTICS_STATE_SO_TYPE,
  CASES_ANALYTICS_STATE_URL,
} from '../../../common/constants';
import type { CasesAnalyticsService } from '../service';

interface RegisterArgs {
  core: CoreSetup;
  logger: Logger;
  /**
   * Late-bound — the task manager start contract isn't available at setup
   * time. Routes call `getTaskManager()` inside their handlers, so the
   * registration site can pass a closure that resolves once start runs.
   */
  getTaskManager: () => TaskManagerStartContract | null;
  casesAnalyticsService: CasesAnalyticsService;
}

/**
 * Operator support routes for the cases-as-data subsystem.
 *
 * These are intentionally "kibana-system / superuser" only. They're not
 * customer-facing — they exist so on-call has a path other than `_search`
 * against system indices when something looks wrong. They register at
 * `core.http.createRouter()` directly rather than going through the cases
 * client because they need the analytics service, which doesn't live on the
 * cases client surface.
 */
export const registerCasesAnalyticsRoutes = ({
  core,
  logger,
  getTaskManager,
  casesAnalyticsService,
}: RegisterArgs): void => {
  const router = core.http.createRouter();
  const log = logger.get('cases.analytics.routes');

  // GET /internal/cases/_analytics/state
  router.get(
    {
      path: CASES_ANALYTICS_STATE_URL,
      security: {
        authz: {
          // Reading the analytics-subsystem health doesn't expose any case
          // data — it returns config + bootstrap progress + last-run stats.
          // Limit to superuser / kibana-admin via cluster privilege rather
          // than wiring a new cases-feature privilege for support tooling.
          requiredPrivileges: [{ allRequired: ['superuser'] }],
        },
      },
      validate: {},
      options: { access: 'internal' },
    },
    async (context, request, response) => {
      const status = casesAnalyticsService.getStatus();
      const coreContext = await context.core;
      let lastRun: { last_run_at?: string; last_run_stats?: unknown } | undefined;
      try {
        // Read the reconciliation watermark + last-run counters straight off
        // the state SO. If the SO doesn't exist yet (first start, or
        // disabled), `lastRun` stays undefined.
        const so = await coreContext.savedObjects.client.get(
          CASES_ANALYTICS_STATE_SO_TYPE,
          CASES_ANALYTICS_STATE_SO_ID
        );
        lastRun = so.attributes as typeof lastRun;
      } catch (err) {
        if (err?.output?.statusCode !== 404) {
          log.warn(`failed to read state SO for /state route: ${err.message}`);
        }
      }
      return response.ok({
        body: {
          ...status,
          last_run: lastRun ?? null,
        },
      });
    }
  );

  // POST /internal/cases/_analytics/reconcile/run_soon
  router.post(
    {
      path: CASES_ANALYTICS_RECONCILE_RUN_SOON_URL,
      security: {
        authz: {
          requiredPrivileges: [{ allRequired: ['superuser'] }],
        },
      },
      validate: {},
      options: { access: 'internal' },
    },
    async (_context, _request, response) => {
      const taskManager = getTaskManager();
      if (taskManager == null) {
        return response.customError({
          statusCode: 503,
          body: { message: 'Task manager not available; cases-as-data is likely disabled.' },
        });
      }
      try {
        const result = await taskManager.runSoon(CASES_ANALYTICS_RECONCILIATION_TASK_TYPE);
        return response.ok({ body: { id: CASES_ANALYTICS_RECONCILIATION_TASK_TYPE, result } });
      } catch (err) {
        log.warn(`reconcile run_soon failed: ${err.message}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to schedule reconciliation: ${err.message}` },
        });
      }
    }
  );

  // POST /internal/cases/_analytics/backfill/run_soon
  //
  // Backfill is implemented as a reconciliation pass with the watermark reset
  // to "before all data." Rather than introducing a separate task type, the
  // route deletes the state SO and triggers `runSoon` on the existing
  // reconciliation task — the next tick walks every SO from the beginning.
  router.post(
    {
      path: CASES_ANALYTICS_BACKFILL_RUN_SOON_URL,
      security: {
        authz: {
          requiredPrivileges: [{ allRequired: ['superuser'] }],
        },
      },
      validate: {},
      options: { access: 'internal' },
    },
    async (context, _request, response) => {
      const taskManager = getTaskManager();
      if (taskManager == null) {
        return response.customError({
          statusCode: 503,
          body: { message: 'Task manager not available; cases-as-data is likely disabled.' },
        });
      }
      const coreContext = await context.core;
      try {
        await coreContext.savedObjects.client
          .delete(CASES_ANALYTICS_STATE_SO_TYPE, CASES_ANALYTICS_STATE_SO_ID)
          .catch((err) => {
            // 404 = no prior run, which is fine for backfill.
            if (err?.output?.statusCode !== 404) throw err;
          });
        const result = await taskManager.runSoon(CASES_ANALYTICS_RECONCILIATION_TASK_TYPE);
        return response.ok({ body: { id: CASES_ANALYTICS_RECONCILIATION_TASK_TYPE, result } });
      } catch (err) {
        log.warn(`backfill run_soon failed: ${err.message}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to start backfill: ${err.message}` },
        });
      }
    }
  );
};
