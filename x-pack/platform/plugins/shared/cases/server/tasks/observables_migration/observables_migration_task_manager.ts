/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type {
  CoreStart,
  ISavedObjectsRepository,
  ISavedObjectsSerializer,
  Logger,
} from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority, throwRetryableError } from '@kbn/task-manager-plugin/server';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  CASES_OBSERVABLES_MIGRATION_TASK_ID,
  CASES_OBSERVABLES_MIGRATION_TASK_TYPE,
  MAX_OBSERVABLES_MIGRATION_FAILED_CASE_IDS,
  MAX_OBSERVABLES_MIGRATION_FAILED_RUNS,
  OBSERVABLES_MIGRATION_CASES_PAGE_SIZE,
  OBSERVABLES_MIGRATION_CONTINUE_DELAY_MS,
  OBSERVABLES_MIGRATION_FAILURE_DELAY_MS,
  OBSERVABLES_MIGRATION_INTERVAL,
  OBSERVABLES_MIGRATION_RUN_BUDGET_MS,
  OBSERVABLES_MIGRATION_TASK_TIMEOUT,
} from './constants';
import { migrateObservablesPage } from './migrate_observables_page';
import {
  closeLegacyCasesPointInTime,
  countLegacyObservables,
  fetchLegacyCasesPage,
  openLegacyCasesPointInTime,
  StalePointInTimeError,
} from './scan_cases';
import type { LegacyCasesPage } from './scan_cases';
import type {
  ObservablesMigrationCounts,
  ObservablesMigrationCursor,
  ObservablesMigrationState,
} from './types';
import { addCounts, EMPTY_COUNTS, observablesMigrationStateSchemaV1 } from './types';

const STATE_KEYS = Object.keys(observablesMigrationStateSchemaV1.getPropSchemas());

const formatNumber = (value: number): string => Math.round(value).toLocaleString('en-US');

const perSecond = (count: number, ms: number): string =>
  formatNumber(ms > 0 ? (count * 1000) / ms : 0);

const describeCounts = ({
  cases,
  observables,
  created,
  alreadyPresent,
  collapsed,
  failed,
}: ObservablesMigrationCounts): string =>
  `${formatNumber(observables)} observables from ${formatNumber(cases)} cases ` +
  `(created ${formatNumber(created)}, already present ${formatNumber(alreadyPresent)}, ` +
  `collapsed ${formatNumber(collapsed)}, failed ${formatNumber(failed)})`;

/** What a run returns to Task Manager: the next state and, while work remains, when to run again. */
export interface ObservablesMigrationRunResult {
  state: ObservablesMigrationState;
  runAt?: Date;
}

interface Dependencies {
  repo: ISavedObjectsRepository;
  serializer: ISavedObjectsSerializer;
}

/**
 * Copies the observables stored in each case's `observables` field into `observable`
 * attachments, once. The case field is left as it is, so progress (a point-in-time cursor) and
 * completion live in the task state; the task is recurring only so that state is kept. While work
 * remains, every run asks to run again a second later.
 */
export class ObservablesMigrationTaskManager {
  private readonly logger: Logger;
  private dependencies?: Dependencies;

  constructor(taskManager: TaskManagerSetupContract, logger: Logger) {
    this.logger = logger.get('observables_migration');

    taskManager.registerTaskDefinitions({
      [CASES_OBSERVABLES_MIGRATION_TASK_TYPE]: {
        title: 'Cases observables migration',
        description: 'Copies the observables stored on each case into observable attachments',
        timeout: OBSERVABLES_MIGRATION_TASK_TIMEOUT,
        cost: TaskCost.ExtraLarge,
        priority: TaskPriority.Maintenance,
        stateSchemaByVersion: {
          1: {
            schema: observablesMigrationStateSchemaV1,
            up: (state: Record<string, unknown>) => pick(state, STATE_KEYS),
          },
        },
        createTaskRunner: ({ taskInstance, signal }: RunContext) => ({
          run: () => this.run(taskInstance.state as ObservablesMigrationState, signal),
        }),
      },
    });
  }

  /** Keeps an existing task, so its cursor and completion survive restarts. */
  public async scheduleTask(taskManager: TaskManagerStartContract, core: CoreStart): Promise<void> {
    this.dependencies = {
      repo: core.savedObjects.createInternalRepository([
        CASE_SAVED_OBJECT,
        CASE_ATTACHMENT_SAVED_OBJECT,
      ]),
      serializer: core.savedObjects.createSerializer(),
    };

    try {
      await taskManager.ensureScheduled({
        id: CASES_OBSERVABLES_MIGRATION_TASK_ID,
        taskType: CASES_OBSERVABLES_MIGRATION_TASK_TYPE,
        schedule: { interval: OBSERVABLES_MIGRATION_INTERVAL },
        params: {},
        state: {},
        scope: ['cases'],
      });
    } catch (error) {
      this.logger.error(`Failed to schedule ${CASES_OBSERVABLES_MIGRATION_TASK_ID}: ${error}`);
    }
  }

  private async run(
    state: ObservablesMigrationState,
    signal: AbortSignal
  ): Promise<ObservablesMigrationRunResult> {
    if (state.complete) {
      return { state };
    }

    const { dependencies } = this;
    if (dependencies == null) {
      // Task Manager can claim the task before this plugin's start has run. This throws.
      throwRetryableError(
        new Error('The observables migration ran before the cases plugin started'),
        new Date(Date.now() + OBSERVABLES_MIGRATION_FAILURE_DELAY_MS)
      );
      return { state };
    }

    const { repo, serializer } = dependencies;
    const runStartedAt = Date.now();
    const shouldPause = () =>
      signal.aborted || Date.now() - runStartedAt >= OBSERVABLES_MIGRATION_RUN_BUDGET_MS;

    const runs = (state.runs ?? 0) + 1;
    const startedAt = state.startedAt ?? new Date(runStartedAt).toISOString();
    const timings = { ...(state.timings ?? { scanMs: 0, createMs: 0 }) };
    const failedCaseIds = new Set(state.failedCaseIds ?? []);
    let expected = state.expected;
    let cursor: ObservablesMigrationCursor | undefined = state.cursor;
    let runCounts: ObservablesMigrationCounts = EMPTY_COUNTS;
    let complete = false;
    let runError: unknown;

    try {
      if (expected == null) {
        expected = await countLegacyObservables(repo);
        this.logger.info(
          `Migrating ${formatNumber(expected.observables)} observables stored on ${formatNumber(
            expected.cases
          )} cases to observable attachments`
        );
      }

      // A point in time expires when the task pauses for longer than its keep-alive (a restart,
      // a failed run). It is reopened once per run; the scan resumes at the last created_at.
      let reopened = false;
      const fetchPage = async (from: ObservablesMigrationCursor): Promise<LegacyCasesPage> => {
        const pageSize = OBSERVABLES_MIGRATION_CASES_PAGE_SIZE;
        try {
          return await fetchLegacyCasesPage({ repo, serializer, cursor: from, pageSize });
        } catch (error) {
          if (!(error instanceof StalePointInTimeError) || reopened) {
            throw error;
          }
          reopened = true;
          this.logger.warn(
            `The observables migration point in time expired; resuming at created_at ${
              from.lastCreatedAt ?? 'start'
            }`
          );
          const pitId = await openLegacyCasesPointInTime(repo);
          const resumed = { pitId, lastCreatedAt: from.lastCreatedAt };
          return fetchLegacyCasesPage({ repo, serializer, cursor: resumed, pageSize });
        }
      };

      cursor = cursor ?? { pitId: await openLegacyCasesPointInTime(repo) };

      while (!shouldPause()) {
        const scanStartedAt = Date.now();
        const page = await fetchPage(cursor);
        timings.scanMs += Date.now() - scanStartedAt;

        const createStartedAt = Date.now();
        const result = await migrateObservablesPage({ repo, cases: page.cases });
        timings.createMs += Date.now() - createStartedAt;
        runCounts = addCounts(runCounts, result.counts);

        if (result.failureReasons.length > 0) {
          this.logger.warn(
            `Failed to migrate ${result.counts.failed} observables of ${
              result.failedCaseIds.length
            } cases: ${result.failureReasons.join('; ')}`
          );
        }
        for (const caseId of result.failedCaseIds) {
          if (failedCaseIds.size < MAX_OBSERVABLES_MIGRATION_FAILED_CASE_IDS) {
            failedCaseIds.add(caseId);
          }
        }

        // Only a migrated page moves the cursor, so a failed page is read again.
        cursor = page.nextCursor;
        if (page.done) {
          complete = true;
          break;
        }
      }
    } catch (error) {
      runError = error;
    }

    const now = Date.now();
    const totals = addCounts(state.totals ?? EMPTY_COUNTS, runCounts);
    const nextState: ObservablesMigrationState = {
      startedAt,
      runs,
      expected,
      cursor,
      totals,
      timings,
      failedCaseIds: [...failedCaseIds],
    };

    this.logger.info(
      `Observables migration run ${runs}: ${describeCounts(runCounts)} in ${formatNumber(
        now - runStartedAt
      )} ms, ${perSecond(runCounts.observables, now - runStartedAt)}/s. So far ${describeCounts(
        totals
      )} of ${formatNumber(expected?.observables ?? 0)}; scan ${formatNumber(
        timings.scanMs
      )} ms, create ${formatNumber(timings.createMs)} ms, ${perSecond(
        totals.observables,
        now - Date.parse(startedAt)
      )}/s since ${startedAt}`
    );

    if (runError != null) {
      return this.handleRunError(runError, nextState, state.failedRuns ?? 0);
    }

    if (!complete) {
      return { state: nextState, runAt: new Date(now + OBSERVABLES_MIGRATION_CONTINUE_DELAY_MS) };
    }

    return this.complete(nextState, now);
  }

  private async complete(
    state: ObservablesMigrationState,
    now: number
  ): Promise<ObservablesMigrationRunResult> {
    const { cursor, totals = EMPTY_COUNTS, expected, startedAt = '' } = state;
    if (cursor != null && this.dependencies != null) {
      await closeLegacyCasesPointInTime(this.dependencies.repo, cursor.pitId, this.logger);
    }

    const completedAt = new Date(now).toISOString();
    const wallMs = now - Date.parse(startedAt);
    const message =
      `Observables migration complete: ${describeCounts(totals)} in ${formatNumber(
        wallMs
      )} ms (${perSecond(totals.observables, wallMs)}/s) over ${state.runs} runs, ` +
      `from ${startedAt} to ${completedAt}`;

    if (totals.failed > 0 || (expected != null && totals.observables < expected.observables)) {
      this.logger.warn(
        `${message}. Expected ${formatNumber(expected?.observables ?? 0)} observables; ` +
          `cases with failures include ${state.failedCaseIds?.join(', ') ?? 'none'}`
      );
    } else {
      this.logger.info(message);
    }

    return { state: { ...state, cursor: undefined, complete: true, completedAt } };
  }

  private handleRunError(
    error: unknown,
    state: ObservablesMigrationState,
    previousFailedRuns: number
  ): ObservablesMigrationRunResult {
    const failedRuns = previousFailedRuns + 1;
    if (failedRuns >= MAX_OBSERVABLES_MIGRATION_FAILED_RUNS) {
      this.logger.error(
        `Giving up the observables migration after ${failedRuns} failed runs in a row: ${error}. ` +
          `Delete the ${CASES_OBSERVABLES_MIGRATION_TASK_ID} task and restart Kibana to run it again.`
      );
      return {
        state: { ...state, failedRuns, complete: true, completedAt: new Date().toISOString() },
      };
    }

    this.logger.error(
      `Observables migration run failed (${failedRuns} in a row); retrying in ${
        OBSERVABLES_MIGRATION_FAILURE_DELAY_MS / 1000
      } s: ${error}`
    );
    return {
      state: { ...state, failedRuns },
      runAt: new Date(Date.now() + OBSERVABLES_MIGRATION_FAILURE_DELAY_MS),
    };
  }
}
