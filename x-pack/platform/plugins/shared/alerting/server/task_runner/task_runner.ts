/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { omit } from 'lodash';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  createTaskRunError,
  TaskErrorSource,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/server';
import { getErrorSource, isUserError } from '@kbn/task-manager-plugin/server/task_running';
import { ActionScheduler, type RunResult } from './action_scheduler';
import {
  RuleRunnerErrorStackTraceLog,
  RuleTaskInstance,
  RuleTaskRunResult,
  RuleTaskStateAndMetrics,
  RunRuleParams,
  TaskRunnerContext,
} from './types';
import { getExecutorServices } from './get_executor_services';
import { ElasticsearchError, getNextRun, isRuleSnoozed, ruleExecutionStatusToRaw } from '../lib';
import {
  IntervalSchedule,
  RawRuleExecutionStatus,
  RawRuleLastRun,
  RawRuleMonitoring,
  RuleExecutionStatus,
  RuleExecutionStatusErrorReasons,
  RuleTaskState,
  RuleTypeRegistry,
} from '../types';
import { asErr, asOk, isErr, isOk, map, resolveErr, Result } from '../lib/result_type';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from '../lib/is_alerting_error';
import { partiallyUpdateRuleWithEs, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import {
  AlertInstanceContext,
  AlertInstanceState,
  parseDuration,
  RawAlertInstance,
  RuleAlertData,
  RuleLastRunOutcomeOrderMap,
  RuleTypeParams,
  RuleTypeState,
} from '../../common';
import { NormalizedRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import { getEsErrorMessage } from '../lib/errors';
import { IN_MEMORY_METRICS, InMemoryMetrics } from '../monitoring';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { getDecryptedRule, validateRuleAndCreateFakeRequest } from './rule_loader';
import { TaskRunnerTimer, TaskRunnerTimerSpan } from './task_runner_timer';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { lastRunToRaw } from '../lib/last_run_status';
import { RuleRunningHandler } from './rule_running_handler';
import { RuleResultService } from '../monitoring/rule_result_service';
import { RuleTypeRunner } from './rule_type_runner';
import { initializeAlertsClient } from '../alerts_client';
import {
  createTaskRunnerLogger,
  withAlertingSpan,
  processRunResults,
  clearExpiredSnoozes,
} from './lib';
import { isClusterBlockError } from '../lib/error_with_type';

const FALLBACK_RETRY_INTERVAL = '5m';
const CONNECTIVITY_RETRY_INTERVAL = '5m';
const CLUSTER_BLOCKED_EXCEPTION_RETRY_INTERVAL = '1m';

interface TaskRunnerConstructorParams<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  AlertState extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  context: TaskRunnerContext;
  inMemoryMetrics: InMemoryMetrics;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
  taskInstance: ConcreteTaskInstance;
}

export class TaskRunner<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  AlertState extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: RuleTaskInstance;
  private ruleConsumer: string | null;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
  private readonly executionId: string;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly inMemoryMetrics: InMemoryMetrics;
  private readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  private timer: TaskRunnerTimer;
  private alertingEventLogger: AlertingEventLogger;
  private usageCounter?: UsageCounter;
  private searchAbortController: AbortController;
  private cancelled: boolean;
  private stackTraceLog: RuleRunnerErrorStackTraceLog | null;
  private ruleMonitoring: RuleMonitoringService;
  private ruleRunning: RuleRunningHandler;
  private ruleResult: RuleResultService;
  private ruleTypeRunner: RuleTypeRunner<
    Params,
    ExtractedParams,
    RuleState,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
  private runDate = new Date();

  constructor({
    context,
    inMemoryMetrics,
    internalSavedObjectsRepository,
    ruleType,
    taskInstance,
  }: TaskRunnerConstructorParams<
    Params,
    ExtractedParams,
    RuleState,
    AlertState,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >) {
    this.context = context;
    const loggerId = ruleType.id.startsWith('.') ? ruleType.id.substring(1) : ruleType.id;
    this.logger = context.logger.get(loggerId);
    this.usageCounter = context.usageCounter;
    this.ruleType = ruleType;
    this.ruleConsumer = null;
    this.taskInstance = taskInstanceToAlertTaskInstance(taskInstance);
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.searchAbortController = new AbortController();
    this.cancelled = false;
    this.executionId = uuidv4();
    this.inMemoryMetrics = inMemoryMetrics;
    this.internalSavedObjectsRepository = internalSavedObjectsRepository;
    this.timer = new TaskRunnerTimer({ logger: this.logger });
    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
    this.stackTraceLog = null;
    this.ruleMonitoring = new RuleMonitoringService();
    this.ruleRunning = new RuleRunningHandler(
      this.internalSavedObjectsRepository,
      this.logger,
      loggerId
    );
    this.ruleTypeRunner = new RuleTypeRunner<
      Params,
      ExtractedParams,
      RuleState,
      AlertState,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >({
      context: this.context,
      logger: this.logger,
      task: this.taskInstance,
      timer: this.timer,
    });
    this.ruleResult = new RuleResultService();
  }

  private async updateRuleSavedObjectPostRun(
    ruleId: string,
    attributes: {
      executionStatus?: RawRuleExecutionStatus;
      monitoring?: RawRuleMonitoring;
      nextRun?: string | null;
      lastRun?: RawRuleLastRun | null;
    }
  ) {
    const client = this.context.elasticsearch.client.asInternalUser;
    try {
      // Future engineer -> Here we are just checking if we need to wait for
      // the update of the attribute `running` in the rule's saved object
      // and we are swallowing the error because we still want to move forward
      // with the update of our rule since we are putting back the running attribute
      // back to false
      await this.ruleRunning.waitFor();
      // eslint-disable-next-line no-empty
    } catch {}
    try {
      await partiallyUpdateRuleWithEs(
        client,
        ruleId,
        { ...attributes, running: false },
        {
          ignore404: true,
          refresh: false,
        }
      );
    } catch (err) {
      this.logger.error(`error updating rule for ${this.ruleType.id}:${ruleId} ${err.message}`);
    }
  }

  private shouldLogAndScheduleActionsForAlerts() {
    // if execution hasn't been cancelled, return true
    if (!this.cancelled) {
      return true;
    }

    // if execution has been cancelled, return true if EITHER alerting config or rule type indicate to proceed with scheduling actions
    return !this.context.cancelAlertsOnRuleTimeout || !this.ruleType.cancelAlertsOnRuleTimeout;
  }

  // Usage counter for telemetry
  // This keeps track of how many times action executions were skipped after rule
  // execution completed successfully after the execution timeout
  // This can occur when rule executors do not short circuit execution in response
  // to timeout
  private countUsageOfActionExecutionAfterRuleCancellation() {
    if (this.cancelled && this.usageCounter) {
      if (this.context.cancelAlertsOnRuleTimeout && this.ruleType.cancelAlertsOnRuleTimeout) {
        // Increment usage counter for skipped actions
        this.usageCounter.incrementCounter({
          counterName: `alertsSkippedDueToRuleExecutionTimeout_${this.ruleType.id}`,
          incrementBy: 1,
        });
      }
    }
  }

  private async runRule({
    fakeRequest,
    rule,
    apiKey,
    validatedParams: params,
  }: RunRuleParams<Params>): Promise<RuleTaskStateAndMetrics> {
    if (apm.currentTransaction) {
      apm.currentTransaction.name = `Execute Alerting Rule: "${rule.name}"`;
      apm.currentTransaction.addLabels({
        alerting_rule_consumer: rule.consumer,
        alerting_rule_name: rule.name,
        alerting_rule_tags: rule.tags.join(', '),
        alerting_rule_type_id: rule.alertTypeId,
        alerting_rule_params: JSON.stringify(rule.params),
      });
    }

    const {
      params: { alertId: ruleId, spaceId },
      state: { previousStartedAt },
    } = this.taskInstance;

    const { queryDelaySettings, flappingSettings: spaceFlappingSettings } =
      await this.context.rulesSettingsService.getSettings(fakeRequest, spaceId);
    const ruleRunMetricsStore = new RuleRunMetricsStore();
    const ruleLabel = `${this.ruleType.id}:${ruleId}: '${rule.name}'`;

    const ruleFlappingSettings = rule.flapping
      ? {
          enabled: true,
          ...rule.flapping,
        }
      : null;

    const flappingSettings = spaceFlappingSettings.enabled
      ? ruleFlappingSettings || spaceFlappingSettings
      : spaceFlappingSettings;

    const ruleTypeRunnerContext = {
      alertingEventLogger: this.alertingEventLogger,
      flappingSettings,
      maintenanceWindowsService: this.context.maintenanceWindowsService,
      namespace: this.context.spaceIdToNamespace(spaceId),
      queryDelaySec: queryDelaySettings.delay,
      request: fakeRequest,
      ruleId,
      ruleLogPrefix: ruleLabel,
      ruleRunMetricsStore,
      spaceId,
      isServerless: this.context.isServerless,
    };
    const alertsClient = await withAlertingSpan('alerting:initialize-alerts-client', () =>
      initializeAlertsClient<
        Params,
        AlertData,
        AlertState,
        Context,
        ActionGroupIds,
        RecoveryActionGroupId
      >({
        alertsService: this.context.alertsService,
        context: ruleTypeRunnerContext,
        executionId: this.executionId,
        logger: this.logger,
        maxAlerts: this.context.maxAlerts,
        rule: {
          id: rule.id,
          name: rule.name,
          tags: rule.tags,
          consumer: rule.consumer,
          revision: rule.revision,
          alertDelay: rule.alertDelay,
          params: rule.params,
        },
        ruleType: this.ruleType as UntypedNormalizedRuleType,
        startedAt: this.taskInstance.startedAt,
        taskInstance: this.taskInstance,
      })
    );
    const executorServices = getExecutorServices({
      context: this.context,
      fakeRequest,
      abortController: this.searchAbortController,
      logger: this.logger,
      ruleMonitoringService: this.ruleMonitoring,
      ruleResultService: this.ruleResult,
      ruleData: {
        name: rule.name,
        alertTypeId: rule.alertTypeId,
        id: rule.id,
        spaceId,
      },
      ruleTaskTimeout: this.ruleType.ruleTaskTimeout,
    });

    const {
      state: updatedRuleTypeState,
      error,
      stackTrace,
    } = await this.ruleTypeRunner.run({
      context: ruleTypeRunnerContext,
      alertsClient,
      executionId: this.executionId,
      executorServices,
      rule,
      ruleType: this.ruleType,
      startedAt: this.taskInstance.startedAt!,
      state: this.taskInstance.state,
      validatedParams: params,
    });

    // if there was an error, save the stack trace and throw
    if (error) {
      this.stackTraceLog = stackTrace ?? null;
      throw error;
    }

    const actionScheduler = new ActionScheduler({
      rule,
      ruleType: this.ruleType,
      logger: this.logger,
      taskRunnerContext: this.context,
      taskInstance: this.taskInstance,
      ruleRunMetricsStore,
      apiKey,
      ruleConsumer: this.ruleConsumer!,
      executionId: this.executionId,
      ruleLabel,
      previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
      alertingEventLogger: this.alertingEventLogger,
      actionsClient: await this.context.actionsPlugin.getActionsClientWithRequest(fakeRequest),
      alertsClient,
    });

    let actionSchedulerResult: RunResult = { throttledSummaryActions: {} };

    await withAlertingSpan('alerting:schedule-actions', () =>
      this.timer.runWithTimer(TaskRunnerTimerSpan.TriggerActions, async () => {
        if (isRuleSnoozed(rule)) {
          this.logger.debug(`no scheduling of actions for rule ${ruleLabel}: rule is snoozed.`);
        } else if (!this.shouldLogAndScheduleActionsForAlerts()) {
          this.logger.debug(
            `no scheduling of actions for rule ${ruleLabel}: rule execution has been cancelled.`
          );
          this.countUsageOfActionExecutionAfterRuleCancellation();
        } else {
          actionSchedulerResult = await actionScheduler.run({
            activeCurrentAlerts: alertsClient.getProcessedAlerts('activeCurrent'),
            recoveredCurrentAlerts: alertsClient.getProcessedAlerts('recoveredCurrent'),
          });
        }
      })
    );

    let alertsToReturn: Record<string, RawAlertInstance> = {};
    let recoveredAlertsToReturn: Record<string, RawAlertInstance> = {};

    // Only serialize alerts into task state if we're auto-recovering, otherwise
    // we don't need to keep this information around.
    if (this.ruleType.autoRecoverAlerts) {
      const { alertsToReturn: alerts, recoveredAlertsToReturn: recovered } =
        alertsClient.getAlertsToSerialize();
      alertsToReturn = alerts;
      recoveredAlertsToReturn = recovered;
    }

    return {
      metrics: ruleRunMetricsStore.getMetrics(),
      alertTypeState: updatedRuleTypeState || undefined,
      alertInstances: alertsToReturn,
      alertRecoveredInstances: recoveredAlertsToReturn,
      summaryActions: actionSchedulerResult.throttledSummaryActions,
    };
  }

  /**
   * Before we actually run the rule:
   * - start the RunningHandler
   * - initialize the event logger
   * - if rule data not loaded, load it
   * - set the current APM transaction info
   * - validate that rule type is enabled and params are valid
   * - initialize monitoring data
   * - clear expired snoozes
   */
  private async prepareToRun(): Promise<RunRuleParams<Params>> {
    return await this.timer.runWithTimer(TaskRunnerTimerSpan.PrepareRule, async () => {
      const {
        params: { alertId: ruleId, spaceId, consumer },
        startedAt,
      } = this.taskInstance;

      // Initially use consumer as stored inside the task instance
      // This allows us to populate a consumer value for event log
      // `execute-start` events (which are indexed before the rule SO is read)
      // and in the event of decryption errors (where we cannot read the rule SO)
      // Because "consumer" is set when a rule is created, this value should be static
      // for the life of a rule but there may be edge cases where migrations cause
      // the consumer values to become out of sync.
      if (consumer) {
        this.ruleConsumer = consumer;
      }

      // Start the event logger so that something is logged in the
      // event that rule SO decryption fails.
      const namespace = this.context.spaceIdToNamespace(spaceId);
      this.alertingEventLogger.initialize({
        context: {
          savedObjectId: ruleId,
          savedObjectType: RULE_SAVED_OBJECT_TYPE,
          spaceId,
          executionId: this.executionId,
          taskScheduledAt: this.taskInstance.scheduledAt,
          ...(namespace ? { namespace } : {}),
        },
        runDate: this.runDate,
        ruleData: {
          id: ruleId,
          type: this.ruleType as UntypedNormalizedRuleType,
          consumer: this.ruleConsumer!,
        },
      });

      if (apm.currentTransaction) {
        apm.currentTransaction.name = `Execute Alerting Rule`;
        apm.currentTransaction.addLabels({
          alerting_rule_space_id: spaceId,
          alerting_rule_id: ruleId,
          plugins: 'alerting',
        });
      }

      this.ruleRunning.start(ruleId, this.context.spaceIdToNamespace(spaceId));

      this.logger.debug(
        `executing rule ${this.ruleType.id}:${ruleId} at ${this.runDate.toISOString()}`
      );

      if (startedAt) {
        // Capture how long it took for the rule to start running after being claimed
        this.timer.setDuration(TaskRunnerTimerSpan.StartTaskRun, startedAt);
      }

      const ruleData = await withAlertingSpan('alerting:get-decrypted-rule', () =>
        getDecryptedRule(this.context, ruleId, spaceId)
      );

      const runRuleParams = validateRuleAndCreateFakeRequest({
        ruleData,
        paramValidator: this.ruleType.validate.params,
        ruleId,
        spaceId,
        logger: this.logger,
        context: this.context,
        ruleTypeRegistry: this.ruleTypeRegistry,
      });

      // Update the consumer
      this.ruleConsumer = runRuleParams.rule.consumer;

      // Update the rule data in event logger
      this.alertingEventLogger.addOrUpdateRuleData({
        name: runRuleParams.rule.name,
        consumer: runRuleParams.rule.consumer,
        revision: runRuleParams.rule.revision,
      });

      // Set rule monitoring data
      this.ruleMonitoring.setMonitoring(runRuleParams.rule.monitoring);

      // Clear gap range that was persisted in the rule SO
      if (this.ruleMonitoring.getMonitoring()?.run?.last_run?.metrics?.gap_range) {
        this.ruleMonitoring.getLastRunMetricsSetters().setLastRunMetricsGapRange(null);
      }
      (async () => {
        try {
          await clearExpiredSnoozes({
            esClient: this.context.elasticsearch.client.asInternalUser,
            logger: this.logger,
            rule: runRuleParams.rule,
            version: runRuleParams.version,
          });
        } catch (e) {
          // Most likely a 409 conflict error, which is ok, we'll try again at the next rule run
          this.logger.debug(`Failed to clear expired snoozes: ${e.message}`);
        }
      })().catch(() => {});

      return runRuleParams;
    });
  }

  private async processRunResults({
    schedule,
    stateWithMetrics,
  }: {
    schedule: Result<IntervalSchedule, Error>;
    stateWithMetrics: Result<RuleTaskStateAndMetrics, Error>;
  }) {
    const { executionStatus: execStatus, executionMetrics: execMetrics } =
      await this.timer.runWithTimer(TaskRunnerTimerSpan.ProcessRuleRun, async () => {
        const {
          params: { alertId: ruleId },
          startedAt,
          schedule: taskSchedule,
        } = this.taskInstance;

        let nextRun: string | null = null;
        if (isOk(schedule)) {
          nextRun = getNextRun({ startDate: startedAt, interval: schedule.value.interval });
        } else if (taskSchedule) {
          nextRun = getNextRun({ startDate: startedAt, interval: taskSchedule.interval });
        }

        const { executionStatus, executionMetrics, lastRun, outcome } = processRunResults({
          logger: this.logger,
          logPrefix: `${this.ruleType.id}:${ruleId}`,
          result: this.ruleResult,
          runDate: this.runDate,
          runResultWithMetrics: stateWithMetrics,
        });

        if (apm.currentTransaction) {
          apm.currentTransaction.setOutcome(outcome);
        }

        // set start and duration based on event log
        const { start, duration } = this.alertingEventLogger.getStartAndDuration();
        if (null != start) {
          executionStatus.lastExecutionDate = start;
        }
        if (null != duration) {
          executionStatus.lastDuration = nanosToMillis(duration);
        }

        // if executionStatus indicates an error, fill in fields in
        this.ruleMonitoring.addHistory({
          duration: executionStatus.lastDuration,
          hasError: executionStatus.error != null,
          runDate: this.runDate,
        });

        const gap = this.ruleMonitoring.getMonitoring()?.run?.last_run?.metrics?.gap_range;
        if (gap) {
          this.alertingEventLogger.reportGap({
            gap,
          });
        }

        if (!this.cancelled) {
          this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_EXECUTIONS);
          if (outcome === 'failure') {
            this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_FAILURES);
          }
          if (this.logger.isLevelEnabled('debug')) {
            this.logger.debug(
              `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - ${JSON.stringify(
                executionStatus
              )} - ${JSON.stringify(lastRun)}`
            );
          }

          await this.updateRuleSavedObjectPostRun(ruleId, {
            executionStatus: ruleExecutionStatusToRaw(executionStatus),
            nextRun,
            lastRun: lastRunToRaw(lastRun),
            monitoring: this.ruleMonitoring.getMonitoring() as RawRuleMonitoring,
          });
        }

        if (startedAt) {
          // Capture how long it took for the rule to run after being claimed
          this.timer.setDuration(TaskRunnerTimerSpan.TotalRunDuration, startedAt);
        }

        return { executionStatus, executionMetrics };
      });

    this.alertingEventLogger.done({
      status: execStatus,
      metrics: execMetrics,
      timings: this.timer.toJson(),
    });
  }

  async run(): Promise<RuleTaskRunResult> {
    this.runDate = new Date();
    const {
      params: { alertId: ruleId, spaceId },
      startedAt,
      state: originalState,
      schedule: taskSchedule,
    } = this.taskInstance;

    this.logger = createTaskRunnerLogger({ logger: this.logger, tags: [ruleId, this.ruleType.id] });

    let stateWithMetrics: Result<RuleTaskStateAndMetrics, Error>;
    let schedule: Result<IntervalSchedule, Error>;
    try {
      const validatedRuleData = await this.prepareToRun();

      stateWithMetrics = asOk(
        await withAlertingSpan('alerting:run', () => this.runRule(validatedRuleData))
      );

      schedule = asOk(validatedRuleData.rule.schedule);
    } catch (err) {
      stateWithMetrics = asErr(err);
      schedule = asErr(err);
    }

    await withAlertingSpan('alerting:process-run-results-and-update-rule', () =>
      this.processRunResults({ schedule, stateWithMetrics })
    );

    const transformRunStateToTaskState = (
      runStateWithMetrics: RuleTaskStateAndMetrics
    ): RuleTaskState => {
      return {
        ...omit(runStateWithMetrics, ['metrics']),
        previousStartedAt: startedAt?.toISOString(),
      };
    };

    const getTaskRunError = (state: Result<RuleTaskStateAndMetrics, Error>) => {
      if (isErr(state)) {
        return {
          taskRunError: createTaskRunError(state.error, getErrorSource(state.error)),
        };
      }

      const { errors: errorsFromLastRun } = this.ruleResult.getLastRunResults();
      if (errorsFromLastRun.length > 0) {
        const isLastRunUserError = !errorsFromLastRun.some(
          (lastRunError) => !lastRunError.userError
        );
        const errorSource = isLastRunUserError ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK;
        const lasRunErrorMessages = errorsFromLastRun
          .map((lastRunError) => lastRunError.message)
          .join(',');
        const errorMessage = `Executing Rule ${this.ruleType.id}:${ruleId} has resulted in the following error(s): ${lasRunErrorMessages}`;
        this.logger.error(errorMessage, {
          tags: [this.ruleType.id, ruleId, 'rule-run-failed', `${errorSource}-error`],
        });
        return {
          taskRunError: createTaskRunError(new Error(errorMessage), errorSource),
        };
      }

      return {};
    };

    return {
      state: map<RuleTaskStateAndMetrics, ElasticsearchError, RuleTaskState>(
        stateWithMetrics,
        (ruleRunStateWithMetrics: RuleTaskStateAndMetrics) =>
          transformRunStateToTaskState(ruleRunStateWithMetrics),
        (err: ElasticsearchError) => {
          const errorSource = isUserError(err) ? TaskErrorSource.USER : TaskErrorSource.FRAMEWORK;
          const errorSourceTag = `${errorSource}-error`;

          if (isAlertSavedObjectNotFoundError(err, ruleId) || isClusterBlockError(err)) {
            const message = `Executing Rule ${spaceId}:${
              this.ruleType.id
            }:${ruleId} has resulted in Error: ${getEsErrorMessage(err)}`;
            this.logger.debug(message, {
              tags: [this.ruleType.id, ruleId, 'rule-run-failed', errorSourceTag],
            });
          } else {
            const error = this.stackTraceLog ? this.stackTraceLog.message : err;
            const stack = this.stackTraceLog ? this.stackTraceLog.stackTrace : err.stack;
            const message = `Executing Rule ${spaceId}:${
              this.ruleType.id
            }:${ruleId} has resulted in Error: ${getEsErrorMessage(error)} - ${stack ?? ''}`;
            this.logger.error(message, {
              tags: [this.ruleType.id, ruleId, 'rule-run-failed', errorSourceTag],
              error: { stack_trace: stack },
            });
          }
          return originalState;
        }
      ),
      schedule: resolveErr<IntervalSchedule | undefined, Error>(schedule, (error) => {
        if (isAlertSavedObjectNotFoundError(error, ruleId)) {
          const spaceMessage = spaceId ? `in the "${spaceId}" space ` : '';
          this.logger.warn(
            `Unable to execute rule "${ruleId}" ${spaceMessage}because ${error.message} - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
          );
          throwUnrecoverableError(error);
        }

        let retryInterval = taskSchedule?.interval ?? FALLBACK_RETRY_INTERVAL;

        // Set retry interval smaller for ES connectivity errors
        if (isEsUnavailableError(error, ruleId)) {
          retryInterval =
            parseDuration(retryInterval) > parseDuration(CONNECTIVITY_RETRY_INTERVAL)
              ? CONNECTIVITY_RETRY_INTERVAL
              : retryInterval;
        }

        if (isClusterBlockError(error)) {
          retryInterval = CLUSTER_BLOCKED_EXCEPTION_RETRY_INTERVAL;
        }

        return { interval: retryInterval };
      }),
      monitoring: this.ruleMonitoring.getMonitoring(),
      ...getTaskRunError(stateWithMetrics),
    };
  }

  async cancel(): Promise<void> {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;
    this.ruleTypeRunner.cancelRun();

    // Write event log entry
    const {
      params: { alertId: ruleId, consumer },
      schedule: taskSchedule,
      startedAt,
    } = this.taskInstance;

    if (consumer && !this.ruleConsumer) {
      this.ruleConsumer = consumer;
    }

    this.logger.debug(
      `Cancelling rule type ${this.ruleType.id} with id ${ruleId} - execution exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`
    );

    this.logger.debug(
      `Aborting any in-progress ES searches for rule type ${this.ruleType.id} with id ${ruleId}`
    );
    this.searchAbortController.abort();

    this.alertingEventLogger.logTimeout();

    this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_TIMEOUTS);

    let nextRun: string | null = null;
    if (taskSchedule) {
      nextRun = getNextRun({ startDate: startedAt, interval: taskSchedule.interval });
    }

    const outcomeMsg = [
      `${this.ruleType.id}:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`,
    ];
    const date = new Date();
    // Update the rule saved object with execution status
    const executionStatus: RuleExecutionStatus = {
      lastExecutionDate: date,
      status: 'error',
      error: {
        reason: RuleExecutionStatusErrorReasons.Timeout,
        message: outcomeMsg.join(' '),
      },
    };
    this.logger.debug(
      `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - execution error due to timeout`
    );
    const outcome = 'failed';
    await this.updateRuleSavedObjectPostRun(ruleId, {
      executionStatus: ruleExecutionStatusToRaw(executionStatus),
      lastRun: {
        outcome,
        outcomeOrder: RuleLastRunOutcomeOrderMap[outcome],
        warning: RuleExecutionStatusErrorReasons.Timeout,
        outcomeMsg,
        alertsCount: {},
      },
      monitoring: this.ruleMonitoring.getMonitoring() as RawRuleMonitoring,
      nextRun: nextRun && new Date(nextRun).getTime() > date.getTime() ? nextRun : null,
    });
  }
}
