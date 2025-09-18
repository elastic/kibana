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
import { withSpan } from '@kbn/apm-utils';
import dateMath from '@kbn/datemath';
import { getRuleIdsWithGaps } from '../../application/rule/methods/get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { findGaps } from './find_gaps';
import { processGapsBatchFromRules } from '../../application/rule/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch_from_rules';

import type { RulesClient } from '../../rules_client/rules_client';
import { gapStatus } from '../../../common/constants';
import { EVENT_LOG_ACTIONS } from '../../plugin';

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

// Register the gap fill processor task
export function registerGapFillAutoSchedulerTask({
  taskManager,
  logger,
  getRulesClientWithRequest,
  eventLogger,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getRulesClientWithRequest: (request: KibanaRequest) => Promise<RulesClient>;
  eventLogger: IEventLogger;
}) {
  taskManager.registerTaskDefinitions({
    'gap-fill-auto-scheduler-task': {
      title: 'Gap Fill Auto Scheduler',
      timeout: '10s',
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
            const context = rulesClient.context;
            const { configId } =
              (taskInstance.params as { configId?: string; spaceId?: string }) || {};
            // Load scheduler SO for config
            const soClient = rulesClient.context.unsecuredSavedObjectsClient;

            const schedulerSo = configId
              ? await soClient.get('gap_fill_auto_scheduler', configId)
              : null;

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

            if (!context) {
              return {
                state: {},
              };
            }

            try {
              // Create the event logger function once
              const logEvent = createGapFillAutoSchedulerEventLogger({
                eventLogger,
                context: rulesClient.context,
                taskInstance,

                startTime,
                config,
              });

              const earlySuccessReturn = (message) => {
                const endTime = new Date();
                logEvent({
                  status: 'success',
                  summary: {
                    totalRules: 0,
                    successfulRules: 0,
                    failedRules: 0,
                    totalGapsProcessed: 0,
                  },
                  message,
                });
                if (schedulerSo) {
                  soClient
                    .update('gap_fill_auto_scheduler', schedulerSo.id, {
                      lastRun: {
                        status: 'success',
                        message,
                        metrics: {
                          totalRules: 0,
                          successfulRules: 0,
                          failedRules: 0,
                          totalGapsProcessed: 0,
                        },
                      },
                      running: false,
                      updatedAt: endTime.toISOString(),
                    })
                    .catch(() => {});
                }
                return {
                  state: {},
                };
              };

              const now = new Date();
              // Parse the gapFillRange using dateMath
              let startDate: Date;
              try {
                const parsedStart = dateMath.parse(config.gapFillRange);
                if (!parsedStart) {
                  throw new Error(`Invalid gapFillRange: ${config.gapFillRange}`);
                }
                startDate = parsedStart.toDate();
              } catch (error) {
                logger.warn(
                  `Invalid gapFillRange "${config.gapFillRange}", using default "now-7d"`
                );
                startDate = dateMath.parse('now-7d')!.toDate();
              }

              // Step 1: Get all rule IDs with gaps, we get the rule ids sorted from rule which has the oldest gap
              // allow us to process the rules with the oldest gap first
              let ruleIds: string[] = [];
              await withSpan(
                { name: 'getRuleIdsWithGaps', type: 'rule run', labels: { plugin: 'alerting' } },
                async () => {
                  const { ruleIds: ruleIdsFromGetRuleIdsWithGaps } = await getRuleIdsWithGaps(
                    rulesClient.context,
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

              if (!ruleIds.length) {
                return earlySuccessReturn(
                  'Gap fill execution completed - no rules with gaps found'
                );
              }

              // Step 2: Fetch rules and filter to only enabled ones
              // TODO: Implement rules filter if provided
              // for now we use all rule ids

              let rules: RuleInfo[] = [];
              await withSpan(
                { name: 'findRules', type: 'rule run', labels: { plugin: 'alerting' } },
                async () => {
                  const { data: rulesFromFindRules } = await rulesClient.find({
                    options: {
                      page: 1,
                      perPage: Math.min(config.maxAmountOfRulesToProcessPerRun, 9999),
                      filter: `alert.attributes.enabled:true AND (${ruleIds
                        .map((id) => `alert.id: ("alert:${id}")`)
                        .join(' OR ')})`,
                    },
                  });
                  rules = rulesFromFindRules;
                }
              );

              // Filter to only enabled rules
              const enabledRuleIds = rules.map((rule: RuleInfo) => rule.id);


              console.log('enabledRuleIds', JSON.stringify(enabledRuleIds));

              if (!enabledRuleIds.length) {
                return earlySuccessReturn(
                  'Gap fill execution completed - no enabled rules with gaps found'
                );
              }

              // Step 3: Fetch gaps for these enabled rule IDs (limit by maxAmountOfRulesToProcessPerRun)
              let gaps: GapInfo[] = [];
              await withSpan(
                { name: 'findGaps', type: 'rule run', labels: { plugin: 'alerting' } },
                async () => {
                  const { data: gapsFromFindGaps } = await findGaps({
                    eventLogClient: await rulesClient.context.getEventLogClient(),
                    logger,
                    params: {
                      ruleIds: enabledRuleIds,
                      ruleId: '',
                      start: startDate.toISOString(),
                      end: now.toISOString(),
                      page: 1,
                      perPage: Math.max(config.maxAmountOfGapsToProcessPerRun, 9999),
                      sortField: '@timestamp',
                      sortOrder: 'asc',
                      statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
                    },
                  });
                  gaps = gapsFromFindGaps;
                }
              );

              console.log('gaps', JSON.stringify(gaps.length));

              if (gaps.length === 0) {
                return earlySuccessReturn('Gap fill execution completed - no gaps found');
              }

              // Step 4: Bulk schedule backfills for all rules at once
              let results;
              await withSpan(
                {
                  name: 'processGapsBatchFromRules',
                  type: 'rule run',
                  labels: { plugin: 'alerting' },
                },
                async () => {
                  const { results: resultsFromProcessGapsBatchFromRules } =
                    await processGapsBatchFromRules(rulesClient.context, {
                      gaps,
                      range: {
                        start: startDate.toISOString(),
                        end: now.toISOString(),
                      },
                    });
                  results = resultsFromProcessGapsBatchFromRules;
                }
              );
              // TODO: think about status etc.'

              let overallStatus: 'success' | 'failure' | 'warning' = 'success';
              const allSuccess = results.every((r) => r.status === 'success');
              const allError = results.every((r) => r.status === 'error');
              if (allSuccess) {
                overallStatus = 'success';
              } else if (allError) {
                overallStatus = 'failure';
              } else {
                overallStatus = 'warning';
              }
              const summary = {
                totalRules: results.length,
                successfulRules: results.filter((r) => r.status === 'success').length,
                failedRules: results.filter((r) => r.status === 'error').length,
                totalGapsProcessed: results.reduce((sum, r) => sum + r.processedGaps, 0),
              };

              // Log execution completion
              logEvent({
                status: overallStatus,
                results,
                summary,
                message: `Gap fill execution completed - ${summary.successfulRules}/${summary.totalRules} rules processed successfully`,
              });

              if (schedulerSo) {
                await soClient.update('gap_fill_auto_scheduler', schedulerSo.id, {
                  lastRun: {
                    status: overallStatus,
                    message: `Processed ${summary.successfulRules}/${summary.totalRules}, ${summary.failedRules} failed; ${summary.totalGapsProcessed} gaps`,
                    metrics: summary,
                  },
                  running: false,
                  updatedAt: new Date().toISOString(),
                });
              }

              return { state: {} };
            } catch (error) {
              const endTime = new Date();
              const logEvent = createGapFillAutoSchedulerEventLogger({
                eventLogger,
                context: rulesClient.context,
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
