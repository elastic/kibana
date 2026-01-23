/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import dateMath from '@kbn/datemath';
import { findGapsSearchAfter } from '../find_gaps';
import { processGapsBatch } from '../../../application/gaps/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch';
import { GapFillSchedulePerRuleStatus } from '../../../application/gaps/methods/bulk_fill_gaps_by_rule_ids/types';

import type { RulesClientApi } from '../../../types';
import { gapStatus, GAP_AUTO_FILL_STATUS } from '../../../../common/constants';
import type { createGapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import {
  GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
  DEFAULT_RULES_BATCH_SIZE,
  DEFAULT_GAPS_PER_PAGE,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_TIMEOUT,
} from '../../../application/gaps/types/scheduler';
import { backfillInitiator } from '../../../../common/constants';
import type { RulesClientContext } from '../../../rules_client/types';
import type { AggregatedByRuleEntry } from './utils';
import {
  resultsFromMap,
  formatConsolidatedSummary,
  isCancelled,
  filterGapsWithOverlappingBackfills,
  initRun,
  checkBackfillCapacity,
  getGapAutoFillRunOutcome,
} from './utils';
import { cleanupStuckInProgressGaps } from '../update/cleanup_stuck_in_progress_gaps';

// Circuit breaker to prevent infinite pagination loops when fetching gaps
const GAP_FETCH_MAX_ITERATIONS = 1000;

export enum SchedulerLoopState {
  COMPLETED = 'completed',
  CAPACITY_EXHAUSTED = 'capacity_exhausted',
  CANCELLED = 'cancelled',
}

interface ProcessRuleBatchesResult {
  aggregatedByRule: Map<string, AggregatedByRuleEntry>;
  state: SchedulerLoopState;
}

interface ProcessGapsForRulesResult {
  aggregatedByRule: Map<string, AggregatedByRuleEntry>;
  remainingBackfills: number;
  state: SchedulerLoopState;
}

type LoggerMessageBuilder = (message: string) => string;

export async function processRuleBatches({
  abortController,
  gapsPerPage,
  gapFetchMaxIterations,
  logger,
  loggerMessage,
  logEvent,
  remainingBackfills,
  ruleIds,
  rulesBatchSize,
  rulesClient,
  rulesClientContext,
  sortOrder,
  startISO,
  endISO,
  taskInstanceId,
  numRetries,
}: {
  abortController: AbortController;
  gapsPerPage: number;
  gapFetchMaxIterations: number;
  logger: Logger;
  loggerMessage: LoggerMessageBuilder;
  logEvent: ReturnType<typeof createGapAutoFillSchedulerEventLogger>;
  remainingBackfills: number;
  ruleIds: string[];
  rulesBatchSize: number;
  rulesClient: RulesClientApi;
  rulesClientContext: RulesClientContext;
  sortOrder: 'asc' | 'desc';
  startISO: string;
  endISO: string;
  taskInstanceId: string;
  numRetries: number;
}): Promise<ProcessRuleBatchesResult> {
  let aggregatedByRule = new Map<string, AggregatedByRuleEntry>();

  for (let startIdx = 0; startIdx < ruleIds.length; startIdx += rulesBatchSize) {
    if (remainingBackfills <= 0) {
      return { aggregatedByRule, state: SchedulerLoopState.CAPACITY_EXHAUSTED };
    }

    if (isCancelled(abortController)) {
      return { aggregatedByRule, state: SchedulerLoopState.CANCELLED };
    }

    const currentRuleIds = ruleIds.slice(startIdx, startIdx + rulesBatchSize);
    const { data: rules } = await rulesClient.find({
      options: {
        page: 1,
        perPage: currentRuleIds.length,
        filter: `alert.attributes.enabled:true AND (${currentRuleIds
          .map((id) => `alert.id: ("alert:${id}")`)
          .join(' OR ')})`,
      },
    });

    const toProcessRuleIds = rules.map((rule) => rule.id).slice(0, remainingBackfills);
    if (!toProcessRuleIds.length) {
      continue;
    }

    const gapsResult = await processGapsForRules({
      abortController,
      aggregatedByRule,
      endISO,
      gapsPerPage,
      gapFetchMaxIterations,
      logger,
      loggerMessage,
      logEvent,
      remainingBackfills,
      rulesClientContext,
      sortOrder,
      startISO,
      taskInstanceId,
      toProcessRuleIds,
      numRetries,
    });

    aggregatedByRule = gapsResult.aggregatedByRule;
    remainingBackfills = gapsResult.remainingBackfills;

    if (gapsResult.state !== SchedulerLoopState.COMPLETED) {
      return {
        aggregatedByRule,
        state: gapsResult.state,
      };
    }
  }

  return { aggregatedByRule, state: SchedulerLoopState.COMPLETED };
}

export async function processGapsForRules({
  abortController,
  aggregatedByRule,
  endISO,
  gapsPerPage,
  gapFetchMaxIterations,
  logger,
  loggerMessage,
  logEvent,
  remainingBackfills,
  rulesClientContext,
  sortOrder,
  startISO,
  taskInstanceId,
  toProcessRuleIds,
  numRetries,
}: {
  abortController: AbortController;
  aggregatedByRule: Map<string, AggregatedByRuleEntry>;
  endISO: string;
  gapsPerPage: number;
  gapFetchMaxIterations: number;
  logger: Logger;
  loggerMessage: LoggerMessageBuilder;
  logEvent: ReturnType<typeof createGapAutoFillSchedulerEventLogger>;
  remainingBackfills: number;
  rulesClientContext: RulesClientContext;
  sortOrder: 'asc' | 'desc';
  startISO: string;
  taskInstanceId: string;
  toProcessRuleIds: string[];
  numRetries: number;
}): Promise<ProcessGapsForRulesResult> {
  let aggregated = new Map(aggregatedByRule);

  let searchAfter: SortResults[] | undefined;
  let pitId: string | undefined;
  let gapFetchIterationCount = 0;

  while (true) {
    if (gapFetchIterationCount >= gapFetchMaxIterations) {
      logger.debug(
        loggerMessage('Circuit breaker triggered: reached maximum number of gap fetch iterations')
      );
      break;
    }
    gapFetchIterationCount++;

    if (isCancelled(abortController)) {
      return {
        aggregatedByRule: aggregated,
        remainingBackfills,
        state: SchedulerLoopState.CANCELLED,
      };
    }

    const {
      data: gapsPage,
      searchAfter: nextSearchAfter,
      pitId: nextPitId,
    } = await findGapsSearchAfter({
      eventLogClient: await rulesClientContext.getEventLogClient(),
      logger,
      params: {
        ruleIds: toProcessRuleIds,
        start: startISO,
        end: endISO,
        perPage: gapsPerPage,
        sortField: '@timestamp',
        sortOrder,
        statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
        searchAfter,
        pitId,
        hasUnfilledIntervals: true,
        failedAutoFillAttemptsLessThan: numRetries + 1,
      },
    });

    pitId = nextPitId ?? pitId;
    searchAfter = nextSearchAfter;

    if (!gapsPage.length) {
      break;
    }

    const filteredGaps = await filterGapsWithOverlappingBackfills(
      gapsPage,
      rulesClientContext,
      (message) => logger.warn(loggerMessage(message))
    );

    if (filteredGaps.length) {
      const sortedGaps = filteredGaps.sort((a, b) => a.range.gte.getTime() - b.range.gte.getTime());

      const { results: chunkResults } = await processGapsBatch(rulesClientContext, {
        gapsBatch: sortedGaps,
        range: { start: startISO, end: endISO },
        initiator: backfillInitiator.SYSTEM,
        initiatorId: taskInstanceId,
      });

      aggregated = addChunkResultsToAggregation(aggregated, chunkResults);

      const chunkScheduledCount = chunkResults.reduce(
        (count, result) =>
          result.status === GapFillSchedulePerRuleStatus.SUCCESS ? count + 1 : count,
        0
      );

      if (chunkScheduledCount > 0) {
        remainingBackfills = Math.max(remainingBackfills - chunkScheduledCount, 0);
        if (remainingBackfills <= 0) {
          return {
            aggregatedByRule: aggregated,
            remainingBackfills,
            state: SchedulerLoopState.CAPACITY_EXHAUSTED,
          };
        }
      }
    }

    if (gapsPage.length < gapsPerPage) {
      break;
    }
  }

  return { aggregatedByRule: aggregated, remainingBackfills, state: SchedulerLoopState.COMPLETED };
}

function addChunkResultsToAggregation(
  aggregatedByRule: Map<string, AggregatedByRuleEntry>,
  chunkResults: Array<{
    ruleId: string;
    processedGaps: number;
    status: GapFillSchedulePerRuleStatus;
    error?: string;
  }>
): Map<string, AggregatedByRuleEntry> {
  const nextAggregated = new Map(aggregatedByRule);

  for (const chunk of chunkResults) {
    const existing = nextAggregated.get(chunk.ruleId);
    if (!existing) {
      nextAggregated.set(chunk.ruleId, {
        ruleId: chunk.ruleId,
        processedGaps: chunk.processedGaps,
        status: chunk.status,
        error: chunk.error,
      });
      continue;
    }
    let combinedStatus = existing.status;
    if (chunk.status === GapFillSchedulePerRuleStatus.ERROR) {
      combinedStatus = GapFillSchedulePerRuleStatus.ERROR;
    }

    nextAggregated.set(chunk.ruleId, {
      ruleId: chunk.ruleId,
      processedGaps: existing.processedGaps + (chunk.processedGaps ?? 0),
      status: combinedStatus,
      error: existing.error ?? chunk.error,
    });
  }

  return nextAggregated;
}

/**
 * Gap Auto Fill Scheduler task
 *
 * This function registers the Gap Auto Fill Scheduler task. It is used to scan for rules that
 * have detection gaps and schedules backfills to fill those gaps. The scheduler:
 * - Loads its runtime configuration from a `gap_auto_fill_scheduler` saved object
 *   (referenced by `configId` in task params)
 * - Cleans up stuck in-progress gaps that don't have corresponding backfills
 * - Honors a global backfill capacity limit before scheduling and tracks the
 *   remaining capacity locally throughout the task run
 * - Processes rules in batches, prioritizing the rules with the oldest gaps first
 * - Uses PIT + search_after pagination to fetch gaps efficiently from event log
 * - Skips gaps that overlap with already scheduled/running backfills to prevent duplicates
 * - Aggregates per-rule results and logs a single summarized event at the end
 * - Supports cancellation and shutdown via `cancel()` and AbortController
 */

export function registerGapAutoFillSchedulerTask({
  taskManager,
  logger,
  getRulesClientWithRequest,
  eventLogger,
  schedulerConfig,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClientApi> | undefined;
  eventLogger: IEventLogger;
  schedulerConfig?: {
    timeout?: string;
  };
}) {
  taskManager.registerTaskDefinitions({
    [GAP_AUTO_FILL_SCHEDULER_TASK_TYPE]: {
      title: 'Gap Auto Fill Scheduler',
      timeout: schedulerConfig?.timeout ?? DEFAULT_GAP_AUTO_FILL_SCHEDULER_TIMEOUT,
      createTaskRunner: ({ taskInstance, fakeRequest, abortController }) => {
        return {
          async run() {
            const loggerMessage = (message: string) =>
              `[gap-fill-auto-scheduler-task][${taskInstance.id}] ${message}`;
            const startTime = new Date();
            // Step 1: Initialization
            let rulesClient: RulesClientApi;
            let rulesClientContext: RulesClientContext;
            let config: {
              name: string;
              numRetries: number;
              gapFillRange: string;
              schedule: { interval: string };
              maxBackfills: number;
              ruleTypes: Array<{ type: string; consumer: string }>;
            };
            let logEvent: ReturnType<typeof createGapAutoFillSchedulerEventLogger>;
            try {
              const initResult = await initRun({
                fakeRequest,
                getRulesClientWithRequest,
                eventLogger,
                taskInstance,
                startTime,
              });
              rulesClient = initResult.rulesClient;
              rulesClientContext = initResult.rulesClientContext;
              config = initResult.config;
              logEvent = initResult.logEvent;
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : String(e);
              logger.error(loggerMessage(`initialization failed: ${errMsg}`));
              // There no point in retrying the task if it's not initialized.
              return { state: {}, shouldDeleteTask: true };
            }

            try {
              const now = new Date();
              const startDate: Date | undefined = dateMath.parse(config.gapFillRange)?.toDate();
              if (!startDate) {
                throw new Error(`Invalid gapFillRange: ${config.gapFillRange}`);
              }
              const startISO = startDate.toISOString();
              const endISO = now.toISOString();

              // Cleanup stuck in-progress gaps
              try {
                const eventLogClient = await rulesClientContext.getEventLogClient();
                await cleanupStuckInProgressGaps({
                  rulesClientContext,
                  eventLogClient,
                  eventLogger,
                  logger,
                  startDate,
                });
              } catch (cleanupError) {
                const errMsg =
                  cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
                logger.warn(loggerMessage(`cleanup of stuck in-progress gaps failed: ${errMsg}`));
                // Continue with normal flow even if cleanup fails
              }

              // Step 2: Capacity pre-check
              const capacityCheckInitial = await checkBackfillCapacity({
                rulesClient,
                maxBackfills: config.maxBackfills,
                logMessage: (message) => logger.warn(loggerMessage(message)),
                initiatorId: taskInstance.id,
              });
              if (!capacityCheckInitial.canSchedule) {
                await logEvent({
                  status: GAP_AUTO_FILL_STATUS.SKIPPED,
                  results: [],
                  message: `Skipped execution: gap auto-fill capacity limit reached. This task can schedule at most ${capacityCheckInitial.maxBackfills} gap backfills at a time, and existing backfills must finish before new ones can be scheduled.`,
                });
                return { state: {} };
              }

              // Step 3: Fetch rule IDs with gaps
              const remainingBackfills = capacityCheckInitial.remainingCapacity;
              // newest gap first
              const sortOrder = 'desc';
              const { ruleIds } = await rulesClient.getRuleIdsWithGaps({
                start: startISO,
                end: endISO,
                sortOrder,
                hasUnfilledIntervals: true,
                ruleTypes: config.ruleTypes,
              });

              if (!ruleIds.length) {
                await logEvent({
                  status: GAP_AUTO_FILL_STATUS.NO_GAPS,
                  results: [],
                  message: 'Skipped execution: no rules with gaps',
                });
                return { state: {} };
              }

              // Step 4: Process rules in batches
              const gapFillsResult = await processRuleBatches({
                abortController,
                gapsPerPage: DEFAULT_GAPS_PER_PAGE,
                gapFetchMaxIterations: GAP_FETCH_MAX_ITERATIONS,
                logger,
                loggerMessage,
                logEvent,
                remainingBackfills,
                ruleIds,
                rulesBatchSize: DEFAULT_RULES_BATCH_SIZE,
                rulesClient,
                rulesClientContext,
                sortOrder,
                startISO,
                endISO,
                taskInstanceId: taskInstance.id,
                numRetries: config.numRetries,
              });

              const aggregatedByRule = gapFillsResult.aggregatedByRule;
              const consolidated = resultsFromMap(aggregatedByRule);

              // Step 5: Finalize and log results
              const { status: outcomeStatus, message: outcomeMessage } =
                getGapAutoFillRunOutcome(consolidated);
              const summary = consolidated.length
                ? ` | ${formatConsolidatedSummary(consolidated)}`
                : '';
              const summaryMessage = `${outcomeMessage}${summary}`;

              if (gapFillsResult.state === SchedulerLoopState.CAPACITY_EXHAUSTED) {
                await logEvent({
                  status: outcomeStatus,
                  results: consolidated,
                  message: `Stopped early: gap auto-fill capacity limit reached. This task can schedule at most ${capacityCheckInitial.maxBackfills} gap backfills at a time, and existing backfills must finish before new ones can be scheduled. | ${summaryMessage}`,
                });
                return { state: {} };
              }

              if (gapFillsResult.state === SchedulerLoopState.CANCELLED) {
                await logEvent({
                  status: outcomeStatus,
                  results: consolidated,
                  message: `Gap Auto Fill Scheduler cancelled by timeout | Results: ${summaryMessage}`,
                });
                return { state: {} };
              }

              await logEvent({
                status: outcomeStatus,
                results: consolidated,
                message: summaryMessage,
              });

              return { state: {} };
            } catch (error) {
              await logEvent({
                status: GAP_AUTO_FILL_STATUS.ERROR,
                results: [],
                message: `Error during execution: ${error && error.message}`,
              });

              logger.error(loggerMessage(`error: ${error && error.message}`));
              return { state: {} };
            }
          },
        };
      },
    },
  });
}
