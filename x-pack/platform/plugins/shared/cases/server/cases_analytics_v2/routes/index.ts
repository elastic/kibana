/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  CASES_ANALYTICS_V2_RECONCILE_RUN_SOON_URL,
  CASES_ANALYTICS_V2_RESET_URL,
  CASES_ANALYTICS_V2_STATE_URL,
  CASE_INDEX_NAME,
} from '../constants';
import { CASE_DATA_VIEW_ID_PREFIX } from '../data_view/data_view_specs';
import {
  RECONCILIATION_TASK_ID,
  RECONCILIATION_TASK_TYPE,
  resetReconciliationTask,
} from '../reconciliation';
import { ensureCaseIndex } from '../ensure_indices/case';

const DATA_VIEW_SO_TYPE = 'index-pattern';

/**
 * Authorization shape for every operator route in this module. The
 * routes are intentionally **superuser-only** — they're not customer-facing,
 * and granting any subset of operator-route access via a Kibana feature
 * privilege would broaden the attack surface (anyone with that feature
 * could `/reset` the index). Cluster privilege check via `superuser`
 * keeps the security model trivial.
 *
 * Not `as const` because `core.http.createRouter`'s `RouteSecurity` shape
 * requires mutable arrays — the deep-readonly inference rejects literal
 * assignment otherwise.
 */
const SUPERUSER_AUTHZ = {
  authz: {
    requiredPrivileges: [{ allRequired: ['superuser'] }],
  },
};

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
   * Wipes the data view service's in-memory "bootstrapped spaces" cache.
   * `/reset` deletes per-space data views directly via the SO API, so the
   * data view sub-service's process-local cache must be cleared too —
   * otherwise it would still believe those spaces had been bootstrapped
   * and skip re-creation on the next request. No-op if v2 hasn't started.
   */
  clearDataViewBootstrapCache: () => void;
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
  clearDataViewBootstrapCache,
  enabled,
}: RegisterArgs): void => {
  const router = core.http.createRouter();
  const log = logger.get('routes');

  // GET /internal/cases/_analyticsV2/state
  router.get(
    {
      path: CASES_ANALYTICS_V2_STATE_URL,
      // Reading analytics-subsystem health surfaces config + last-tick
      // counters. Doesn't expose case data. See SUPERUSER_AUTHZ for the
      // rationale behind cluster-privilege gating vs a feature privilege.
      security: SUPERUSER_AUTHZ,
      validate: {},
      options: { access: 'internal' },
    },
    async (context, _request, response) => {
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

      // Check `.cases` existence so an operator looking at /state sees the
      // bootstrap result, not just the config flag. `ensureCaseIndex`
      // logs-and-continues on failure, so a misconfigured cluster can end
      // up with `enabled: true` but no index — surfacing this here saves
      // an on-call engineer from a wild-goose chase.
      let indexExists = false;
      try {
        const coreContext = await context.core;
        indexExists = await coreContext.elasticsearch.client.asInternalUser.indices.exists({
          index: CASE_INDEX_NAME,
        });
      } catch (err) {
        log.warn(
          `failed to check ${CASE_INDEX_NAME} existence: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }

      return response.ok({
        body: {
          enabled,
          index: CASE_INDEX_NAME,
          index_exists: indexExists,
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
      security: SUPERUSER_AUTHZ,
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
  // Full subsystem reset: drops `.cases`, deletes every per-space `Cases`
  // data view, clears reconciliation task state, and triggers a full
  // reconciliation that will repopulate the index from the SO source of
  // truth. The next request in each space will lazily re-create that
  // space's data view (with current template runtime fields).
  //
  // Useful for: mapping migrations, recovering from sustained writer
  // failures that left the index inconsistent, operator-initiated full
  // backfills, or refreshing data view runtime fields after templates
  // change.
  router.post(
    {
      path: CASES_ANALYTICS_V2_RESET_URL,
      security: SUPERUSER_AUTHZ,
      validate: {},
      options: { access: 'internal' },
    },
    async (context, _request, response) => {
      const taskManager = getTaskManager();
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asInternalUser;
      const soClient = coreContext.savedObjects.client;

      try {
        // 1. Drop existing index. 404 is fine — reset on an empty cluster.
        await esClient.indices
          .delete({ index: CASE_INDEX_NAME })
          .catch((err: { meta?: { statusCode?: number }; statusCode?: number }) => {
            const status = err?.statusCode ?? err?.meta?.statusCode;
            if (status === 404) return;
            throw err;
          });

        // 2. Recreate `.cases` via the same bootstrap used at plugin start.
        await ensureCaseIndex({ esClient, logger: log });

        // 3. Delete every per-space data view. Each lives in a single space
        //    (it's a namespaced SO), so we walk every namespace and delete
        //    each match.
        const deletedDataViews = await deleteAllPerSpaceCasesDataViews(soClient, log);

        // 4. Clear the data view sub-service's in-memory bootstrapped-spaces
        //    cache. Without this, the next request in a previously-bootstrapped
        //    space would skip the ensure check and the user would see no
        //    data view until process restart.
        clearDataViewBootstrapCache();

        // 5. Reset reconciliation task state + trigger an immediate tick.
        //
        // **Critical**: we must clear the task's persisted state before
        // running. Without this step, the next tick uses the existing
        // `last_run_at` cursor and only walks cases updated since that
        // timestamp — every case older than the cursor stays missing from
        // the new index. The reset helper removes the task SO and
        // re-schedules a fresh one with empty state, so the next tick sees
        // no cursor and walks every case.
        //
        // If Task Manager isn't available (v2 disabled), we still report
        // the reset succeeded — the index exists, ready for writes once
        // the flag flips on.
        let reconcileResult: string | null = null;
        if (taskManager != null) {
          try {
            await resetReconciliationTask({ taskManager, logger: log });
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
            data_views_deleted: deletedDataViews,
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

/**
 * Page through every data view SO across every space and delete the ones
 * whose id begins with `CASE_DATA_VIEW_ID_PREFIX`. Returns the count of
 * deletions for the response body. Per-item errors log at WARN and the
 * walk continues — best-effort cleanup is preferred over aborting on a
 * single failure.
 *
 * Note: `index-pattern` SOs are namespaced (one space per SO). We pass
 * the SO's `namespaces[0]` explicitly on delete because the request-scoped
 * client we use is scoped to the route's space, not necessarily the data
 * view's. With `namespace` set, the SO API deletes from the right space.
 */
async function deleteAllPerSpaceCasesDataViews(
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<number> {
  const PAGE_SIZE = 100;
  let page = 1;
  let deleted = 0;

  while (true) {
    const result = await soClient.find({
      type: DATA_VIEW_SO_TYPE,
      namespaces: ['*'],
      perPage: PAGE_SIZE,
      page,
    });

    for (const so of result.saved_objects) {
      // Only act on data views we manage; everything else is left untouched.
      if (so.id.startsWith(CASE_DATA_VIEW_ID_PREFIX)) {
        const namespace = so.namespaces?.[0];
        try {
          await soClient.delete(DATA_VIEW_SO_TYPE, so.id, { namespace });
          deleted++;
        } catch (err) {
          logger.warn(
            `reset: failed to delete data view ${so.id} (space=${namespace ?? 'unknown'}): ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    }

    if (result.saved_objects.length < PAGE_SIZE) break;
    page++;
  }

  return deleted;
}
