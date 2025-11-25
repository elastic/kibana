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
import { gapStatus } from '../../../../common/constants';
import type { createGapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import {
  GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
  DEFAULT_RULES_BATCH_SIZE,
  DEFAULT_GAPS_PER_PAGE,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_TIMEOUT,
  GAP_AUTO_FILL_STATUS,
} from '../../../application/gaps/types/scheduler';
import { backfillInitiator } from '../../../../common/constants';
import type { RulesClientContext } from '../../../rules_client/types';
import type { AggregatedByRuleEntry } from './utils';
import {
  resultsFromMap,
  formatConsolidatedSummary,
  handleCancellation,
  filterGapsWithOverlappingBackfills,
  initRun,
  checkBackfillCapacity,
  getGapAutoFillRunOutcome,
} from './utils';
import { cleanupStuckInProgressGaps } from '../update/cleanup_stuck_in_progress_gaps';

// Circuit breaker to prevent infinite pagination loops when fetching gaps
const GAP_FETCH_MAX_ITERATIONS = 1000;

function addChunkResultsToAggregation(
  aggregatedByRule: Map<string, AggregatedByRuleEntry>,
  chunkResults: Array<{
    ruleId: string;
    processedGaps: number;
    status: GapFillSchedulePerRuleStatus;
    error?: string;
  }>
): void {
  for (const r of chunkResults) {
    const existing = aggregatedByRule.get(r.ruleId);
    if (!existing) {
      aggregatedByRule.set(r.ruleId, {
        ruleId: r.ruleId,
        processedGaps: r.processedGaps,
        status: r.status,
        error: r.error,
      });
    } else {
      let combinedStatus = existing.status;
      if (r.status === GapFillSchedulePerRuleStatus.ERROR) {
        combinedStatus = GapFillSchedulePerRuleStatus.ERROR;
      }

      aggregatedByRule.set(r.ruleId, {
        ruleId: r.ruleId,
        processedGaps: existing.processedGaps + (r.processedGaps ?? 0),
        status: combinedStatus,
        error: existing.error ?? r.error,
      });
    }
  }
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
              return { state: {}, shouldDeleteTask: true };
            }

            try {
              const now = new Date();
              const startDate: Date | undefined = dateMath.parse(config.gapFillRange)?.toDate();
              if (!startDate) {
                throw new Error(`Invalid gapFillRange: ${config.gapFillRange}`);
              }

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
              let remainingBackfills = capacityCheckInitial.remainingCapacity;
              // newest gap first
              const sortOrder = 'desc';
              const { ruleIds } = await rulesClient.getRuleIdsWithGaps({
                start: startDate.toISOString(),
                end: now.toISOString(),
                sortOrder,
                hasUnfilledIntervals: true,
                ruleTypes: config.ruleTypes,
              });

              if (!ruleIds.length) {
                await logEvent({
                  status: GAP_AUTO_FILL_STATUS.SKIPPED,
                  results: [],
                  message: 'Skipped execution: no rules with gaps',
                });
                return { state: {} };
              }

              const aggregatedByRule = new Map<
                string,
                {
                  ruleId: string;
                  processedGaps: number;
                  status: GapFillSchedulePerRuleStatus;
                  error?: string;
                }
              >();

              // Step 4: Process rules in batches
              for (
                let startIdx = 0;
                startIdx < ruleIds.length;
                startIdx += DEFAULT_RULES_BATCH_SIZE
              ) {
                // Stop early if we've reached capacity
                if (remainingBackfills <= 0) {
                  const consolidated = resultsFromMap(aggregatedByRule);
                  await logEvent({
                    status: GAP_AUTO_FILL_STATUS.SUCCESS,
                    results: consolidated,
                    message: `Stopped early: no backfill capacity remaining | ${formatConsolidatedSummary(
                      consolidated
                    )}`,
                  });
                  return { state: {} };
                }
                if (
                  await handleCancellation({
                    abortController,
                    aggregatedByRule,
                    logEvent,
                  })
                ) {
                  return { state: {} };
                }

                const currentRuleIds = ruleIds.slice(startIdx, startIdx + DEFAULT_RULES_BATCH_SIZE);

                // we need to find the rules that are enabled and
                // and check for rule types and consumers that are supported
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

                let searchAfter: SortResults[] | undefined;
                let pitId: string | undefined;
                let scheduledBackfillsCount = 0;

                const gapsPerPage = DEFAULT_GAPS_PER_PAGE;
                let gapFetchIterationCount = 0;

                while (true) {
                  if (gapFetchIterationCount >= GAP_FETCH_MAX_ITERATIONS) {
                    logger.debug(
                      loggerMessage(
                        `Circuit breaker triggered: reached maximum number of gap fetch iterations`
                      )
                    );
                    break;
                  }
                  gapFetchIterationCount++;

                  if (
                    await handleCancellation({
                      abortController,
                      aggregatedByRule,
                      logEvent,
                    })
                  ) {
                    return { state: {} };
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
                      start: startDate.toISOString(),
                      end: now.toISOString(),
                      perPage: gapsPerPage,
                      sortField: '@timestamp',
                      sortOrder,
                      statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
                      searchAfter,
                      pitId,
                      hasUnfilledIntervals: true,
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

                  // there are no gaps to process in this page
                  if (!filteredGaps.length) {
                    // if the page is not full, we've reached the end for this batch
                    if (gapsPage.length < gapsPerPage) {
                      break;
                    }
                    continue;
                  }

                  const sortedGaps = filteredGaps.sort(
                    (a, b) => a.range.gte.getTime() - b.range.gte.getTime()
                  );
                  const { results: chunkResults } = await processGapsBatch(rulesClientContext, {
                    gapsBatch: sortedGaps,
                    range: { start: startDate.toISOString(), end: now.toISOString() },
                    initiator: backfillInitiator.SYSTEM,
                    initiatorId: taskInstance.id,
                  });
                  addChunkResultsToAggregation(aggregatedByRule, chunkResults);
                  chunkResults.forEach((result) => {
                    if (result.status === GapFillSchedulePerRuleStatus.SUCCESS) {
                      scheduledBackfillsCount++;
                    }
                  });

                  if (scheduledBackfillsCount > 0) {
                    remainingBackfills = Math.max(remainingBackfills - scheduledBackfillsCount, 0);
                    if (remainingBackfills <= 0) {
                      break;
                    }
                  }

                  // If fewer than gapsPerPage gaps returned, we've reached the end for this batch
                  if (gapsPage.length < gapsPerPage) {
                    break;
                  }
                }
              }

              // Step 5: Finalize and log results
              const consolidated = resultsFromMap(aggregatedByRule);
              const { status: outcomeStatus, message: outcomeMessage } =
                getGapAutoFillRunOutcome(consolidated);
              const summary = consolidated.length
                ? ` | ${formatConsolidatedSummary(consolidated)}`
                : '';

              await logEvent({
                status: outcomeStatus,
                results: consolidated,
                message: `${outcomeMessage}${summary}`,
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
