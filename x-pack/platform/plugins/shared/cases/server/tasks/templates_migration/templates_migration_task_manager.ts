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
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
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
  MIGRATION_TASK_INTERVAL,
  migrationTaskStateSchemaV1,
} from './types';
import type { MigrationTaskState, ReconcileCounts } from './types';
import { findAllConfigurations, migrateOneConfigure } from './migrate_configuration';
import {
  configureNeedsCaseBackfill,
  hasPendingCaseBackfill,
  runCaseBackfillPhase,
} from './run_case_backfill';
import { runFieldValueReconciliationPhase } from './run_field_value_reconciliation';

/**
 * Registers and schedules the **low-frequency permanent singleton** task (plan addendum A3: same
 * type/id, interval schedule, no self-delete) that migrates legacy (v1) templates and custom fields
 * into the v2 saved objects, backfills existing cases' `extended_fields`, and reconciles linked
 * v1/v2 case field values. Each run has three phases:
 *   1. Field definitions + templates — fast, one pass per space, idempotent via per-space flags.
 *   2. Existing-case backfill — resumable and budgeted; reschedules itself until every space is done.
 *   3. Field-value reconciliation — verifies/repairs linked v1↔v2 value parity per space, guarded by
 *      the durable `legacyFieldValuesReconciled` fingerprint marker. Configuration changes nudge the
 *      task with a best-effort `runSoon`; a lost nudge is recovered by the interval.
 * All writes go through an internal (unscoped) SO repository; the whole task is gated by the
 * `xpack.cases.templates.enabled` feature flag at the plugin level.
 */
export class TemplatesMigrationTaskManager {
  private readonly logger: Logger;
  private internalRepo?: ISavedObjectsRepository;
  private migrationUsageCounter?: IUsageCounter;
  /**
   * Best-effort analytics-v2 nudge, fired when the existing-case `extended_fields` backfill
   * finishes outstanding work and after any run whose reconciliation phase repaired cases. Wired by
   * the plugin to `CasesAnalyticsV2Service.triggerBackfillReconciliation`: both phases write raw SO
   * updates that bump only the SO-framework `updated_at`, not the case-domain
   * `attributes.updated_at` that analytics-v2's incremental reconciliation filters on, so without a
   * nudge those writes would never be mirrored to `.cases`. Optional and fire-and-forget — failures
   * are logged, never propagated (see `notifyAnalyticsReconciliation`).
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
        description:
          'Migration of legacy templates and custom fields to the v2 system, plus linked field-value reconciliation',
        timeout: '10m',
        maxAttempts: 3,
        priority: TaskPriority.NormalLongRunning,
        cost: TaskCost.Normal,
        // Params stay empty (no paramsSchema needed). The versioned state schema
        // covers the phase/cursor/failure state; v1 accepts the initial `{}` AND
        // the `caseBackfill`/`failedRuns` state persisted by older in-progress
        // instances of this (pre-versioning) task type.
        stateSchemaByVersion: {
          1: {
            schema: migrationTaskStateSchemaV1,
            up: (state: Record<string, unknown>) => state,
          },
        },
        createTaskRunner: ({ taskInstance, signal }: RunContext) => {
          // Same guard as IncrementalIdTaskManager: if Task Manager fires between setup() and
          // start(), we throw and let TM mark the run as failed — it will retry on next startup.
          if (!this.internalRepo) {
            throw new Error('TemplatesMigrationTaskManager: internal repository not initialized');
          }
          const repo = this.internalRepo;
          const previousState = (taskInstance?.state ?? {}) as MigrationTaskState;
          // Task Manager aborts this signal on timeout/cancel; the scans check it between pages
          // and persist their cursor so the next run resumes rather than running past the timeout.
          // No `cancel` callback: the runner holds no external resource needing cleanup.
          return {
            run: () => this.run(repo, previousState, signal),
          };
        },
      },
    });
  }

  /**
   * Creates the internal SO repository and (re)schedules the permanent singleton on every Kibana
   * startup. The startup-only removeIfExists + ensureScheduled pair upgrades any pre-existing
   * one-shot task document to the recurring-interval shape and guarantees a prompt post-startup run;
   * per-space flags and fingerprint markers keep already-processed spaces cheap no-ops. This remove
   * is startup-only — the configuration-change hot path uses `runSoon`, never removeIfExists (A3).
   * Scheduling failures are logged, never fatal to startup: the durable per-space markers let the
   * next startup (or another node) recover.
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
        // Low-frequency permanent singleton (A3): the interval picks up stale
        // reconciliation fingerprints even when a configure-change `runSoon`
        // nudge was lost. Runs on a fully-processed cluster are cheap no-ops.
        schedule: { interval: MIGRATION_TASK_INTERVAL },
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
   * One task run: migrate every space's field definitions + templates, advance the resumable case
   * backfill by one budgeted chunk, and — once the backfill is done — advance the field-value
   * reconciliation. Returns a Task Manager run result: a `runAt` (with the resume cursor in state)
   * while a phase has more to do, or empty state when idle — the recurring interval schedules the
   * next run (the task never deletes itself, per addendum A3).
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
    // writes nothing (e.g. after a restart wiped the in-progress cursor). Drives the one-shot
    // analytics re-index nudge on completion — see `onCaseBackfillComplete`. A no-op restart of a
    // fully-migrated cluster has every space flagged, so this is `false` and no re-index is triggered.
    const hadPendingCaseBackfill = hasPendingCaseBackfill(configures);

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

    // ── Phase 2: existing-case backfill (resumable, budgeted across runs) ────────────────────────
    const backfill = await runCaseBackfillPhase(
      repo,
      configures,
      previousState.caseBackfill,
      signal,
      executionId,
      log
    );

    if (!backfill.complete) {
      log.info(
        `[${executionId}] Cases templates v2 migration run: backfilled=${backfill.backfilled} ` +
          `(more cases remain — rescheduling)`
      );
      const { backedOff, result } = this.rescheduleIncompletePhase({
        hadFailures: backfill.hadFailures,
        previousState,
        nextState: backfill.nextCursor ? { caseBackfill: backfill.nextCursor } : {},
        phaseName: 'extended_fields backfill',
        executionId,
      });
      if (backedOff) {
        // Cases already backfilled across prior runs must not stay stranded
        // from analytics until the poison space eventually succeeds on the
        // interval — nudge now (idempotent; fires again on real completion).
        await this.notifyAnalyticsReconciliation(hadPendingCaseBackfill, executionId);
      }
      return result;
    }

    // Backfill done — nudge analytics once (only when this run finished real outstanding work).
    await this.notifyAnalyticsReconciliation(hadPendingCaseBackfill, executionId);

    // ── Phase 3: linked field-value reconciliation (resumable, budgeted, fingerprint-guarded) ────
    const reconcile = await runFieldValueReconciliationPhase(
      repo,
      configures,
      previousState.reconcile,
      signal,
      executionId,
      log
    );
    this.incrementReconcileCounters(reconcile.counts);

    log.info(
      `[${executionId}] Cases templates v2 migration run complete: ` +
        `${configures.length} configure SOs inspected ` +
        `(fieldsAndTemplates migrated=${totals.migrated}, skipped=${totals.skipped}, errored=${totals.errored}); ` +
        `field definitions created=${totals.fieldDefsCreated}, reused=${totals.fieldDefsReused}; ` +
        `templates created=${totals.templatesCreated}, reused=${totals.templatesReused}; ` +
        `cases backfilled this run=${backfill.backfilled}; ` +
        `reconciliation scanned=${reconcile.counts.scanned}, mismatched=${reconcile.counts.mismatched}, ` +
        `repaired=${reconcile.counts.repaired}, conflicted=${reconcile.counts.conflicted}, ` +
        `malformed=${reconcile.counts.malformed}, spacesCompleted=${reconcile.counts.completed}` +
        `${reconcile.complete ? '' : ' (reconciliation has more to do — rescheduling)'}`
    );

    // Reconciliation repairs are raw SO updates that bump only the framework
    // `updated_at`, so analytics-v2's incremental cursor never sees them —
    // nudge a full reconciliation, same as the backfill (best-effort).
    await this.notifyAnalyticsReconciliation(reconcile.counts.repaired > 0, executionId);

    if (!reconcile.complete) {
      return this.rescheduleIncompletePhase({
        hadFailures: reconcile.hadFailures,
        previousState,
        nextState: reconcile.nextCursor ? { reconcile: reconcile.nextCursor } : {},
        phaseName: 'field-value reconciliation',
        executionId,
      }).result;
    }

    // A run that just finished outstanding backfill work reschedules promptly: the reconciliation
    // predicate reads the per-space `legacyCasesMigrated` flags from the START-of-run configure
    // snapshot, so the freshly backfilled spaces become reconcilable on the next run — don't make
    // them wait for the low-frequency interval.
    if (hadPendingCaseBackfill) {
      return {
        state: {},
        runAt: new Date(Date.now() + CASE_BACKFILL_RESCHEDULE_DELAY_MS),
      };
    }

    // Idle: everything is migrated/verified (or blocked awaiting operator remediation). Return
    // empty state and let the recurring interval schedule the next (cheap no-op) run.
    return { state: {} };
  }

  /**
   * Reschedules an incomplete phase with its resume cursor, backing off when the run had update
   * failures and — after `MAX_CASE_BACKFILL_FAILED_RUNS` consecutive failing runs — falling back to
   * the recurring interval instead of hot-rescheduling a poison space forever. The durable
   * per-space flags/markers make the interval retry safe.
   */
  private rescheduleIncompletePhase({
    hadFailures,
    previousState,
    nextState,
    phaseName,
    executionId,
  }: {
    hadFailures: boolean;
    previousState: MigrationTaskState;
    nextState: Record<string, unknown>;
    phaseName: string;
    executionId: string;
  }): { backedOff: boolean; result: { state: Record<string, unknown>; runAt?: Date } } {
    // A run that only stopped for budget/cancellation is normal progress and resets the count.
    const failedRuns = hadFailures ? (previousState.failedRuns ?? 0) + 1 : 0;
    if (failedRuns >= MAX_CASE_BACKFILL_FAILED_RUNS) {
      this.logger.error(
        `[${executionId}] Giving up rescheduling the cases ${phaseName} after ${failedRuns} ` +
          `consecutive runs with update failures. Resolve the underlying error (see earlier ` +
          `"updates failed" logs); the task retries automatically on its ` +
          `${MIGRATION_TASK_INTERVAL} interval.`
      );
      return { backedOff: true, result: { state: {} } };
    }

    const delayMs = hadFailures
      ? CASE_BACKFILL_FAILURE_RESCHEDULE_DELAY_MS
      : CASE_BACKFILL_RESCHEDULE_DELAY_MS;
    return {
      backedOff: false,
      result: {
        state: { ...nextState, ...(failedRuns > 0 ? { failedRuns } : {}) },
        runAt: new Date(Date.now() + delayMs),
      },
    };
  }

  /** Mirrors the per-run reconciliation counts into low-cardinality usage counters. */
  private incrementReconcileCounters(counts: ReconcileCounts): void {
    try {
      for (const [name, value] of Object.entries(counts)) {
        if (value > 0) {
          this.migrationUsageCounter?.incrementCounter({
            counterName: `reconciliation${name[0].toUpperCase()}${name.slice(1)}`,
            incrementBy: value,
          });
        }
      }
    } catch {
      // Telemetry must never affect reconciliation correctness.
    }
  }

  /**
   * Fires the analytics-v2 full-reconciliation hook when `shouldNotify` is true: once when the
   * case backfill finishes real outstanding work, and after any run whose reconciliation phase
   * submitted repairs (both write paths bump only the SO-framework `updated_at`, which the
   * analytics incremental cursor never sees). A no-op run of a fully-processed cluster passes
   * `false` and does not fire.
   *
   * Best-effort by contract: the hook is awaited so its own logging orders sensibly, but any error
   * is caught and swallowed — the migration's own success does not depend on the hook.
   */
  private async notifyAnalyticsReconciliation(
    shouldNotify: boolean,
    executionId: string
  ): Promise<void> {
    if (!shouldNotify || this.onCaseBackfillComplete == null) {
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
