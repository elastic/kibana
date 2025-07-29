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
import dateMath from '@kbn/datemath';
import { getRuleIdsWithGaps } from '../../application/rule/methods/get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { findGaps } from './find_gaps';
import { processGapsBatch } from '../../application/rule/methods/bulk_fill_gaps_by_rule_ids/process_gaps_batch';
import { partiallyUpdateRule } from '../../saved_objects/partially_update_rule';
import type { RulesClient } from '../../rules_client/rules_client';
import { gapStatus } from '../../../common/constants';
import { EVENT_LOG_ACTIONS } from '../../plugin';

interface GapFillTaskState {
  config: {
    name: string;
    amountOfGapsToProcessPerRun: number;
    amountOfRetries: number;
    excludeRuleIds: string[];
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
            config,
            results,
            summary,
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
    'gap-fill-auto-scheduler': {
      title: 'Gap Fill Auto Scheduler',
      timeout: '1h',
      createTaskRunner: ({ taskInstance, fakeRequest }) => ({
        async run() {
          console.log('gap fill task running 1');
          const startTime = new Date();
          // Get the RulesClient using the fake request
          const rulesClient = await getRulesClientWithRequest(fakeRequest!);
          const context = rulesClient.context;
          const currentState = taskInstance.state as GapFillTaskState;
          const config = currentState.config || {
            name: 'gap-fill-auto-fill-name',
            amountOfGapsToProcessPerRun: 100,
            amountOfRetries: 3,
            excludeRuleIds: [],
            gapFillRange: 'now-7d',
            schedule: {
              interval: '1h',
            },
          };
          if (!context) {
            return {
              state: {
                config,
                lastRun: {
                  results: [],
                  status: 'error',
                  error: 'RulesClientContext not found',
                  date: new Date().toISOString(),
                },
              },
            };
          }

          try {
            console.log('context', rulesClient.context.spaceId);
            // Create the event logger function once
            console.log('gap fill task running 2');
            const logEvent = createGapFillAutoSchedulerEventLogger({
              eventLogger,
              context: rulesClient.context,
              taskInstance,

              startTime,
              config,
            });

            // 2. Get all rule IDs with gaps (up to config.amountOfGapsToProcessPerRun)
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
              logger.warn(`Invalid gapFillRange "${config.gapFillRange}", using default "now-7d"`);
              startDate = dateMath.parse('now-7d')!.toDate();
            }

            const { ruleIds } = await getRuleIdsWithGaps(rulesClient.context, {
              start: startDate.toISOString(),
              end: now.toISOString(),
              statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
              hasUnfilledIntervals: true,
            });

            console.log('gap fill task running 3');
            console.log(JSON.stringify(ruleIds, null, 2));
            // Filter out excluded rule IDs
            const filteredRuleIds = ruleIds.filter(
              (ruleId) => !config.excludeRuleIds.includes(ruleId)
            );

            if (!filteredRuleIds.length) {
              const endTime = new Date();

              // Log successful completion with no rules to process
              logEvent({
                status: 'success',
                summary: {
                  totalRules: 0,
                  successfulRules: 0,
                  failedRules: 0,
                  totalGapsProcessed: 0,
                },
                message: 'Gap fill execution completed - no rules with gaps found',
              });

              return {
                state: {
                  config,
                  lastRun: {
                    results: [],
                    status: 'success',
                    date: endTime.toISOString(),
                  },
                },
              };
            }

            // Get the actual rules to check their enabled status
            const { data: rules } = await rulesClient.find({
              options: {
                filter: filteredRuleIds.map((id) => `alert.id: ("alert:${id}")`).join(' OR '),
              },
            });

            // Filter to only enabled rules
            const enabledRuleIds = rules
              .filter((rule: RuleInfo) => rule.enabled)
              .map((rule: RuleInfo) => rule.id);

            if (!enabledRuleIds.length) {
              const endTime = new Date();
              const duration = endTime.getTime() - startTime.getTime();

              // Log successful completion with no enabled rules to process
              logEvent({
                status: 'success',
                summary: {
                  totalRules: 0,
                  successfulRules: 0,
                  failedRules: 0,
                  totalGapsProcessed: 0,
                },
                message: 'Gap fill execution completed - no enabled rules with gaps found',
              });

              return {
                state: {
                  config,
                  lastRun: {
                    results: [],
                    status: 'success',
                    date: endTime.toISOString(),
                  },
                },
              };
            }

            // 3. Fetch gaps for these enabled rule IDs
            const { data: gaps } = await findGaps({
              eventLogClient: await rulesClient.context.getEventLogClient(),
              logger,
              params: {
                ruleIds: enabledRuleIds.slice(0, config.amountOfGapsToProcessPerRun),
                ruleId: '', // required by schema, but unused when ruleIds is present, do it like that to not change other code
                start: startDate.toISOString(),
                end: now.toISOString(),
                page: 1,
                sortField: '@timestamp',
                sortOrder: 'asc',
                perPage: config.amountOfGapsToProcessPerRun,
                statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
              },
            });

            console.log('gap fill task running 4');

            const gapsByRuleId: Record<string, typeof gaps> = {};
            for (const gap of gaps) {
              const ruleId = gap.ruleId;
              if (!ruleId) continue;
              if (!gapsByRuleId[ruleId]) gapsByRuleId[ruleId] = [];
              gapsByRuleId[ruleId].push(gap);
            }

            const results: Array<{
              ruleId: string;
              processedGaps: number;
              status: 'success' | 'error';
              error?: string;
            }> = [];

            for (const ruleId of Object.keys(gapsByRuleId)) {
              const ruleGaps = gapsByRuleId[ruleId];

              try {
                const processedGapResult = await processGapsBatch(rulesClient.context, {
                  rule: { id: ruleId, name: 'ruleId' },
                  range: {
                    start: startDate.toISOString(),
                    end: now.toISOString(),
                  },
                  gapsBatch: ruleGaps,
                });

                results.push({
                  ruleId,
                  processedGaps: ruleGaps.length,
                  status: 'success',
                });
              } catch (error) {
                results.push({
                  ruleId,
                  processedGaps: ruleGaps.length,
                  status: 'error',
                  error: error.message,
                });

                logger.error(`Failed to schedule backfill for rule ${ruleId}: ${error.message}`);
              }
            }
            const overallStatus = results.some((r) => r.status === 'error') ? 'error' : 'success';
            const overallError = results.find((r) => r.status === 'error')?.error;

            const summary = {
              totalRules: results.length,
              successfulRules: results.filter((r) => r.status === 'success').length,
              failedRules: results.filter((r) => r.status === 'error').length,
              totalGapsProcessed: results.reduce((sum, r) => sum + r.processedGaps, 0),
            };

            // Update rules with lastGapAutoFill information
            const checkTime = new Date().toISOString();
            for (const result of results) {
              try {
                await partiallyUpdateRule(
                  rulesClient.context.unsecuredSavedObjectsClient,
                  result.ruleId,
                  {
                    lastGapAutoFill: {
                      checkTime,
                      status: result.status === 'success' ? 'success' : 'failure',
                      errorMessage: result.error,
                    },
                  }
                );
              } catch (updateError) {
                logger.warn(
                  `Failed to update lastGapAutoFill for rule ${result.ruleId}: ${updateError.message}`
                );
              }
            }

            // Log execution completion
            logEvent({
              status: overallStatus,
              results,
              summary,
              message: `Gap fill execution completed - ${summary.successfulRules}/${summary.totalRules} rules processed successfully`,
            });

            return {
              state: {
                config,
                lastRun: {
                  results,
                  status: overallStatus,
                  error: overallError,
                  date: new Date().toISOString(),
                },
              },
            };
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
            return {
              state: {
                config: currentState.config,
                lastRun: {
                  results: [],
                  status: 'error',
                  error: error.message,
                  date: endTime.toISOString(),
                },
              },
            };
          }
        },
      }),
    },
  });
}
