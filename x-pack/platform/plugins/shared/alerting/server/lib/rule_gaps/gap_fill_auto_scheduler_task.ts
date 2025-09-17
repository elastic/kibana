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
// POC: unused imports removed
import type { RulesClient } from '../../rules_client/rules_client';
// POC: unused imports removed
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

/*
const runTask = async ({ taskInstance, fakeRequest }) => {
  let count = 0;
  // write console log each second indefinitely
  // maky it async so it can run in the background and we are wariting for untill it reach count 10000
  interval = setInterval(() => {
    console.log('----- timeout -------', count);
    count++;
  }, 1000);

  const startTime = new Date();
  // Get the RulesClient using the fake request
  const rulesClient = await getRulesClientWithRequest(fakeRequest!);
  const context = rulesClient.context;
  const { configId } = (taskInstance.params as { configId?: string; spaceId?: string }) || {};
  // Load scheduler SO for config
  const soClient = rulesClient.context.unsecuredSavedObjectsClient;
  console.log('----- configId -------');
  console.log(configId);
  const schedulerSo = configId ? await soClient.get('gap_fill_auto_scheduler', configId) : null;

  console.log('----- scheduler so -------');
  console.log(JSON.stringify(schedulerSo, null, 2));
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
  const soAttrs: SchedulerSoAttributes = (schedulerSo?.attributes as SchedulerSoAttributes) || {};
  const config = {
    name: soAttrs.name ?? 'gap-fill-auto-fill-name',
    maxAmountOfGapsToProcessPerRun: soAttrs.maxAmountOfGapsToProcessPerRun ?? 10000,
    maxAmountOfRulesToProcessPerRun: soAttrs.maxAmountOfRulesToProcessPerRun ?? 100,
    amountOfRetries: soAttrs.amountOfRetries ?? 3,
    rulesFilter: soAttrs.rulesFilter ?? '',
    gapFillRange: soAttrs.gapFillRange ?? 'now-7d',
    schedule: soAttrs.schedule ?? { interval: '1h' },
  };

  console.log('----- config -------');
  console.log(JSON.stringify(config, null, 2));
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
      logger.warn(`Invalid gapFillRange "${config.gapFillRange}", using default "now-7d"`);
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
      return earlySuccessReturn('Gap fill execution completed - no rules with gaps found');
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
            filter: `alert.attributes.enabled:true AND ${ruleIds
              .map((id) => `alert.id: ("alert:${id}")`)
              .join(' OR ')}`,
          },
        });
        rules = rulesFromFindRules;
      }
    );

    // Filter to only enabled rules
    const enabledRuleIds = rules.map((rule: RuleInfo) => rule.id);

    if (!enabledRuleIds.length) {
      return earlySuccessReturn('Gap fill execution completed - no enabled rules with gaps found');
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
        const { results: resultsFromProcessGapsBatchFromRules } = await processGapsBatchFromRules(
          rulesClient.context,
          {
            gaps,
            range: {
              start: startDate.toISOString(),
              end: now.toISOString(),
            },
          }
        );
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

    // Step 5: Update rule fields with lastGapAutoFill information
    // using bulk update for better performance

    await withSpan(
      {
        name: 'bulkPartiallyUpdateRules',
        type: 'rule run',
        labels: { plugin: 'alerting' },
      },
      async () => {
        const checkTime = new Date().toISOString();
        const rulesToUpdate = results.map((result) => ({
          id: result.ruleId,
          attributes: {
            lastGapAutoFill: {
              checkTime,
              status: result.status === 'success' ? 'success' : 'error',
              errorMessage: result.error,
            },
          },
        }));

        try {
          await bulkPartiallyUpdateRules(
            rulesClient.context.unsecuredSavedObjectsClient,
            rulesToUpdate
          );
        } catch (updateError) {
          logger.warn(
            `Failed to bulk update lastGapAutoFill for ${results.length} rules: ${updateError.message}`
          );
        }
      }
    );

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
};
*/

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

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        return {
          async cancel() {
            wasCancelled = true;
            logger.info(
              `[gap-fill-auto-scheduler-task][${taskInstance.id}] cancel() called (timeout or shutdown)`
            );
          },
          async run() {
            // return await runTask({ taskInstance, fakeRequest });
            logger.info(`[gap-fill-auto-scheduler-task][${taskInstance.id}] run() called`);

            const start = new Date();
            const signal = abortController?.signal;

            // POC params to tune behavior without filling actual gaps
            const pocTotal = 1500;
            const pocPerRunLimit = 500;
            const pocDelayMsPerItem = 50;

            const prevState = (taskInstance.state as Record<string, unknown>) || {};
            const total: number = Number(prevState.total ?? pocTotal);
            let processed: number = Number(prevState.processed ?? 0);
            const alreadyDone = processed >= total;

            logger.info(
              `[` +
                `gap-fill-auto-scheduler-task` +
                `][${
                  taskInstance.id
                }] start run at ${start.toISOString()} | processed=${processed}/${total} | limit=${pocPerRunLimit} | delay=${pocDelayMsPerItem}ms`
            );

            if (alreadyDone) {
              logger.info(
                `[gap-fill-auto-scheduler-task][${taskInstance.id}] nothing to do, already completed`
              );
              return {
                state: {
                  ...prevState,
                  total,
                  processed,
                  runs: Number((prevState as any).runs || 0) + 1,
                  lastRun: {
                    start: start.toISOString(),
                    end: new Date().toISOString(),
                    status: 'noop',
                  },
                },
              };
            }

            let processedThisRun = 0;
            const maxThisRun = Math.min(pocPerRunLimit, total - processed);

            while (processedThisRun < maxThisRun) {
              if (wasCancelled || signal?.aborted) {
                logger.debug(
                  `[` +
                    `gap-fill-auto-scheduler-task` +
                    `][${taskInstance.id}] abort detected after processed ${processedThisRun}/${maxThisRun} in this run`
                );
                break;
              }

              // simulate async unit of work
              await sleep(pocDelayMsPerItem);
              processed += 1;
              processedThisRun += 1;
            }

            const done = processed >= total;
            const end = new Date();
            const wasAborted = wasCancelled || signal?.aborted;

            if (wasCancelled) {
              logger.info(
                `[` +
                  `gap-fill-auto-scheduler-task` +
                  `][${taskInstance.id}] was cancelled, sleeping for 30 seconds`
              );
              await sleep(30000);
            }

            logger.info(
              `[` +
                `gap-fill-auto-scheduler-task` +
                `][${
                  taskInstance.id
                }] end run at ${end.toISOString()} | processedThisRun=${processedThisRun} | totalProcessed=${processed}/${total} | aborted=${Boolean(
                  wasAborted
                )} | timeout=1m`
            );

            // Important: If the run timed out (cancel invoked), Task Manager marks execution as expired and
            // will NOT persist the returned state for recurring tasks. We mitigated by mid-run bulkUpdateState above.
            const prevStateObj = prevState ?? {};
            const nextState = {
              ...prevStateObj,
              total,
              processed,
              runs: Number((prevStateObj as { runs?: number }).runs || 0) + 1,
              lastRun: {
                start: start.toISOString(),
                end: end.toISOString(),
                status: wasAborted ? 'aborted' : done ? 'completed' : 'partial',
                processedThisRun,
              },
            } as Record<string, unknown>;

            return {
              state: nextState,
            };
          },
        };
      },
    },
  });
}
