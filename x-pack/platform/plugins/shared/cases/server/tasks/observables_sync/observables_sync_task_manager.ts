/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { CoreStart, ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, throwRetryableError } from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { ObservablesService } from '../../services/observables';
import { runCleanupPhase } from './cleanup_phase';
import {
  CASES_OBSERVABLES_SYNC_TASK_ID,
  CASES_OBSERVABLES_SYNC_TASK_TYPE,
  OBSERVABLES_SYNC_PASS_VERSION,
} from './constants';
import { PassProgress } from './pass_progress';
import { scanCases } from './scan_cases';
import { flagCasePending, syncCaseObservables } from './sync_case';
import type { SyncCaseOutcome } from './sync_case';
import {
  CASES_OBSERVABLES_SYNC_TASK_TIMEOUT,
  emptyCounts,
  MAX_OBSERVABLES_SYNC_FAILED_RUNS,
  OBSERVABLES_SYNC_CASE_BUDGET,
  OBSERVABLES_SYNC_FAILURE_RESCHEDULE_DELAY_MS,
  OBSERVABLES_SYNC_IDLE_INTERVAL,
  OBSERVABLES_SYNC_RESCHEDULE_DELAY_MS,
  OBSERVABLES_SYNC_RUN_BUDGET_MS,
} from './types';
import type { ObservablesSyncCounts, ObservablesSyncPhase, ObservablesSyncState } from './types';

/** Cases that have observables on the case field, the ones the copy phase has to look at. */
const CASES_WITH_OBSERVABLES_FILTER = `${CASE_SAVED_OBJECT}.attributes.observables:{ value: * }`;
const CASES_PENDING_SYNC_FILTER = `${CASE_SAVED_OBJECT}.attributes.observables_sync_pending: true`;

const sortValue = schema.nullable(
  schema.oneOf([schema.string(), schema.number(), schema.boolean()])
);

const stateSchemaV1 = schema.object({
  passVersion: schema.maybe(schema.number()),
  phase: schema.maybe(
    schema.oneOf([schema.literal('copy'), schema.literal('cleanup'), schema.literal('pending')])
  ),
  scan: schema.maybe(
    schema.object({
      pitId: schema.string(),
      searchAfter: schema.maybe(schema.arrayOf(sortValue)),
    })
  ),
  cleanupAfter: schema.maybe(schema.object({ caseId: schema.string(), spaceId: schema.string() })),
  counts: schema.maybe(
    schema.object({
      casesSynced: schema.number(),
      documentsCreated: schema.number(),
      documentsUpdated: schema.number(),
      documentsDeleted: schema.number(),
      casesFlaggedPending: schema.number(),
      orphanedCases: schema.number(),
    })
  ),
  phaseFailures: schema.maybe(schema.number()),
  rescanNeeded: schema.maybe(schema.boolean()),
  failedRuns: schema.maybe(schema.number()),
  completedPassVersion: schema.maybe(schema.number()),
  completedAt: schema.maybe(schema.string()),
});

interface RunResult {
  state: ObservablesSyncState;
  runAt?: Date;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Registers and schedules the recurring task that makes the observables index match the observables
 * field of every case, in every space, while the case field is still the source of truth.
 *
 * A full pass has three phases, each resumable and budgeted across runs:
 *   1. copy: syncs every case that has observables on the case field.
 *   2. cleanup: removes the index documents of cases that were deleted or have no observables.
 *   3. pending: syncs the cases flagged `observables_sync_pending`, which covers writes whose index
 *      write failed and cases a sync could not finish.
 * When the pending phase finishes with nothing left, the pass version is recorded in the task state
 * as completed. After that the task runs daily with the cleanup and pending phases only.
 *
 * The task is never removed at startup, since its state holds the completion record.
 */
export class ObservablesSyncTaskManager {
  private readonly logger: Logger;
  private internalRepo?: ISavedObjectsRepository;
  private observablesService?: ObservablesService;
  private usageCounter?: IUsageCounter;

  constructor(
    taskManager: TaskManagerSetupContract,
    logger: Logger,
    usageCollection?: UsageCollectionSetup
  ) {
    this.logger = logger.get('observables_sync');

    if (usageCollection) {
      this.usageCounter = usageCollection.createUsageCounter('CasesObservablesSync');
    }

    taskManager.registerTaskDefinitions({
      [CASES_OBSERVABLES_SYNC_TASK_TYPE]: {
        title: 'Cases observables sync',
        description:
          'Copies the observables of every case into the observables index and keeps the two in step',
        timeout: CASES_OBSERVABLES_SYNC_TASK_TIMEOUT,
        cost: TaskCost.Normal,
        stateSchemaByVersion: {
          1: { schema: stateSchemaV1, up: (state: Record<string, unknown>) => state },
        },
        createTaskRunner: ({ taskInstance, signal }: RunContext) => {
          const previousState = (taskInstance?.state ?? {}) as ObservablesSyncState;
          return {
            run: async (): Promise<RunResult> => {
              const { internalRepo, observablesService } = this;
              // Task Manager can fire between setup() and start(). The run is retried once start()
              // has created the repository.
              if (!internalRepo || !observablesService) {
                throwRetryableError(
                  new Error('ObservablesSyncTaskManager: not initialized before the task ran'),
                  true
                );
                return { state: previousState };
              }
              return this.run({ repo: internalRepo, observablesService, previousState, signal });
            },
          };
        },
      },
    });
  }

  /** Creates the internal repository and makes sure the task exists, keeping its state if it does. */
  public async scheduleSyncTask({
    taskManager,
    core,
    observablesService,
  }: {
    taskManager: TaskManagerStartContract;
    core: CoreStart;
    observablesService: ObservablesService;
  }): Promise<void> {
    this.internalRepo = core.savedObjects.createInternalRepository([CASE_SAVED_OBJECT]);
    this.observablesService = observablesService;

    try {
      await taskManager.ensureScheduled({
        id: CASES_OBSERVABLES_SYNC_TASK_ID,
        taskType: CASES_OBSERVABLES_SYNC_TASK_TYPE,
        schedule: { interval: OBSERVABLES_SYNC_IDLE_INTERVAL },
        params: {},
        state: {},
        scope: ['cases'],
      });
      this.logger.info(`${CASES_OBSERVABLES_SYNC_TASK_ID} scheduled`);
    } catch (error) {
      this.logger.error(
        `Failed to schedule ${CASES_OBSERVABLES_SYNC_TASK_ID}: ${errorMessage(error)}`
      );
    }
  }

  private async run({
    repo,
    observablesService,
    previousState,
    signal,
  }: {
    repo: ISavedObjectsRepository;
    observablesService: ObservablesService;
    previousState: ObservablesSyncState;
    signal: AbortSignal;
  }): Promise<RunResult> {
    try {
      return await this.runPass({ repo, observablesService, previousState, signal });
    } catch (error) {
      // An unexpected failure (for example Elasticsearch being unavailable) keeps the progress made
      // so far and backs off. After enough in a row the task waits for its next interval.
      const failedRuns = (previousState.failedRuns ?? 0) + 1;
      this.logger.error(
        `The observables sync run failed (${failedRuns} in a row): ${errorMessage(error)}`,
        { error: { stack_trace: error instanceof Error ? error.stack : undefined } }
      );
      return this.afterFailedRun({ previousState, nextState: { ...previousState }, failedRuns });
    }
  }

  private async runPass({
    repo,
    observablesService,
    previousState,
    signal,
  }: {
    repo: ISavedObjectsRepository;
    observablesService: ObservablesService;
    previousState: ObservablesSyncState;
    signal: AbortSignal;
  }): Promise<RunResult> {
    const executionId = uuidv4();
    const startedAt = Date.now();
    const deadline = startedAt + OBSERVABLES_SYNC_RUN_BUDGET_MS;
    const shouldPause = () => signal.aborted || Date.now() >= deadline;
    this.incrementCounter('run');

    const isFullPass = (previousState.completedPassVersion ?? 0) < OBSERVABLES_SYNC_PASS_VERSION;
    const phases: ObservablesSyncPhase[] = isFullPass
      ? ['copy', 'cleanup', 'pending']
      : ['cleanup', 'pending'];
    const passVersion = isFullPass ? OBSERVABLES_SYNC_PASS_VERSION : undefined;
    const record: ObservablesSyncState = {
      completedPassVersion: previousState.completedPassVersion,
      completedAt: previousState.completedAt,
    };

    const resumedPhase =
      previousState.phase !== undefined &&
      previousState.passVersion === passVersion &&
      phases.includes(previousState.phase)
        ? previousState.phase
        : undefined;
    const isResumed = resumedPhase !== undefined;
    const progress = new PassProgress(
      isResumed && previousState.counts ? { ...previousState.counts } : emptyCounts(),
      {
        phaseFailures: isResumed ? previousState.phaseFailures ?? 0 : 0,
        rescanNeeded: isResumed ? previousState.rescanNeeded ?? false : false,
      }
    );
    let scan = isResumed ? previousState.scan : undefined;
    let cleanupAfter = isResumed ? previousState.cleanupAfter : undefined;

    if (!isResumed) {
      this.logger.info(
        `[${executionId}] Starting the ${
          isFullPass
            ? `observables sync pass ${OBSERVABLES_SYNC_PASS_VERSION}`
            : 'observables sync maintenance'
        }`
      );
    }

    for (const phase of phases.slice(phases.indexOf(resumedPhase ?? phases[0]))) {
      const caseBudget = OBSERVABLES_SYNC_CASE_BUDGET - progress.scanned;
      let paused = false;

      if (phase === 'cleanup') {
        const result = await runCleanupPhase({
          repo,
          observablesService,
          logger: this.logger,
          signal,
          after: cleanupAfter,
          caseBudget,
          shouldPause,
          onOutcome: (outcome) => this.tally(progress.counts, outcome),
          onOrphan: (deletedDocuments) => {
            progress.counts.orphanedCases++;
            progress.counts.documentsDeleted += deletedDocuments;
          },
          onFailure: () => {
            progress.requireRescan();
            this.incrementCounter('caseSyncFailed');
          },
        });
        progress.scanned += result.scanned;
        paused = result.outcome === 'paused';
        cleanupAfter = result.after;
      } else {
        const result = await scanCases({
          repo,
          logger: this.logger,
          filter: phase === 'copy' ? CASES_WITH_OBSERVABLES_FILTER : CASES_PENDING_SYNC_FILTER,
          cursor: scan,
          caseBudget,
          shouldPause,
          handleCase: (caseSO) =>
            this.syncOneCase({ repo, observablesService, caseSO, phase, progress, signal }),
        });
        progress.scanned += result.scanned;
        paused = result.outcome === 'paused';
        scan = result.cursor;
      }

      if (paused) {
        this.logger.debug(
          `[${executionId}] Observables sync paused in the ${phase} phase after ${progress.scanned} cases this run`
        );
        if (Date.now() >= deadline) {
          this.incrementCounter('runBudgetExceeded');
        }
        return {
          state: {
            ...record,
            passVersion,
            phase,
            scan,
            cleanupAfter,
            counts: progress.counts,
            phaseFailures: progress.phaseFailures,
            rescanNeeded: progress.rescanNeeded,
            failedRuns: previousState.failedRuns,
          },
          runAt: new Date(Date.now() + OBSERVABLES_SYNC_RESCHEDULE_DELAY_MS),
        };
      }

      scan = undefined;
      cleanupAfter = undefined;
      if (phase !== 'pending') {
        progress.phaseFailures = 0;
      }
    }

    if (progress.phaseFailures > 0 || progress.rescanNeeded) {
      // Cases are left that could not be synced. Start the phase again, or the whole pass when a
      // failing case could not even be flagged, so that nothing is declared in sync wrongly.
      const failedRuns = (previousState.failedRuns ?? 0) + 1;
      this.logger.warn(
        `[${executionId}] Observables sync could not finish: ${
          progress.phaseFailures
        } flagged cases failed${
          progress.rescanNeeded ? ' and some failures could not be flagged' : ''
        }`
      );
      return this.afterFailedRun({
        previousState,
        nextState: {
          ...record,
          passVersion,
          phase: progress.rescanNeeded ? phases[0] : 'pending',
          counts: progress.counts,
        },
        failedRuns,
      });
    }

    const completedAt = new Date().toISOString();
    const changed = Object.values(progress.counts).some((count) => count > 0);
    const message = `[${executionId}] Observables sync ${
      isFullPass ? `pass ${OBSERVABLES_SYNC_PASS_VERSION} complete` : 'maintenance complete'
    } in ${Date.now() - startedAt}ms: ${JSON.stringify(progress.counts)}`;
    if (isFullPass || changed) {
      this.logger.info(message);
    } else {
      this.logger.debug(message);
    }
    if (isFullPass) {
      this.incrementCounter('passCompleted');
    }

    return {
      state: isFullPass
        ? { completedPassVersion: OBSERVABLES_SYNC_PASS_VERSION, completedAt }
        : record,
    };
  }

  /**
   * Syncs one case of the copy or pending phase. A failure never throws out of the phase: the case is
   * flagged pending so the pending phase retries it, and only when that is not possible either does
   * the pass have to start over.
   */
  private async syncOneCase({
    repo,
    observablesService,
    caseSO,
    phase,
    progress,
    signal,
  }: {
    repo: ISavedObjectsRepository;
    observablesService: ObservablesService;
    caseSO: SavedObject<CasePersistedAttributes>;
    phase: ObservablesSyncPhase;
    progress: PassProgress;
    signal: AbortSignal;
  }): Promise<void> {
    try {
      const outcome = await syncCaseObservables({ repo, observablesService, caseSO, signal });
      this.tally(progress.counts, outcome);
      if (outcome.status === 'pending') {
        progress.counts.casesFlaggedPending++;
        if (phase === 'pending') {
          progress.phaseFailures++;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to sync the observables of case ${caseSO.id} (${phase} phase): ${errorMessage(
          error
        )}`
      );
      this.incrementCounter('caseSyncFailed');
      if (phase === 'pending') {
        progress.phaseFailures++;
        return;
      }
      const flagged = await flagCasePending({ repo, caseSO });
      if (flagged) {
        progress.counts.casesFlaggedPending++;
      } else {
        progress.requireRescan();
      }
    }
  }

  private afterFailedRun({
    previousState,
    nextState,
    failedRuns,
  }: {
    previousState: ObservablesSyncState;
    nextState: ObservablesSyncState;
    failedRuns: number;
  }): RunResult {
    this.incrementCounter('failedRun');
    if (failedRuns >= MAX_OBSERVABLES_SYNC_FAILED_RUNS) {
      this.logger.error(
        `Giving up the observables sync for now after ${failedRuns} runs with failures in a row. It starts over at its next interval. Resolve the errors logged earlier to let it finish.`
      );
      return {
        state: {
          completedPassVersion: previousState.completedPassVersion,
          completedAt: previousState.completedAt,
        },
      };
    }
    return {
      state: { ...nextState, failedRuns },
      runAt: new Date(Date.now() + OBSERVABLES_SYNC_FAILURE_RESCHEDULE_DELAY_MS),
    };
  }

  private tally(counts: ObservablesSyncCounts, outcome: SyncCaseOutcome): void {
    if (outcome.status === 'case_deleted') {
      counts.orphanedCases++;
      counts.documentsDeleted += outcome.deleted;
      return;
    }
    if (outcome.status === 'synced') {
      counts.casesSynced++;
    }
    counts.documentsCreated += outcome.created;
    counts.documentsUpdated += outcome.updated;
    counts.documentsDeleted += outcome.deleted;
  }

  private incrementCounter(counterName: string): void {
    this.usageCounter?.incrementCounter({ counterName, incrementBy: 1 });
  }
}
