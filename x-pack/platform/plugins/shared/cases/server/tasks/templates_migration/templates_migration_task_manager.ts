/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import pMap from 'p-map';
import type { CoreStart, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  RunContext,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../common/constants';
import {
  CASES_TEMPLATES_MIGRATION_TASK_TYPE,
  CASES_TEMPLATES_MIGRATION_TASK_ID,
} from './constants';
import {
  CASE_BACKFILL_FAILURE_RESCHEDULE_DELAY_MS,
  CASE_BACKFILL_RESCHEDULE_DELAY_MS,
  MAX_CASE_BACKFILL_FAILED_RUNS,
  MAX_CONCURRENT_MIGRATIONS,
} from './types';
import type { MigrationTaskState } from './types';
import { findAllConfigurations, migrateOneConfigure } from './migrate_configuration';
import {
  configureNeedsCaseBackfill,
  hasPendingCaseBackfill,
  runCaseBackfillPhase,
} from './run_case_backfill';

/**
 * Registers and schedules the one-shot task that migrates legacy (v1) templates and custom fields
 * into the v2 saved objects, and backfills existing cases' `extended_fields`. Each run has two
 * phases:
 *   1. Field definitions + templates — fast, one pass per space, idempotent via per-space flags.
 *   2. Existing-case backfill — resumable and budgeted; reschedules itself until every space is done.
 * All writes go through an internal (unscoped) SO repository; the whole task is gated by the
 * `xpack.cases.templates.enabled` feature flag at the plugin level.
 */
export class TemplatesMigrationTaskManager {
  private readonly logger: Logger;
  private internalRepo?: ISavedObjectsRepository;
  private migrationUsageCounter?: IUsageCounter;
  /**
   * Best-effort hook fired once, when the existing-case `extended_fields` backfill reaches a terminal
   * state (fully complete OR gives up) AND there was outstanding backfill work at the start of that
   * final run. Wired by the plugin to `CasesAnalyticsV2Service.triggerBackfillReconciliation`: the
   * backfill's raw SO `bulkUpdate` bumps only the SO-framework `updated_at`, not the case-domain
   * `attributes.updated_at` that analytics-v2's incremental reconciliation filters on, so without a
   * nudge the backfilled `extended_fields` would never be mirrored to `.cases`. Optional and
   * fire-and-forget — failures are logged, never propagated (see `notifyCaseBackfillComplete`).
   */
  private readonly onCaseBackfillComplete?: () => Promise<void> | void;

  constructor(
    taskManager: TaskManagerSetupContract,
    logger: Logger,
    usageCollection?: UsageCollectionSetup,
    onCaseBackfillComplete?: () => Promise<void> | void
  ) {
    this.logger = logger.get('cases_templates_v2_migration');
    this.onCaseBackfillComplete = onCaseBackfillComplete;
    this.logger.info('Registering Cases Templates V2 Migration Task');

    if (usageCollection) {
      this.migrationUsageCounter = usageCollection.createUsageCounter('CasesTemplatesV2Migration');
    }

    taskManager.registerTaskDefinitions({
      [CASES_TEMPLATES_MIGRATION_TASK_TYPE]: {
        title: 'Cases Templates V2 Migration',
        description: 'One-shot migration of legacy templates and custom fields to the v2 system',
        timeout: '10m',
        maxAttempts: 3,
        createTaskRunner: ({ taskInstance, signal }: RunContext) => {
          // Same guard as IncrementalIdTaskManager: if Task Manager fires between setup() and
          // start(), we throw and let TM mark the run as failed — it will retry on next startup.
          if (!this.internalRepo) {
            throw new Error('TemplatesMigrationTaskManager: internal repository not initialized');
          }
          const repo = this.internalRepo;
          const log = this.logger;
          const previousState = (taskInstance?.state ?? {}) as MigrationTaskState;
          // Task Manager aborts this signal on timeout/cancel; the backfill checks it between pages
          // and persists its cursor so the next run resumes rather than running past the timeout.
          return {
            run: () => this.run(repo, previousState, signal),
            cancel: async () => {
              log.debug('Cases templates v2 migration task cancelled — aborting scan');
            },
          };
        },
      },
    });
  }

  /**
   * Creates the internal SO repository and (re)schedules the task on every Kibana startup. The
   * removeIfExists + ensureScheduled pair guarantees a fresh run each startup; per-space flags keep
   * already-migrated spaces cheap no-ops. Scheduling failures are logged, never fatal to startup.
   */
  public async scheduleMigrationTask(
    taskManager: TaskManagerStartContract,
    core: CoreStart
  ): Promise<void> {
    this.internalRepo = core.savedObjects.createInternalRepository([
      CASE_CONFIGURE_SAVED_OBJECT,
      CASE_TEMPLATE_SAVED_OBJECT,
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      CASE_SAVED_OBJECT,
    ]);

    // Multi-node note: in a rolling restart, a second node may call removeIfExists while the task is
    // still executing on another node. TaskStore.remove on a locked task is best-effort; if
    // interrupted mid-run the next startup re-processes the partially-migrated space (per-space flags
    // and idempotent writes prevent duplicates).
    await taskManager.removeIfExists(CASES_TEMPLATES_MIGRATION_TASK_ID);

    try {
      await taskManager.ensureScheduled({
        id: CASES_TEMPLATES_MIGRATION_TASK_ID,
        taskType: CASES_TEMPLATES_MIGRATION_TASK_TYPE,
        params: {},
        state: {},
        scope: ['cases'],
      });
      this.logger.info(`${CASES_TEMPLATES_MIGRATION_TASK_ID} scheduled`);
    } catch (err) {
      this.logger.error(
        `Failed to schedule ${CASES_TEMPLATES_MIGRATION_TASK_ID}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * One task run: migrate every space's field definitions + templates, then advance the resumable
   * case backfill by one budgeted chunk. Returns a Task Manager run result — a `runAt` (with the
   * resume cursor in state) while the backfill has more to do, or a task deletion once it's complete.
   */
  private async run(
    repo: ISavedObjectsRepository,
    previousState: MigrationTaskState,
    signal: AbortSignal
  ) {
    const log = this.logger;
    const executionId = uuidv4();
    log.debug(`[${executionId}] Starting cases templates v2 migration`);

    const configures = await findAllConfigurations(repo, log, executionId);
    log.debug(`[${executionId}] Found ${configures.length} cases-configure SOs to inspect`);

    // Captured from the START-of-run configure snapshot (before this run flags any space), so it
    // reflects whether real case-backfill work was outstanding when the run began. Derived from the
    // restart-durable `legacyCasesMigrated` flags rather than a per-run write count, so it stays
    // correct even when the final run of a multi-run backfill re-scans already-written cases and
    // writes nothing (e.g. after a restart wiped the in-progress cursor). Combined below with a
    // post-Phase-1 recheck into `hadRealBackfillWork`, which drives the one-shot analytics
    // re-index nudge on completion — see `onCaseBackfillComplete`. A no-op restart of a
    // fully-migrated cluster has every space flagged, so this is `false` and no re-index is triggered.
    const pendingCaseBackfillAtStart = hasPendingCaseBackfill(configures);

    // Aggregate counts so the whole run emits a single summary INFO line, not one per space.
    const totals = {
      skipped: 0,
      migrated: 0,
      errored: 0,
      fieldDefsCreated: 0,
      fieldDefsReused: 0,
      templatesCreated: 0,
      templatesReused: 0,
    };

    // ── Phase 1: field definitions + templates (fast, bounded per space) ─────────────────────────
    await pMap(
      configures,
      async (so, index) => {
        const fieldsAndTemplatesDone =
          so.attributes.legacyTemplatesMigrated && so.attributes.legacyCustomFieldsMigrated;

        if (fieldsAndTemplatesDone) {
          if (!configureNeedsCaseBackfill(so)) {
            totals.skipped++;
            this.migrationUsageCounter?.incrementCounter({
              counterName: 'configureMigrationSkipped',
              incrementBy: 1,
            });
          }
          return;
        }

        try {
          const counts = await migrateOneConfigure(repo, so, executionId, log);
          totals.migrated++;
          totals.fieldDefsCreated += counts.fieldDefsCreated;
          totals.fieldDefsReused += counts.fieldDefsReused;
          totals.templatesCreated += counts.templatesCreated;
          totals.templatesReused += counts.templatesReused;
          // Replace (never mutate) this run's in-memory snapshot so Phase 2 (below), which reads
          // from this same `configures` array, sees a freshly-migrated space as eligible
          // immediately instead of waiting a full extra run for the next findAllConfigurations
          // read. Replacing the array slot — rather than assigning `so.attributes.x = ...` — also
          // avoids a spurious require-atomic-updates flag, since `so` itself is never reassigned
          // after the `await` above.
          configures[index] = {
            ...so,
            attributes: {
              ...so.attributes,
              legacyCustomFieldsMigrated: counts.legacyCustomFieldsMigrated,
              legacyTemplatesMigrated: counts.legacyTemplatesMigrated,
            },
          };
          this.migrationUsageCounter?.incrementCounter({
            counterName: 'configureMigrationSuccess',
            incrementBy: 1,
          });
        } catch (err) {
          totals.errored++;
          // Per-space failures stay at error level — they are rare and actionable.
          log.error(
            `[${executionId}] Migration failed for configure SO ${so.id} (owner: ${
              so.attributes.owner
            }): ${err instanceof Error ? err.message : String(err)}`
          );
          this.migrationUsageCounter?.incrementCounter({
            counterName: 'configureMigrationError',
            incrementBy: 1,
          });
        }
      },
      { concurrency: MAX_CONCURRENT_MIGRATIONS }
    );

    // Re-check AFTER Phase 1: a fresh configuration (no migration flags) cannot count as pending
    // at the start of the run — `configureNeedsCaseBackfill` requires the Phase-1 flags to be set.
    // When Phase 1 and the whole backfill complete in this same run (small deployments), the
    // start-of-run snapshot alone would report "no pending work" and the terminal analytics nudge
    // would never fire, permanently stranding the backfilled values from Cases Analytics v2 (raw
    // repository writes do not advance the domain updated_at cursor). The OR keeps both sources of
    // truth: work that was already pending across runs, and work that became pending in this run.
    const pendingCaseBackfillAfterPhase1 = hasPendingCaseBackfill(configures);
    const hadRealBackfillWork = pendingCaseBackfillAtStart || pendingCaseBackfillAfterPhase1;

    // ── Phase 2: existing-case backfill (resumable, budgeted across runs) ────────────────────────
    const backfill = await runCaseBackfillPhase(
      repo,
      configures,
      previousState.caseBackfill,
      signal,
      executionId,
      log
    );

    log.info(
      `[${executionId}] Cases templates v2 migration run complete: ` +
        `${configures.length} configure SOs inspected ` +
        `(fieldsAndTemplates migrated=${totals.migrated}, skipped=${totals.skipped}, errored=${totals.errored}); ` +
        `field definitions created=${totals.fieldDefsCreated}, reused=${totals.fieldDefsReused}; ` +
        `templates created=${totals.templatesCreated}, reused=${totals.templatesReused}; ` +
        `cases backfilled this run=${backfill.backfilled}` +
        `${backfill.complete ? '' : ' (more cases remain — rescheduling)'}`
    );

    // A space whose Phase-1 migrateOneConfigure keeps throwing never gets its
    // legacyCustomFieldsMigrated/legacyTemplatesMigrated flags set, so configureNeedsCaseBackfill
    // (and therefore backfill.complete) silently excludes it from "pending" rather than blocking
    // on it — `backfill.complete` alone is not "every space fully migrated," just "every space
    // Phase 1 considers eligible for backfill is backfilled." Gate deletion on both, otherwise the
    // one-shot task would delete itself while that space's legacy data is never migrated, leaving
    // it recoverable only via a Kibana restart re-scheduling a fresh task.
    const phase1HasErrors = totals.errored > 0;

    // Backfill fully done and no space is stuck on an unresolved Phase-1 error — delete this
    // one-shot task.
    if (backfill.complete && !phase1HasErrors) {
      await this.notifyCaseBackfillComplete(hadRealBackfillWork, executionId);
      return { state: {}, shouldDeleteTask: true };
    }

    // Count consecutive runs that couldn't fully complete because either a case update kept
    // failing (Phase 2) or a space's field-definitions/templates migration kept throwing
    // (Phase 1). A run that only stopped for budget/cancellation — with no Phase-1 errors — is
    // normal progress and resets the count. After the cap, give up rather than rescheduling a
    // poison space forever.
    const failedRuns =
      backfill.hadFailures || phase1HasErrors ? (previousState.failedRuns ?? 0) + 1 : 0;
    if (failedRuns >= MAX_CASE_BACKFILL_FAILED_RUNS) {
      const failingPhases = [
        ...(phase1HasErrors ? ['field-definitions/templates phase'] : []),
        ...(backfill.hadFailures ? ['case extended_fields backfill'] : []),
      ].join(', ');
      log.error(
        `[${executionId}] Giving up the cases templates v2 migration after ${failedRuns} consecutive runs ` +
          `with failures (${failingPhases}) — some spaces were not fully migrated. Resolve the ` +
          `underlying error (see earlier "Migration failed" / "updates failed" logs) and restart ` +
          `Kibana to re-run the migration.`
      );
      // Some cases/spaces may still have been migrated/backfilled successfully across prior runs;
      // nudge analytics to re-index so those aren't stranded. A later restart re-runs the
      // migration and completes it, firing this again (idempotent) once the remaining work
      // succeeds.
      await this.notifyCaseBackfillComplete(hadRealBackfillWork, executionId);
      return { state: {}, shouldDeleteTask: true };
    }

    // Otherwise self-reschedule with the resume cursor + failure count, backing off when a run failed.
    const nextState: Record<string, unknown> = {
      ...(backfill.nextCursor ? { caseBackfill: backfill.nextCursor } : {}),
      ...(failedRuns > 0 ? { failedRuns } : {}),
    };
    const delayMs =
      backfill.hadFailures || phase1HasErrors
        ? CASE_BACKFILL_FAILURE_RESCHEDULE_DELAY_MS
        : CASE_BACKFILL_RESCHEDULE_DELAY_MS;
    return { state: nextState, runAt: new Date(Date.now() + delayMs) };
  }

  /**
   * Fires the `onCaseBackfillComplete` hook exactly at the migration's terminal points, and only
   * when real case-backfill work existed during the final run — either already pending when the
   * run began, or newly eligible after this run's Phase 1 (a first-run same-run completion).
   * Called from the two `shouldDeleteTask` branches, so it runs once per migration lifetime (the
   * task deletes itself after; a subsequent restart of a fully-migrated cluster sees no pending
   * work and does not fire).
   *
   * Best-effort by contract: the hook is awaited so its own logging orders sensibly, but any error
   * is caught and swallowed. Letting it throw would prevent the caller from returning
   * `shouldDeleteTask: true`, so Task Manager would retry the already-finished migration and re-fire
   * the hook — a pointless retry loop. The migration's own success does not depend on the hook.
   */
  private async notifyCaseBackfillComplete(
    hadRealBackfillWork: boolean,
    executionId: string
  ): Promise<void> {
    if (!hadRealBackfillWork || this.onCaseBackfillComplete == null) {
      return;
    }
    try {
      await this.onCaseBackfillComplete();
    } catch (err) {
      this.logger.warn(
        `[${executionId}] onCaseBackfillComplete hook failed (migration is still complete): ${
          err instanceof Error ? err.message : String(err)
        }`,
        { error: err instanceof Error ? err : undefined }
      );
    }
  }
}
