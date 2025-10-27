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
import { withSpan } from '@kbn/apm-utils';
import dateMath from '@kbn/datemath';
import { findGapsSearchAfter } from '../find_gaps';
import { processGapsBatch } from '../../../application/rule/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch';

import type { RulesClient } from '../../../rules_client/rules_client';
import { gapStatus } from '../../../../common/constants';
import { createGapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import type { GapAutoFillSchedulerEventLogger } from './gap_auto_fill_scheduler_event_log';
import type { Gap } from '../gap';
import type { SchedulerSoAttributes, GapAutoFillSchedulerLogConfig } from '../types/scheduler';
import {
  GAP_AUTO_FILL_SCHEDULER_TASK_TYPE,
  DEFAULT_RULES_BATCH_SIZE,
  DEFAULT_GAPS_PER_PAGE,
  GAP_AUTO_FILL_STATUS,
} from '../types/scheduler';
import type { GapAutoFillStatus } from '../types/scheduler';
import { backfillInitiator } from '../../../../common/constants';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../saved_objects';

import type { RulesClientContext } from '../../../rules_client/types';

interface RuleInfo {
  id: string;
  enabled: boolean;
}
interface AggregatedByRuleEntry {
  ruleId: string;
  processedGaps: number;
  status: 'success' | 'error';
  error?: string;
}

function overallStatusFromResults(
  results: AggregatedByRuleEntry[]
): typeof GAP_AUTO_FILL_STATUS.ERROR | typeof GAP_AUTO_FILL_STATUS.SUCCESS {
  return results.some((r) => r.status === 'error')
    ? GAP_AUTO_FILL_STATUS.ERROR
    : GAP_AUTO_FILL_STATUS.SUCCESS;
}

function resultsFromMap(
  aggregatedByRule: Map<string, AggregatedByRuleEntry>
): AggregatedByRuleEntry[] {
  return Array.from(aggregatedByRule.values());
}

async function handleCancellation({
  wasCancelled,
  abortController,
  aggregatedByRule,
  logEvent,
}: {
  wasCancelled: boolean;
  abortController?: AbortController;
  aggregatedByRule: Map<string, AggregatedByRuleEntry>;
  logEvent: GapAutoFillSchedulerEventLogger;
}): Promise<boolean> {
  if (!wasCancelled && !abortController?.signal.aborted) return false;

  const consolidated = resultsFromMap(aggregatedByRule);

  await logEvent({
    status: GAP_AUTO_FILL_STATUS.SUCCESS,
    results: consolidated,
    message: `cancelled`,
  });

  return true;
}

function resolveStartDate(gapFillRange: string, logger: Logger): Date {
  try {
    const parsedStart = dateMath.parse(gapFillRange);
    if (!parsedStart) {
      throw new Error(`Invalid gapFillRange: ${gapFillRange}`);
    }
    return parsedStart.toDate();
  } catch (error) {
    logger.warn(`Invalid gapFillRange "${gapFillRange}", using default "now-7d"`);
    return dateMath.parse('now-7d')!.toDate();
  }
}

async function filterGapsWithOverlappingBackfills(
  gaps: Gap[],
  rulesClientContext: RulesClientContext,
  logger: Logger
): Promise<Gap[]> {
  const filteredGaps: Gap[] = [];
  const gapsWithOverlappingBackfills: Array<{ gap: Gap; overlappingBackfills: number }> = [];

  const actionsClient = await rulesClientContext.getActionsClient();
  const backfillClient = rulesClientContext.backfillClient;

  for (const gap of gaps) {
    try {
      const overlappingBackfills = await backfillClient.findOverlappingBackfills({
        ruleId: gap.ruleId,
        start: gap.range.gte,
        end: gap.range.lte,
        savedObjectsRepository: rulesClientContext.internalSavedObjectsRepository,
        actionsClient,
      });

      if (overlappingBackfills.length === 0) {
        filteredGaps.push(gap);
      } else {
        gapsWithOverlappingBackfills.push({
          gap,
          overlappingBackfills: overlappingBackfills.length,
        });
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to check overlapping backfills for gap in rule ${gap.ruleId}: ${errMsg}`);
    }
  }

  if (gapsWithOverlappingBackfills.length > 0) {
    logger.info(
      `Filtered out ${gapsWithOverlappingBackfills.length} gaps that have overlapping backfills`
    );
  }

  return filteredGaps;
}

async function initRun({
  fakeRequest,
  getRulesClientWithRequest,
  eventLogger,
  taskInstance,
  startTime,
}: {
  fakeRequest: KibanaRequest | undefined;
  getRulesClientWithRequest?: (request: KibanaRequest) => Promise<RulesClient> | undefined;
  eventLogger: IEventLogger;
  taskInstance: {
    id: string;
    scheduledAt: Date;
    state?: Record<string, unknown>;
    params?: { configId?: string };
  };
  startTime: Date;
}): Promise<{
  rulesClient: RulesClient;
  rulesClientContext: RulesClientContext;
  config: {
    name: string;
    amountOfRetries: number;
    gapFillRange: string;
    schedule: { interval: string };
    maxBackfills: number;
  };
  logEvent: GapAutoFillSchedulerEventLogger;
}> {
  if (!getRulesClientWithRequest || !fakeRequest) {
    throw new Error('Missing request or rules client factory');
  }
  const rulesClient = await getRulesClientWithRequest(fakeRequest);
  if (!rulesClient) {
    throw new Error('Missing rules client');
  }
  const rulesClientContext = rulesClient.getContext();
  const configId = taskInstance?.params?.configId;

  if (!configId) {
    throw new Error('Missing configId');
  }

  const soClient = rulesClientContext.unsecuredSavedObjectsClient;
  const schedulerSo = configId
    ? await soClient.get(GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE, configId)
    : null;

  if (!schedulerSo) {
    throw new Error('Missing gap_auto_fill_scheduler saved object');
  }
  const soAttrs = schedulerSo.attributes as SchedulerSoAttributes;
  const config: GapAutoFillSchedulerLogConfig = {
    name: soAttrs.name,
    amountOfRetries: soAttrs.amountOfRetries,
    gapFillRange: soAttrs.gapFillRange,
    schedule: soAttrs.schedule,
    maxBackfills: soAttrs.maxBackfills,
  };
  const logEvent = createGapAutoFillSchedulerEventLogger({
    eventLogger,
    context: rulesClientContext,
    taskInstance,
    startTime,
    config: soAttrs,
  });
  return { rulesClient, rulesClientContext, config, logEvent };
}

async function checkBackfillCapacity({
  rulesClient,
  maxBackfills,
  logger,
  initiatorId,
}: {
  rulesClient: RulesClient;
  maxBackfills: number;
  logger: Logger;
  initiatorId: string;
}): Promise<{
  canSchedule: boolean;
  currentCount: number;
  maxBackfills: number;
  remainingCapacity: number;
}> {
  try {
    const findRes = await rulesClient.findBackfill({
      page: 1,
      perPage: 1,
      initiator: backfillInitiator.SYSTEM,
      initiatorId,
    });
    const currentCount = findRes.total;
    const remainingCapacity = Math.max(0, maxBackfills - currentCount);
    const canSchedule = remainingCapacity > 0;
    return { canSchedule, currentCount, maxBackfills, remainingCapacity };
  } catch (e) {
    logger.warn(`Failed to check system backfills count: ${e && (e as Error).message}`);
    return { canSchedule: false, currentCount: 0, maxBackfills, remainingCapacity: maxBackfills };
  }
}

function addChunkResultsToAggregation(
  aggregatedByRule: Map<string, AggregatedByRuleEntry>,
  chunkResults: Array<{
    ruleId: string;
    processedGaps: number;
    status: 'success' | 'error';
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
      const combinedStatus =
        existing.status === 'error' || r.status === 'error' ? 'error' : 'success';
      aggregatedByRule.set(r.ruleId, {
        ruleId: r.ruleId,
        processedGaps: existing.processedGaps + (r.processedGaps || 0),
        status: combinedStatus,
        error: existing.error || r.error,
      });
    }
  }
}

async function finalizeRun({
  logEvent,
  status,
  results,
  message,
}: {
  logEvent: ReturnType<typeof createGapAutoFillSchedulerEventLogger>;
  status: GapAutoFillStatus;
  results?: AggregatedByRuleEntry[];
  message: string;
}) {
  const consolidated = results ?? [];
  await logEvent({ status, results: consolidated, message });
}

/**
 * Gap Auto Fill Scheduler task
 *
 * This function registers the Gap Auto Fill Scheduler task. It is used to scan for rules that
 * have detection gaps and schedules backfills to fill those gaps. The scheduler:
 * - Loads its runtime configuration from a `gap_auto_fill_scheduler` saved object
 *   (referenced by `configId` in task params)
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
  getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClient> | undefined;
  eventLogger: IEventLogger;
  schedulerConfig?: {
    timeout?: string;
    sortOrder?: 'asc' | 'desc';
  };
}) {
  taskManager.registerTaskDefinitions({
    [GAP_AUTO_FILL_SCHEDULER_TASK_TYPE]: {
      title: 'Gap Auto Fill Scheduler',
      timeout: schedulerConfig?.timeout ?? '40s',
      createTaskRunner: ({ taskInstance, fakeRequest, abortController }) => {
        let wasCancelled = false;

        return {
          async cancel() {
            wasCancelled = true;
            logger.info(
              `[gap-fill-auto-scheduler-task][${taskInstance.id}] cancel() called (timeout or shutdown)`
            );
          },
          async run() {
            const startTime = new Date();
            // Step 1: Initialization
            let rulesClient: RulesClient;
            let rulesClientContext: RulesClientContext;
            let config: {
              name: string;
              amountOfRetries: number;
              gapFillRange: string;
              schedule: { interval: string };
              maxBackfills: number;
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
              logger.warn(`gap-auto-fill-scheduler: init failed: ${errMsg}`);
              return { state: {} };
            }

            try {
              const now = new Date();
              // Step 2: Capacity pre-check
              const capacityCheckInitial = await checkBackfillCapacity({
                rulesClient,
                maxBackfills: config.maxBackfills,
                logger,
                initiatorId: taskInstance.id,
              });
              if (!capacityCheckInitial.canSchedule) {
                await finalizeRun({
                  logEvent,
                  status: 'skipped',
                  results: [],
                  message: `Gap fill execution skipped - no backfill capacity (${capacityCheckInitial.currentCount}/${capacityCheckInitial.maxBackfills})`,
                });
                return { state: {} };
              }

              let remainingBackfills = capacityCheckInitial.remainingCapacity;
              // Step 3: Fetch rule IDs with gaps
              const startDate: Date = resolveStartDate(config.gapFillRange, logger);
              const sortOrder = schedulerConfig?.sortOrder ?? 'asc';
              const { ruleIds } = await rulesClient.getRuleIdsWithGaps({
                start: startDate.toISOString(),
                end: now.toISOString(),
                sortOrder,
              });

              if (!ruleIds.length) {
                await finalizeRun({
                  logEvent,
                  status: GAP_AUTO_FILL_STATUS.SKIPPED,
                  results: [],
                  message: 'skipped: no rules with gaps',
                });
                return { state: {} };
              }

              const aggregatedByRule = new Map<
                string,
                {
                  ruleId: string;
                  processedGaps: number;
                  status: 'success' | 'error';
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
                  await finalizeRun({
                    logEvent,
                    status: GAP_AUTO_FILL_STATUS.SUCCESS,
                    results: consolidated,
                    message: 'stopped: no backfill capacity remaining',
                  });
                  return { state: {} };
                }
                if (
                  await handleCancellation({
                    wasCancelled,
                    abortController,
                    aggregatedByRule,
                    logEvent,
                  })
                ) {
                  return { state: {} };
                }

                const currentRuleIds = ruleIds.slice(startIdx, startIdx + DEFAULT_RULES_BATCH_SIZE);

                const { data: rules } = await rulesClient.find({
                  options: {
                    page: 1,
                    perPage: currentRuleIds.length,
                    filter: `alert.attributes.enabled:true AND (${currentRuleIds
                      .map((id) => `alert.id: ("alert:${id}")`)
                      .join(' OR ')})`,
                  },
                });

                const toProcessRuleIds = rules
                  .map((rule: RuleInfo) => rule.id)
                  .slice(0, remainingBackfills);

                if (!toProcessRuleIds.length) {
                  continue;
                }

                await withSpan(
                  {
                    name: 'gapAutoFillBatch',
                    type: 'rule run',
                    labels: {
                      plugin: 'alerting',
                    },
                  },
                  async () => {
                    let searchAfter: SortResults[] | undefined;
                    let pitId: string | undefined;

                    const gapsPerPage = DEFAULT_GAPS_PER_PAGE;

                    while (true) {
                      if (
                        await handleCancellation({
                          wasCancelled,
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
                        logger
                      );

                      if (!filteredGaps.length) {
                        if (gapsPage.length < gapsPerPage) {
                          break;
                        }
                        continue;
                      }

                      const { results: chunkResults } = await processGapsBatch(rulesClientContext, {
                        gapsBatch: filteredGaps,
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
                      logger,
                      initiatorId: taskInstance.id,
                    });
                    if (!capacityCheckPostBatch.canSchedule) {
                      const consolidated = resultsFromMap(aggregatedByRule);
                      await finalizeRun({
                        logEvent,
                        status: GAP_AUTO_FILL_STATUS.SUCCESS,
                        results: consolidated,
                        message: `stopped: no backfill capacity (${capacityCheckPostBatch.currentCount}/${capacityCheckPostBatch.maxBackfills})`,
                      });
                      return { state: {} };
                    }
                    // Update remaining capacity from the latest system state
                    remainingBackfills = capacityCheckPostBatch.remainingCapacity;
                  }
                );
              }

              // Step 5: Finalize and log results
              const consolidated = Array.from(aggregatedByRule.values());
              if (consolidated.length === 0) {
                await finalizeRun({
                  logEvent,
                  status: GAP_AUTO_FILL_STATUS.SKIPPED,
                  results: [],
                  message: 'skipped: no gaps',
                });
                return { state: {} };
              }

              const overallStatus = overallStatusFromResults(consolidated);

              await finalizeRun({
                logEvent,
                status: overallStatus,
                results: consolidated,
                message: `completed`,
              });

              return { state: {} };
            } catch (error) {
              logEvent({
                status: GAP_AUTO_FILL_STATUS.ERROR,
                results: [],
                message: `error: ${error && error.message}`,
              });

              logger.error(`gap-fill-auto-scheduler error: ${error && error.message}`);
              return { state: {} };
            }
          },
        };
      },
    },
  });
}
