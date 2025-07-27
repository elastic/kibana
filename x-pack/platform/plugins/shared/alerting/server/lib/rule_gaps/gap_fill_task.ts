/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import type { AlertingPluginsStart } from '../../plugin';
import { getRuleIdsWithGaps } from '../../application/rule/methods/get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { findGaps } from './find_gaps';
import { scheduleBackfill } from '../../application/backfill/methods/schedule/schedule_backfill';
import type { RulesClientContext } from '../../rules_client/types';
import { gapStatus } from '../../../common/constants';
import { EVENT_LOG_ACTIONS } from '../../plugin';

interface GapFillTaskState {
  config: {
    name: string;
    amountOfGapsToProcessPerRun: number;
    amountOfRetries: number;
    excludeRuleIds: string[];
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

// Register the gap fill processor task
export function registerGapFillTask({
  taskManager,
  logger,
  coreStartServices,
  getRulesClientContext,
  eventLogger,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
  getRulesClientContext: (request: KibanaRequest) => Promise<RulesClientContext>;
  eventLogger: IEventLogger;
}) {
  taskManager.registerTaskDefinitions({
    'gap-fill-processor': {
      title: 'Gap Fill Processor',
      timeout: '1h',
      createTaskRunner: ({ taskInstance, fakeRequest }) => ({
        async run() {
          const executionId = uuidv4();
          const startTime = new Date();

          try {
            // Get the RulesClientContext using the fake request
            const context = (await getRulesClientContext(fakeRequest)).context;
            const currentState = taskInstance.state as GapFillTaskState;
            const config = currentState.config || {
              name: 'gap-fill-auto-fill-name',
              amountOfGapsToProcessPerRun: 100,
              amountOfRetries: 3,
              excludeRuleIds: [],
              schedule: {
                interval: '1h',
              },
            };

            // 2. Get all rule IDs with gaps (up to config.amountOfGapsToProcessPerRun)
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const { ruleIds } = await getRuleIdsWithGaps(context, {
              start: yesterday.toISOString(),
              end: now.toISOString(),
              statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
              hasUnfilledIntervals: true,
            });

            // Filter out excluded rule IDs
            const filteredRuleIds = ruleIds.filter(
              (ruleId) => !config.excludeRuleIds.includes(ruleId)
            );

            if (!filteredRuleIds.length) {
              const endTime = new Date();
              const duration = endTime.getTime() - startTime.getTime();

              // Log successful completion with no rules to process
              eventLogger.logEvent({
                event: { action: EVENT_LOG_ACTIONS.execute },
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
                      uuid: executionId,
                      status: 'success',
                      start: startTime.toISOString(),
                      end: endTime.toISOString(),
                      duration_ms: duration,
                      config,
                      results: [],
                      summary: {
                        totalRules: 0,
                        successfulRules: 0,
                        failedRules: 0,
                        totalGapsProcessed: 0,
                      },
                    },
                  },
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

            // 3. Fetch gaps for these rule IDs
            const { data: gaps } = await findGaps({
              eventLogClient: await context.getEventLogClient(),
              logger,
              params: {
                ruleIds: filteredRuleIds.slice(0, config.amountOfGapsToProcessPerRun),
                ruleId: '', // required by schema, but unused when ruleIds is present
                start: yesterday.toISOString(),
                end: now.toISOString(),
                page: 1,
                perPage: config.amountOfGapsToProcessPerRun,
                statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
              },
            });

            // 4. Group gaps by ruleId
            const gapsByRuleId: Record<string, typeof gaps> = {};
            for (const gap of gaps) {
              // @ts-expect-error: ruleId may be on internalFields or gap object depending on implementation
              const ruleId = gap.internalFields?.ruleId || gap.ruleId;
              if (!ruleId) continue;
              if (!gapsByRuleId[ruleId]) gapsByRuleId[ruleId] = [];
              gapsByRuleId[ruleId].push(gap);
            }

            // 5. For each ruleId, schedule a backfill for its gaps and track results
            const results: Array<{
              ruleId: string;
              processedGaps: number;
              status: 'success' | 'error';
              error?: string;
            }> = [];

            for (const ruleId of Object.keys(gapsByRuleId)) {
              const ruleGaps = gapsByRuleId[ruleId];
              try {
                await scheduleBackfill(
                  context,
                  [
                    {
                      ruleId,
                      ranges: ruleGaps.map((gap) => ({
                        start: gap.range.gte.toISOString(),
                        end: gap.range.lte.toISOString(),
                      })),
                    },
                  ],
                  ruleGaps
                );

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

            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();
            const overallStatus = results.some((r) => r.status === 'error') ? 'error' : 'success';
            const overallError = results.find((r) => r.status === 'error')?.error;

            const summary = {
              totalRules: results.length,
              successfulRules: results.filter((r) => r.status === 'success').length,
              failedRules: results.filter((r) => r.status === 'error').length,
              totalGapsProcessed: results.reduce((sum, r) => sum + r.processedGaps, 0),
            };

            // Log execution completion
            eventLogger.logEvent({
              event: { action: EVENT_LOG_ACTIONS.execute },
              kibana: {
                // Add space context
                space_ids: [context.spaceId],
                // Add task context
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
                    namespace: context.namespace || 'default',
                  },
                ],
                auto_gap_fill: {
                  execution: {
                    uuid: executionId,
                    status: overallStatus,
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    duration_ms: duration,
                    config,
                    results,
                    summary,
                  },
                },
              },
              message: `Gap fill execution completed - ${summary.successfulRules}/${summary.totalRules} rules processed successfully`,
            });

            return {
              state: {
                config,
                lastRun: {
                  results,
                  status: overallStatus,
                  error: overallError,
                  date: endTime.toISOString(),
                },
              },
            };
          } catch (error) {
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();

            logger.error(`gap-fill-processor error: ${error && error.message}`);

            // Log execution error
            eventLogger.logEvent({
              event: { action: EVENT_LOG_ACTIONS.execute },
              kibana: {
                // Add space context
                space_ids: [context.spaceId],
                // Add task context
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
                    namespace: context.namespace || 'default',
                  },
                ],
                auto_gap_fill: {
                  execution: {
                    uuid: executionId,
                    status: 'error',
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                    duration_ms: duration,
                    config: taskInstance.state?.config || {
                      name: 'gap-fill-auto-fill-name',
                      amountOfGapsToProcessPerRun: 100,
                      amountOfRetries: 3,
                      excludeRuleIds: [],
                      schedule: { interval: '1h' },
                    },
                    results: [],
                    summary: {
                      totalRules: 0,
                      successfulRules: 0,
                      failedRules: 0,
                      totalGapsProcessed: 0,
                    },
                  },
                },
              },
              message: `Gap fill execution failed - ${error.message}`,
            });

            const currentState = taskInstance.state as GapFillTaskState;
            return {
              state: {
                config: currentState.config || {
                  name: 'gap-fill-auto-fill-name',
                  amountOfGapsToProcessPerRun: 100,
                  amountOfRetries: 3,
                  excludeRuleIds: [],
                  schedule: {
                    interval: '1h',
                  },
                },
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
