/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { withSpan } from '@kbn/apm-utils';
import dateMath from '@kbn/datemath';
import { getRuleIdsWithGaps } from '../../application/rule/methods/get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { findGapsSearchAfter } from './find_gaps';
import { processGapsBatchFromRules } from '../../application/rule/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch_from_rules';

import type { RulesClient } from '../../rules_client/rules_client';
import { gapStatus } from '../../../common/constants';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import type { Gap } from './gap';
import type { BackfillClient } from '../../backfill_client/backfill_client';
import type { RulesClientContext } from '../../rules_client/types';

interface GapFillTaskState {
  config: {
    name: string;
    maxAmountOfGapsToProcessPerRun: number;
    maxAmountOfRulesToProcessPerRun: number;
    amountOfRetries: number;
    rulesFilter: string;
    gapFillRange: string;
    schedule: {
      interval: string;
    };
  };
  lastRun: {
    results: Array<{
      ruleId: string;
      processedGaps: number;
      status: 'success' | 'error';
      error?: string;
    }>;
    status: 'success' | 'error';
    error?: string;
    date: string;
  } | null;
}

interface RuleInfo {
  id: string;
  enabled: boolean;
}

interface LogEventParams {
  status: 'success' | 'error';
  results?: Array<{
    ruleId: string;
    processedGaps: number;
    status: 'success' | 'error';
    error?: string;
  }>;
  summary: {
    totalRules: number;
    successfulRules: number;
    failedRules: number;
    totalGapsProcessed: number;
  };
  message: string;
}

function createGapFillAutoSchedulerEventLogger({
  eventLogger,
  context,
  taskInstance,
  startTime,
  config,
}: {
  eventLogger: IEventLogger;
  context: { spaceId: string };
  taskInstance: { id: string; scheduledAt: Date; state?: Record<string, unknown> };
  startTime: Date;
  config: GapFillTaskState['config'];
}) {
  return ({ status, results = [], summary, message }: LogEventParams) => {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    eventLogger.logEvent({
      event: { action: EVENT_LOG_ACTIONS.gapFillAutoSchedule },
      kibana: {
        // Add space context
        space_ids: [context.spaceId],
        // Add task context for searchability
        task: {
          id: taskInstance.id,
          scheduled: taskInstance.scheduledAt.toISOString(),
          schedule_delay: startTime.getTime() - taskInstance.scheduledAt.getTime(),
        },
        // Add saved object reference to the task
        saved_objects: [
          {
            rel: 'primary',
            type: 'task',
            id: taskInstance.id,
          },
        ],
        auto_gap_fill: {
          execution: {
            status,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            duration_ms: duration,
            config: {
              name: config.name,
              max_amount_of_gaps_to_process_per_run: config.maxAmountOfGapsToProcessPerRun,
              max_amount_of_rules_to_process_per_run: config.maxAmountOfRulesToProcessPerRun,
              amount_of_retries: config.amountOfRetries,
              rules_filter: config.rulesFilter,
              gap_fill_range: config.gapFillRange,
              schedule: config.schedule,
            },
            results: results?.map((result) => ({
              rule_id: result.ruleId,
              processed_gaps: result.processedGaps,
              status: result.status,
              error: result.error,
            })),
            summary: {
              total_rules: summary.totalRules,
              successful_rules: summary.successfulRules,
              failed_rules: summary.failedRules,
              total_gaps_processed: summary.totalGapsProcessed,
            },
          },
        },
      },
      message,
    });
  };
}

// Helper types and utilities to improve readability/maintainability
interface SchedulerSoAttributes {
  name?: string;
  maxAmountOfGapsToProcessPerRun?: number;
  maxAmountOfRulesToProcessPerRun?: number;
  amountOfRetries?: number;
  rulesFilter?: string;
  gapFillRange?: string;
  schedule?: { interval: string };
  enabled?: boolean;
}

interface AggregatedByRuleEntry {
  ruleId: string;
  processedGaps: number;
  status: 'success' | 'error';
  error?: string;
}

interface RunSummary {
  totalRules: number;
  successfulRules: number;
  failedRules: number;
  totalGapsProcessed: number;
}

function makeRunSummary(results: AggregatedByRuleEntry[]): RunSummary {
  return {
    totalRules: results.length,
    successfulRules: results.filter((r) => r.status === 'success').length,
    failedRules: results.filter((r) => r.status === 'error').length,
    totalGapsProcessed: results.reduce((sum, r) => sum + (r.processedGaps || 0), 0),
  };
}

function overallStatusFromResults(results: AggregatedByRuleEntry[]): 'success' | 'error' {
  return results.some((r) => r.status === 'error') ? 'error' : 'success';
}

function resultsFromMap(
  aggregatedByRule: Map<string, AggregatedByRuleEntry>
): AggregatedByRuleEntry[] {
  return Array.from(aggregatedByRule.values());
}

async function updateSchedulerSO({
  soClient,
  schedulerSo,
  payload,
}: {
  soClient: SavedObjectsClientContract;
  schedulerSo: { id: string } | null;
  payload: Record<string, unknown>;
}) {
  if (!schedulerSo) return;
  await soClient.update('gap_fill_auto_scheduler', schedulerSo.id, payload);
}

async function logExecution({
  logEvent,
  status,
  results,
  summary,
  message,
}: {
  logEvent: ReturnType<typeof createGapFillAutoSchedulerEventLogger>;
  status: 'success' | 'error';
  results?: AggregatedByRuleEntry[];
  summary: RunSummary;
  message: string;
}) {
  logEvent({ status, results, summary, message });
}

async function earlySuccess({
  logEvent,
  soClient,
  schedulerSo,
  message,
}: {
  logEvent: ReturnType<typeof createGapFillAutoSchedulerEventLogger>;
  soClient: SavedObjectsClientContract;
  schedulerSo: { id: string } | null;
  message: string;
}) {
  const summary: RunSummary = {
    totalRules: 0,
    successfulRules: 0,
    failedRules: 0,
    totalGapsProcessed: 0,
  };
  await logExecution({ logEvent, status: 'success', summary, message });
  await updateSchedulerSO({
    soClient,
    schedulerSo,
    payload: {
      lastRun: {
        status: 'success',
        message,
        metrics: summary,
      },
      running: false,
      updatedAt: new Date().toISOString(),
    },
  });
}

async function handleCancellation({
  wasCancelled,
  abortController,
  aggregatedByRule,
  logEvent,
  soClient,
  schedulerSo,
}: {
  wasCancelled: boolean;
  abortController?: AbortController;
  aggregatedByRule: Map<string, AggregatedByRuleEntry>;
  logEvent: ReturnType<typeof createGapFillAutoSchedulerEventLogger>;
  soClient: SavedObjectsClientContract;
  schedulerSo: { id: string } | null;
}): Promise<boolean> {
  if (!wasCancelled && !abortController?.signal.aborted) return false;

  const consolidated = resultsFromMap(aggregatedByRule);
  const partialSummary = makeRunSummary(consolidated);

  await logExecution({
    logEvent,
    status: 'success',
    results: consolidated,
    summary: partialSummary,
    message: `Gap fill execution cancelled - processed ${partialSummary.totalGapsProcessed} gaps so far`,
  });

  await updateSchedulerSO({
    soClient,
    schedulerSo,
    payload: {
      lastRun: {
        status: 'success',
        message: `Cancelled: ${partialSummary.successfulRules}/${partialSummary.totalRules} rules processed; ${partialSummary.totalGapsProcessed} gaps`,
        metrics: partialSummary,
      },
      running: false,
      updatedAt: new Date().toISOString(),
    },
  });

  return true;
}

// Cohesive phase helpers
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

async function fetchRuleIdsWithGapsPhase(
  rulesClientContext: RulesClientContext,
  startDate: Date,
  now: Date
): Promise<string[]> {
  let ruleIds: string[] = [];
  await withSpan(
    { name: 'getRuleIdsWithGaps', type: 'rule run', labels: { plugin: 'alerting' } },
    async () => {
      const { ruleIds: ruleIdsFromGetRuleIdsWithGaps } = await getRuleIdsWithGaps(
        rulesClientContext,
        {
          start: startDate.toISOString(),
          end: now.toISOString(),
          statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
          hasUnfilledIntervals: true,
        }
      );
      ruleIds = ruleIdsFromGetRuleIdsWithGaps;
    }
  );
  return ruleIds;
}

async function findEnabledRules(
  rulesClient: RulesClient,
  currentRuleIds: string[]
): Promise<RuleInfo[]> {
  let rules: RuleInfo[] = [];
  await withSpan(
    { name: 'findRules', type: 'rule run', labels: { plugin: 'alerting' } },
    async () => {
      const { data: rulesFromFindRules } = await rulesClient.find({
        options: {
          page: 1,
          perPage: currentRuleIds.length,
          filter: `alert.attributes.enabled:true AND (${currentRuleIds
            .map((id) => `alert.id: ("alert:${id}")`)
            .join(' OR ')})`,
        },
      });
      rules = rulesFromFindRules;
    }
  );
  return rules;
}

async function findGapsSearchPage({
  rulesClientContext,
  enabledRuleIds,
  startDate,
  now,
  perPage,
  logger,
  searchAfter,
  pitId,
}: {
  rulesClientContext: RulesClientContext;
  enabledRuleIds: string[];
  startDate: Date;
  now: Date;
  perPage: number;
  logger: Logger;
  searchAfter?: SortResults[];
  pitId?: string;
}): Promise<{
  data: Gap[];
  searchAfter?: SortResults[];
  pitId?: string;
}> {
  return withSpan(
    {
      name: 'findGapsSearchAfter',
      type: 'rule run',
      labels: { plugin: 'alerting' },
    },
    async () => {
      const res = await findGapsSearchAfter({
        eventLogClient: await rulesClientContext.getEventLogClient(),
        logger,
        params: {
          ruleIds: enabledRuleIds,
          start: startDate.toISOString(),
          end: now.toISOString(),
          perPage,
          sortField: '@timestamp',
          sortOrder: 'asc',
          statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
          searchAfter,
          pitId,
        },
      });
      return res;
    }
  );
}

// Register the gap fill processor task
export function registerGapFillAutoSchedulerTask({
  taskManager,
  logger,
  getRulesClientWithRequest,
  eventLogger,
  // getActionsClientWithRequest,
  // getSavedObjectsClientWithRequest,
  backfillClient,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClient>;
  eventLogger: IEventLogger;
  // getActionsClientWithRequest: (request: KibanaRequest) => Promise<ActionsClient>;
  // getSavedObjectsClientWithRequest: (request: KibanaRequest) => any;
  backfillClient: BackfillClient;
}) {
  taskManager.registerTaskDefinitions({
    'gap-fill-auto-scheduler-task': {
      title: 'Gap Fill Auto Scheduler',
      timeout: '1m',
      createTaskRunner: ({ taskInstance, fakeRequest, abortController }) => {
        // POC runner: simulate async batching work, support cancellation, and persist progress periodically
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
            // Get the RulesClient using the fake request
            const rulesClient = await getRulesClientWithRequest(fakeRequest!);
            const rulesClientWithContext = rulesClient as unknown as {
              context: RulesClientContext;
            };
            const rulesClientContext = rulesClientWithContext.context;
            const { configId } =
              (taskInstance.params as { configId?: string; spaceId?: string }) || {};
            // Load scheduler SO for config
            const soClient = rulesClientContext.unsecuredSavedObjectsClient;

            const schedulerSo = configId
              ? await soClient.get('gap_fill_auto_scheduler', configId)
              : null;

            const soAttrs: SchedulerSoAttributes =
              (schedulerSo?.attributes as SchedulerSoAttributes) || {};
            const config = {
              name: soAttrs.name ?? 'gap-fill-auto-fill-name',
              maxAmountOfGapsToProcessPerRun: soAttrs.maxAmountOfGapsToProcessPerRun ?? 10000,
              maxAmountOfRulesToProcessPerRun: soAttrs.maxAmountOfRulesToProcessPerRun ?? 100,
              amountOfRetries: soAttrs.amountOfRetries ?? 3,
              rulesFilter: soAttrs.rulesFilter ?? '',
              gapFillRange: soAttrs.gapFillRange ?? 'now-7d',
              schedule: soAttrs.schedule ?? { interval: '1h' },
            };

            if (!rulesClientContext) {
              return {
                state: {},
              };
            }

            // Function to filter gaps that have overlapping backfills
            const filterGapsWithOverlappingBackfills = async (gaps: Gap[]) => {
              const filteredGaps: Gap[] = [];
              const gapsWithOverlappingBackfills: Array<{
                gap: Gap;
                overlappingBackfills: number;
              }> = [];

              const actionsClient = await rulesClientContext.getActionsClient();

              for (const gap of gaps) {
                try {
                  const overlappingBackfills = await backfillClient.findOverlappingBackfills({
                    ruleId: gap.ruleId,
                    start: gap.range.gte,
                    end: gap.range.lte,
                    savedObjectsRepository:
                      rulesClientContext.internalSavedObjectsRepository as import('@kbn/core/server').ISavedObjectsRepository,
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
                } catch (error) {
                  logger.warn(
                    `Failed to check overlapping backfills for gap in rule ${gap.ruleId}: ${error.message}`
                  );
                  // If we can't check for overlapping backfills, include the gap to be safe
                  filteredGaps.push(gap);
                }
              }

              if (gapsWithOverlappingBackfills.length > 0) {
                logger.info(
                  `Filtered out ${
                    gapsWithOverlappingBackfills.length
                  } gaps that have overlapping backfills: ${gapsWithOverlappingBackfills
                    .map((g) => `rule ${g.gap.ruleId} (${g.overlappingBackfills} backfills)`)
                    .join(', ')}`
                );
              }

              return filteredGaps;
            };

            try {
              // Create the event logger function once
              const logEvent = createGapFillAutoSchedulerEventLogger({
                eventLogger,
                context: rulesClientContext,
                taskInstance,

                startTime,
                config,
              });
              const now = new Date();
              // Parse the gapFillRange using helper
              const startDate: Date = resolveStartDate(config.gapFillRange, logger);

              // Step 1: Get all rule IDs with gaps, we get the rule ids sorted from rule which has the oldest gap
              // allow us to process the rules with the oldest gap first
              const ruleIds: string[] = await fetchRuleIdsWithGapsPhase(
                rulesClientContext,
                startDate,
                now
              );

              if (!ruleIds.length) {
                await earlySuccess({
                  logEvent,
                  soClient,
                  schedulerSo,
                  message: 'Gap fill execution completed - no rules with gaps found',
                });
                return { state: {} };
              }

              // Step 2-5: Iterate enabled rules in batches (100 per run by default), and for each
              // batch page through gaps in chunks of 1000 until exhausted or cancelled.
              const aggregatedByRule = new Map<
                string,
                {
                  ruleId: string;
                  processedGaps: number;
                  status: 'success' | 'error';
                  error?: string;
                }
              >();
              const rulesBatchSize = Math.max(1, config.maxAmountOfRulesToProcessPerRun ?? 100);
              const gapsPerPage = 1000;

              for (let startIdx = 0; startIdx < ruleIds.length; startIdx += rulesBatchSize) {
                if (
                  await handleCancellation({
                    wasCancelled,
                    abortController,
                    aggregatedByRule,
                    logEvent,
                    soClient,
                    schedulerSo,
                  })
                ) {
                  return { state: {} };
                }

                const currentRuleIds = ruleIds.slice(startIdx, startIdx + rulesBatchSize);

                const rules: RuleInfo[] = await findEnabledRules(rulesClient, currentRuleIds);

                const enabledRuleIds = rules.map((rule: RuleInfo) => rule.id);
                if (!enabledRuleIds.length) {
                  continue; // no enabled rules in this batch; move to next batch
                }

                let searchAfter: SortResults[] | undefined;
                let pitId: string | undefined;

                while (true) {
                  if (
                    await handleCancellation({
                      wasCancelled,
                      abortController,
                      aggregatedByRule,
                      logEvent,
                      soClient,
                      schedulerSo,
                    })
                  ) {
                    return { state: {} };
                  }

                  const {
                    data,
                    searchAfter: nextSearchAfter,
                    pitId: nextPitId,
                  } = await findGapsSearchPage({
                    rulesClientContext,
                    enabledRuleIds,
                    startDate,
                    now,
                    perPage: gapsPerPage,
                    logger,
                    searchAfter,
                    pitId,
                  });

                  pitId = nextPitId ?? pitId;
                  searchAfter = nextSearchAfter;

                  if (!data.length) {
                    break; // all gaps for this batch processed
                  }

                  const filteredGaps = await withSpan(
                    {
                      name: 'filterGapsWithOverlappingBackfills',
                      type: 'rule run',
                      labels: { plugin: 'alerting' },
                    },
                    async () => filterGapsWithOverlappingBackfills(data)
                  );

                  if (!filteredGaps.length) {
                    // nothing to process in this page
                    if (data.length < gapsPerPage) {
                      break;
                    }
                    continue;
                  }

                  const { results: chunkResults } = await withSpan(
                    {
                      name: 'processGapsBatchFromRules',
                      type: 'rule run',
                      labels: { plugin: 'alerting' },
                    },
                    async () =>
                      processGapsBatchFromRules(rulesClientContext, {
                        gaps: filteredGaps,
                        range: { start: startDate.toISOString(), end: now.toISOString() },
                      })
                  );

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

                  // If fewer than gapsPerPage gaps returned, we've reached the end for this batch
                  if (data.length < gapsPerPage) {
                    break;
                  }
                }
              }

              const consolidated = Array.from(aggregatedByRule.values());
              if (consolidated.length === 0) {
                await earlySuccess({
                  logEvent,
                  soClient,
                  schedulerSo,
                  message: 'Gap fill execution completed - no gaps found',
                });
                return { state: {} };
              }

              const summary = makeRunSummary(consolidated);
              const overallStatus = overallStatusFromResults(consolidated);

              await logExecution({
                logEvent,
                status: overallStatus,
                results: consolidated,
                summary,
                message: `Gap fill execution completed - ${summary.successfulRules}/${summary.totalRules} rules processed successfully`,
              });

              await updateSchedulerSO({
                soClient,
                schedulerSo,
                payload: {
                  lastRun: {
                    status: overallStatus,
                    message: `Processed ${summary.successfulRules}/${summary.totalRules}, ${summary.failedRules} failed; ${summary.totalGapsProcessed} gaps`,
                    metrics: summary,
                  },
                  running: false,
                  updatedAt: new Date().toISOString(),
                },
              });

              return { state: {} };
            } catch (error) {
              const endTime = new Date();
              const logEvent = createGapFillAutoSchedulerEventLogger({
                eventLogger,
                context: rulesClientContext,
                taskInstance,

                startTime,
                config,
              });
              logEvent({
                status: 'error',
                results: [],
                summary: {
                  totalRules: 0,
                  successfulRules: 0,
                  failedRules: 0,
                  totalGapsProcessed: 0,
                },
                message: `Gap fill execution failed - ${error && error.message}`,
              });

              logger.error(`gap-fill-auto-scheduler error: ${error && error.message}`);
              if (schedulerSo) {
                await soClient.update('gap_fill_auto_scheduler', schedulerSo.id, {
                  lastRun: { status: 'failure', message: error.message },
                  running: false,
                  updatedAt: endTime.toISOString(),
                });
              }
              return { state: {} };
            }
          },
        };
      },
    },
  });
}
