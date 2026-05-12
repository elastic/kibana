/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  CASES_ANALYTICS_V2_RECONCILE_RUN_SOON_URL,
  CASES_ANALYTICS_V2_RESET_URL,
  CASES_ANALYTICS_V2_STATE_URL,
  CASE_INDEX_NAME,
} from '../constants';
import { RECONCILIATION_TASK_ID, RECONCILIATION_TASK_TYPE } from '../reconciliation';
import { ensureCaseIndex } from '../ensure_indices/case';

interface RegisterArgs {
  core: CoreSetup;
  logger: Logger;
  /**
   * Late-bound — Task Manager's start contract isn't available at setup
   * time. The routes call `getTaskManager()` inside their handlers, so the
   * registration site can pass a closure that resolves once start runs.
   */
  getTaskManager: () => TaskManagerStartContract | null;
  /**
   * Resolved config value for `xpack.cases.analyticsV2.enabled` — surfaced
   * through `/state` so operators can confirm whether v2 is active.
   */
  enabled: boolean;
}

/**
 * Operator support routes for cases-analytics v2.
 *
 * These are intentionally **superuser-only**. They're not customer-facing —
 * they exist so on-call has a path other than direct `_search` against system
 * indices when something looks wrong. Registered directly on
 * `core.http.createRouter()` rather than through the cases client because
 * they need access to the analytics subsystem, which doesn't live on the
 * cases client surface.
 *
 * Failure mode for each route is conservative: a missing dependency (e.g.
 * Task Manager not yet available) returns `503` rather than crashing so the
 * caller can retry.
 */
export const registerCasesAnalyticsV2Routes = ({
  core,
  logger,
  getTaskManager,
  enabled,
}: RegisterArgs): void => {
  const router = core.http.createRouter();
  const log = logger.get('routes');

  // GET /internal/cases/_analyticsV2/state
  router.get(
    {
      path: CASES_ANALYTICS_V2_STATE_URL,
      security: {
        authz: {
          // Reading analytics-subsystem health surfaces config + last-tick
          // counters. Doesn't expose case data. Restricted to superuser via
          // the standard cluster privilege rather than wiring a new
          // cases-feature privilege for support tooling.
          requiredPrivileges: [{ allRequired: ['superuser'] }],
        },
      },
      validate: {},
      options: { access: 'internal' },
    },
    async (_context, _request, response) => {
      // Pull the live reconciliation task to surface its last run + state
      // (which holds the cursor + processed counts).
      const taskManager = getTaskManager();
      let lastRun: {
        last_run_at?: string;
        runs?: number;
        next_run_at?: string;
        status?: string;
      } | null = null;

      if (taskManager != null) {
        try {
          const tasks = await taskManager.fetch({
            query: { bool: { filter: [{ term: { 'task.taskType': RECONCILIATION_TASK_TYPE } }] } },
          });
          const task = tasks.docs[0];
          if (task != null) {
            const state = (task.state ?? {}) as { last_run_at?: string };
            lastRun = {
              last_run_at: state.last_run_at,
              runs: task.attempts,
              next_run_at:
                task.runAt instanceof Date
                  ? task.runAt.toISOString()
                  : (task.runAt as unknown as string),
              status: task.status,
            };
          }
        } catch (err) {
          log.warn(
            `failed to read reconciliation task state: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

      return response.ok({
        body: {
          enabled,
          index: CASE_INDEX_NAME,
          reconciliation: {
            task_type: RECONCILIATION_TASK_TYPE,
            last_run: lastRun,
          },
        },
      });
    }
  );

  // POST /internal/cases/_analyticsV2/reconcile/run_soon
  router.post(
    {
      path: CASES_ANALYTICS_V2_RECONCILE_RUN_SOON_URL,
      security: {
        authz: { requiredPrivileges: [{ allRequired: ['superuser'] }] },
      },
      validate: {},
      options: { access: 'internal' },
    },
    async (_context, _request, response) => {
      const taskManager = getTaskManager();
      if (taskManager == null) {
        return response.customError({
          statusCode: 503,
          body: { message: 'Task Manager not available; cases-analyticsV2 is likely disabled.' },
        });
      }
      try {
        // `runSoon` expects the task **instance** id (the persisted task SO's
        // id), not the task **type**. The singleton task instance id is
        // exported from the reconciliation module.
        const result = await taskManager.runSoon(RECONCILIATION_TASK_ID);
        return response.ok({ body: { id: RECONCILIATION_TASK_ID, result } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn(`reconcile run_soon failed: ${message}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to schedule reconciliation: ${message}` },
        });
      }
    }
  );

  // POST /internal/cases/_analyticsV2/reset
  //
  // Drops the .cases index and rebuilds it from scratch, then triggers a
  // reconciliation tick. Useful for: mapping migrations, recovering from
  // sustained writer failures that left the index inconsistent, or
  // operator-initiated full backfills.
  router.post(
    {
      path: CASES_ANALYTICS_V2_RESET_URL,
      security: {
        authz: { requiredPrivileges: [{ allRequired: ['superuser'] }] },
      },
      validate: {},
      options: { access: 'internal' },
    },
    async (context, _request, response) => {
      const taskManager = getTaskManager();
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;

      try {
        // Drop existing index. 404 is fine — reset on an empty cluster.
        await esClient.indices
          .delete({ index: CASE_INDEX_NAME })
          .catch((err: { meta?: { statusCode?: number }; statusCode?: number }) => {
            const status = err?.statusCode ?? err?.meta?.statusCode;
            if (status === 404) return;
            throw err;
          });

        // Recreate via the same bootstrap used at plugin start.
        await ensureCaseIndex({ esClient, logger: log });

        // Kick off an immediate reconciliation to populate the fresh index
        // from the SO source of truth. If Task Manager isn't available
        // (analyticsV2 disabled), we still report the reset succeeded — the
        // index exists, ready for writes once the flag flips on.
        let reconcileResult: string | null = null;
        if (taskManager != null) {
          try {
            // Pass the task **instance** id (not the type) — same as
            // /reconcile/run_soon.
            const result = await taskManager.runSoon(RECONCILIATION_TASK_ID);
            reconcileResult = result.id;
          } catch (err) {
            log.warn(
              `reset: failed to schedule follow-up reconciliation: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }

        return response.ok({
          body: {
            reset: CASE_INDEX_NAME,
            reconciliation_scheduled: reconcileResult,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn(`reset failed: ${message}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to reset cases-analyticsV2 index: ${message}` },
        });
      }
    }
  );
};
