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
import { processGapsBatch } from '../../../application/rule/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch';
import { GapFillSchedulePerRuleStatus } from '../../../application/rule/methods/bulk_fill_gaps_by_rule_ids/types';

import type { RulesClientApi } from '../../../types';
import { gapStatus } from '../../../../common/constants';
import type { createGapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import {
  GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
  DEFAULT_RULES_BATCH_SIZE,
  DEFAULT_GAPS_PER_PAGE,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_TIMEOUT,
  GAP_AUTO_FILL_STATUS,
} from '../types/scheduler';
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
} from './utils';
import { cleanupStuckInProgressGaps } from '../update/cleanup_stuck_in_progress_gaps';

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
 * - Honors a global backfill capacity limit before and after each batch to avoid
 *   overscheduling system-initiated backfills
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
            const loggerMesage = (message: string) =>
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
              logger.warn(loggerMesage(`initialization failed: ${errMsg}`));
              return { state: {} };
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
                logger.warn(loggerMesage(`cleanup of stuck in-progress gaps failed: ${errMsg}`));
                // Continue with normal flow even if cleanup fails
              }

              // Step 2: Capacity pre-check
              const capacityCheckInitial = await checkBackfillCapacity({
                rulesClient,
                maxBackfills: config.maxBackfills,
                logMessage: (message) => logger.warn(loggerMesage(message)),
                initiatorId: taskInstance.id,
              });
              if (!capacityCheckInitial.canSchedule) {
                await logEvent({
                  status: GAP_AUTO_FILL_STATUS.SKIPPED,
                  results: [],
                  message: `Skipped execution: no capacity remaining to schedule gap fills (${capacityCheckInitial.currentCount}/${capacityCheckInitial.maxBackfills})`,
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
                    ruleTypeIds: config.ruleTypes.map((rt) => rt.type),
                    consumers: Array.from(new Set(config.ruleTypes.map((rt) => rt.consumer))),
                  },
                });

                const toProcessRuleIds = rules.map((rule) => rule.id).slice(0, remainingBackfills);

                if (!toProcessRuleIds.length) {
                  continue;
                }

                let searchAfter: SortResults[] | undefined;
                let pitId: string | undefined;

                const gapsPerPage = DEFAULT_GAPS_PER_PAGE;

                while (true) {
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
                    (message) => logger.warn(loggerMesage(message))
                  );

                  if (!filteredGaps.length) {
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

                  // If fewer than gapsPerPage gaps returned, we've reached the end for this batch
                  if (gapsPage.length < gapsPerPage) {
                    break;
                  }
                }

                // After finishing this rule batch, re-check backfill capacity
                const capacityCheckPostBatch = await checkBackfillCapacity({
                  rulesClient,
                  maxBackfills: config.maxBackfills,
                  logMessage: (message) => logger.warn(loggerMesage(message)),
                  initiatorId: taskInstance.id,
                });
                if (!capacityCheckPostBatch.canSchedule) {
                  const consolidated = resultsFromMap(aggregatedByRule);
                  await logEvent({
                    status: GAP_AUTO_FILL_STATUS.SUCCESS,
                    results: consolidated,
                    message: `Stopped early: no backfill capacity (${
                      capacityCheckPostBatch.currentCount
                    }/${capacityCheckPostBatch.maxBackfills}) | ${formatConsolidatedSummary(
                      consolidated
                    )}`,
                  });
                  return { state: {} };
                }
                // Update remaining capacity from the latest system state
                remainingBackfills = capacityCheckPostBatch.remainingCapacity;
              }

              // Step 5: Finalize and log results
              const consolidated = Array.from(aggregatedByRule.values());
              if (consolidated.length === 0) {
                await logEvent({
                  status: GAP_AUTO_FILL_STATUS.SKIPPED,
                  results: [],
                  message: "Skipped execution: can't schedule gap fills for any enabled rule",
                });
                return { state: {} };
              }
              const overallStatus = consolidated.every(
                (r) => r.status === GapFillSchedulePerRuleStatus.ERROR
              )
                ? GAP_AUTO_FILL_STATUS.ERROR
                : GAP_AUTO_FILL_STATUS.SUCCESS;

              // Build summary message with counts and error details
              await logEvent({
                status: overallStatus,
                results: consolidated,
                message: `completed | ${formatConsolidatedSummary(consolidated)}`,
              });

              return { state: {} };
            } catch (error) {
              await logEvent({
                status: GAP_AUTO_FILL_STATUS.ERROR,
                results: [],
                message: `Error during execution: ${error && error.message}`,
              });

              logger.error(loggerMesage(`error: ${error && error.message}`));
              return { state: {} };
            }
          },
        };
      },
    },
  });
}
