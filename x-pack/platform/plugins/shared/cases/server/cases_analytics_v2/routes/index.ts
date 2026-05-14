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
import { runReconciliation, type RunReconciliationResult } from '../reconciliation/runner';
import { ensureCaseIndex } from '../ensure_indices/case';
import type { CasesAnalyticsV2WriterContract } from '../writer';

const DATA_VIEW_SO_TYPE = 'index-pattern';

/**
 * Authorization shape for every administrator route in this module.
 * **Superuser-only** — these aren't customer-facing, and routing them
 * through a Kibana feature privilege would broaden the attack surface
 * (anyone holding that feature could `/reset` the index). Cluster
 * privilege keeps the model trivial.
 *
 * Not `as const` because `core.http.createRouter`'s `RouteSecurity` shape
 * requires mutable arrays — deep-readonly inference rejects literal
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
   * Late-bound — the internal SO client is constructed during plugin
   * `start()`, after routes are registered in `setup()`. `/reset` needs an
   * unscoped client to delete per-space `index-pattern` SOs across
   * namespaces; the request-scoped client (`coreContext.savedObjects.client`)
   * is bound by the spaces extension to the requester's namespace and 404s
   * on any data view that lives elsewhere — even with `force: true`,
   * because the spaces extension performs the existence check before
   * delegating the delete.
   */
  getInternalSavedObjectsClient: () => SavedObjectsClientContract | null;
  /**
   * Late-bound — the analytics writer is constructed during plugin
   * `start()` (it holds the live ES client). `/reset` calls
   * `runReconciliation` directly with `lastRunAt: undefined` (bypassing
   * Task Manager's `runSoon` — see the reset handler for the rationale)
   * and needs the writer to dispatch the full re-walk's bulk upserts.
   */
  getWriter: () => CasesAnalyticsV2WriterContract | null;
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
   * through `/state` so administrators can confirm whether v2 is active.
   */
  enabled: boolean;
  /**
   * Resolved config value for
   * `xpack.cases.analyticsV2.reconciliationIntervalMinutes`. Threaded into
   * the `/reset` handler so the re-scheduled task picks the configured
   * cadence rather than reverting to a hard-coded default.
   */
  reconciliationIntervalMinutes: number;
}

/**
 * Administrator support routes for cases-analytics v2. **Superuser-only**
 * (see `SUPERUSER_AUTHZ`); registered directly on `core.http.createRouter()`
 * so they bypass the cases client surface, which doesn't expose the
 * analytics subsystem. Missing dependencies (e.g. Task Manager not yet
 * available) return `503` so callers can retry.
 */
export const registerCasesAnalyticsV2Routes = ({
  core,
  logger,
  getTaskManager,
  getInternalSavedObjectsClient,
  getWriter,
  clearDataViewBootstrapCache,
  enabled,
  reconciliationIntervalMinutes,
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

      // Check `.cases` existence so /state reports the bootstrap result,
      // not just the config flag. `ensureCaseIndex` logs-and-continues on
      // failure, so a misconfigured cluster can have `enabled: true` with
      // no index — surfacing this here saves a wild-goose chase.
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
  // backfill from the SO source of truth. Per-space data views are lazily
  // re-created on the next request (with current template runtime fields).
  // Used for mapping migrations, recovering from sustained writer
  // failures, administrator-initiated full backfills, and refreshing
  // data view runtime fields after templates change.
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
      // Per-space data view cleanup AND the post-reset full re-walk both
      // need an unscoped SO client (see `getInternalSavedObjectsClient`
      // JSDoc above). The walk in step 5 also needs the analytics writer.
      // The reset path is gated on both being available — when either is
      // `null` (v2 hasn't started, or `analyticsV2.enabled` flipped to
      // false at runtime) we 503 rather than half-completing the reset
      // (drop + recreate the index but never repopulate it).
      const internalSoClient = getInternalSavedObjectsClient();
      const writer = getWriter();
      if (internalSoClient == null || writer == null) {
        return response.customError({
          statusCode: 503,
          body: {
            message:
              'cases-analyticsV2 is not ready (writer or internal SO client unavailable); v2 is likely disabled or still starting.',
          },
        });
      }

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
        //    each match. Uses the internal (unscoped) SO client so the
        //    cross-namespace deletes don't 404 against the requester's
        //    space — see `getInternalSavedObjectsClient` JSDoc.
        const deletedDataViews = await deleteAllPerSpaceCasesDataViews(internalSoClient, log);

        // 4. Clear the data view sub-service's in-memory bootstrapped-spaces
        //    cache. Without this, the next request in a previously-bootstrapped
        //    space would skip the ensure check and the user would see no
        //    data view until process restart.
        clearDataViewBootstrapCache();

        // 5. Full re-walk to repopulate `.cases`, in-handler — NOT via
        //    Task Manager.
        //
        //    The previous implementation re-scheduled the periodic task
        //    with empty state and called `runSoon`. That looked correct
        //    on paper but had two race windows that produced exactly the
        //    symptom the user hit: after `/reset`, the index stays empty
        //    and only cases the user later patches re-appear (via the
        //    fire-and-forget write hook).
        //
        //      Race 1: `taskManager.remove` failing for any reason other
        //      than 404 (cluster blip, locked SO, transient ES error)
        //      surfaced as a WARN but did NOT abort. The follow-up
        //      `ensureScheduled` then no-ops because the SO still exists,
        //      so the task's persisted state survives unchanged. The next
        //      tick — including the one `runSoon` triggers — uses the
        //      stale cursor and filters out every case with
        //      `updated_at < stale_cursor`.
        //
        //      Race 2: even when `remove` succeeded, an in-flight tick
        //      that started before the reset can finish *after* the new
        //      task SO is scheduled and write its result back to the same
        //      id, clobbering the fresh `state: {}` with its own old
        //      cursor — and again the next run inherits stale state.
        //
        //    Walking here, in the handler, removes both races: we hold a
        //    direct writer reference, `lastRunAt: undefined` is hardcoded,
        //    and no Task Manager state needs to survive between this call
        //    and the walk's start.
        //
        //    A failure mid-walk leaves `.cases` partially populated. The
        //    runner's filter has an unconditional `updated_at IS NULL`
        //    branch (see `runner.ts`), so any case missed by a partial
        //    walk that hasn't been patched still gets re-emitted on every
        //    subsequent periodic tick. A user-initiated retry of `/reset`
        //    is also idempotent.
        let walkResult: RunReconciliationResult | null = null;
        try {
          walkResult = await runReconciliation({
            savedObjectsClient: internalSoClient,
            writer,
            logger: log,
            lastRunAt: undefined,
          });
        } catch (err) {
          log.warn(
            `reset: full re-walk failed mid-flight: ${
              err instanceof Error ? err.message : String(err)
            }. Index is partially populated; the periodic reconciliation task will continue to fill it in.`
          );
        }

        // 6. Seed the periodic reconciliation task's cursor so the next
        //    scheduled tick walks only the post-walk delta. If we left
        //    the task at empty state, every periodic tick would walk
        //    every case — expensive and unnecessary now that step 5
        //    already did the full backfill. Falls back to "now" if the
        //    walk failed, which means the next tick walks only updates
        //    that arrive from this moment forward; orphan / never-patched
        //    cases still get caught by the runner's unconditional
        //    `updated_at IS NULL` branch.
        const cursorForNextTick = walkResult?.newLastRunAt ?? new Date().toISOString();
        if (taskManager != null) {
          try {
            await resetReconciliationTask({
              taskManager,
              logger: log,
              intervalMinutes: reconciliationIntervalMinutes,
              initialState: { last_run_at: cursorForNextTick },
            });
          } catch (err) {
            log.warn(
              `reset: failed to seed reconciliation cursor: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }

        return response.ok({
          body: {
            reset: CASE_INDEX_NAME,
            data_views_deleted: deletedDataViews,
            processed: walkResult?.processed ?? null,
            next_reconciliation_cursor: cursorForNextTick,
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
 * Two-pass shape:
 *   1. Walk every page of `index-pattern` SOs, collecting only the ids
 *      that match our prefix. No deletes inside the loop.
 *   2. Delete the collected ids.
 * A single-pass implementation that deleted while iterating would shift
 * subsequent page offsets — items at positions `[N*PAGE_SIZE..]` would
 * move onto an already-walked page and be skipped. Since `/reset` is a
 * rare administrator action and missed data views are lazily recreated on
 * the next cases request in that space, this isn't a correctness bug for
 * the user — but it shows up as `data_views_deleted` undercounts in the
 * response and as orphaned SOs in `.kibana`, both of which a tenant-scale
 * `/reset` would surface.
 *
 * Notes:
 *   - **Must be called with an internal (unscoped) SO client.** A request-
 *     scoped client passes through the spaces extension, which scopes
 *     `delete` to the requester's namespace and 404s on any data view that
 *     doesn't live in that exact space — even with `force: true`, because
 *     the spaces extension's existence check runs before delegating the
 *     delete to the underlying repository. The caller (`/reset` handler)
 *     resolves the internal client from the v2 service's start-time
 *     bindings.
 *   - `index-pattern` is a multi-namespace SO type (`namespaceType: 'multiple'`).
 *     **Each delete is issued against the SO's own namespace**, not the
 *     internal client's implicit default. The SO repository's `delete`
 *     preflight (`preflightCheckNamespaces` in
 *     `core/saved-objects/api-server-internal/.../delete.ts`) returns
 *     `found_outside_namespace` and surfaces as a 404 if the SO's
 *     `namespaces` array doesn't include the namespace we pass — and the
 *     internal client's implicit default is `'default'`, so any data view
 *     that lives in `analytics-1`, `analytics-2`, etc. would never be
 *     deletable without this. `force: true` only widens the multi-share
 *     case (SO in N spaces); it does NOT bypass the preflight on the
 *     namespace mismatch. Together they handle every shape — single-space
 *     view (the common case), multi-space share (via `force`), and the
 *     cross-namespace cleanup path (via the explicit namespace arg).
 *   - **404 on delete is treated as success.** An unscoped client should
 *     not normally 404 on an id we just enumerated with its namespace,
 *     but a concurrent `/reset` (or out-of-band SO deletion via the Stack
 *     Management UI) between pass 1 and pass 2 can race the delete. The
 *     desired end state is "data view gone," which the 404 path already
 *     satisfies.
 */
export async function deleteAllPerSpaceCasesDataViews(
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<number> {
  const PAGE_SIZE = 100;

  // Pass 1: collect matching ids. Pagination is stable because we don't
  // mutate the index while walking it.
  const targets: Array<{ id: string; namespace: string | undefined }> = [];
  let page = 1;
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
        targets.push({ id: so.id, namespace: so.namespaces?.[0] });
      }
    }

    if (result.saved_objects.length < PAGE_SIZE) break;
    page++;
  }

  // Pass 2: delete the collected ids. Per-item errors log at WARN and the
  // walk continues — one stuck data view shouldn't block the rest of the
  // cleanup. A 404 is a benign race outcome (concurrent `/reset` or an
  // out-of-band Stack Management deletion between pass 1 and pass 2) so we
  // log it at DEBUG and exclude it from the deletion count (the
  // disappearing-id wasn't deleted by *us*, but the desired end state is
  // satisfied).
  let deleted = 0;
  for (const target of targets) {
    try {
      await soClient.delete(DATA_VIEW_SO_TYPE, target.id, {
        // Tells the SO repository which namespace to run its existence
        // preflight against — see the "each delete is issued against the
        // SO's own namespace" note above. Falls back to `undefined`
        // (= default) for the edge case where a managed data view SO
        // somehow lacks a `namespaces` array; in that situation the
        // existing 404-as-success branch below covers the wrong-default
        // mismatch.
        namespace: target.namespace,
        force: true,
      });
      deleted++;
    } catch (err) {
      if (isSavedObjectNotFoundError(err)) {
        logger.debug(
          `reset: data view ${target.id} (space=${
            target.namespace ?? 'unknown'
          }) already gone by the time we issued delete; treating as success`
        );
        continue;
      }
      logger.warn(
        `reset: failed to delete data view ${target.id} (space=${target.namespace ?? 'unknown'}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return deleted;
}

/**
 * Detects the saved-objects "not found" surface. The SO API throws
 * `SavedObjectsErrorHelpers.createGenericNotFoundError` (404), but at the
 * SO client boundary the error can land as either a `Boom`-style object
 * with `output.statusCode === 404` or a plain `Error` whose message
 * matches `Saved object [<type>/<id>] not found`. We check all three so
 * test fixtures (which often skip the Boom shape) still take the benign
 * path.
 */
function isSavedObjectNotFoundError(err: unknown): boolean {
  if (err == null) return false;
  const status =
    (err as { statusCode?: number })?.statusCode ??
    (err as { output?: { statusCode?: number } })?.output?.statusCode ??
    (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
  if (status === 404) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /not\s+found/i.test(message);
}
