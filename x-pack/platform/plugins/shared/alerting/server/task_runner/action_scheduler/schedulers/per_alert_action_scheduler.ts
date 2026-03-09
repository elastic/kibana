/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import type { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import type { RuleAction, RuleTypeParams } from '@kbn/alerting-types';
import { RuleNotifyWhen } from '@kbn/alerting-types';
import { evaluateSnoozeConditions } from '../../../lib/snooze';
import type { SnoozedInstanceConfig } from '../../../alerts_client/types';
import type { RuleTypeState, RuleAlertData } from '../../../../common';
import { parseDuration } from '../../../../common';
import type { GetSummarizedAlertsParams } from '../../../alerts_client/types';
import type { AlertHit } from '../../../types';
import type { Alert } from '../../../alert';
import {
  buildRuleUrl,
  formatActionToEnqueue,
  generateActionHash,
  getSummarizedAlerts,
  isActionOnInterval,
  isSummaryAction,
  logNumberOfFilteredAlerts,
  shouldScheduleAction,
} from '../lib';
import type {
  ActionSchedulerOptions,
  ActionsToSchedule,
  AddSummarizedAlertsOpts,
  AlertToAutoUnmute,
  GetActionsToScheduleOpts,
  HelperOpts,
  IActionScheduler,
  IsExecutableActiveAlertOpts,
  IsExecutableAlertOpts,
} from '../types';
import type { TransformActionParamsOptions } from '../../transform_action_params';
import { transformActionParams } from '../../transform_action_params';
import { injectActionParams } from '../../inject_action_params';

enum Reasons {
  MUTED = 'muted',
  THROTTLED = 'throttled',
  ACTION_GROUP_NOT_CHANGED = 'actionGroupHasNotChanged',
  DELAYED = 'delayed',
}

export class PerAlertActionScheduler<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> implements IActionScheduler<State, Context, ActionGroupIds, RecoveryActionGroupId>
{
  private actions: RuleAction[] = [];
  private mutedAlertIdsSet: ReadonlySet<string>;
  private ruleTypeActionGroups?: Map<ActionGroupIds | RecoveryActionGroupId, string>;
  private skippedAlerts: { [key: string]: { reason: string } } = {};

  /** Alert instance IDs whose snooze conditions were met during this run and should be auto-unmuted. */
  public alertsToAutoUnmute: AlertToAutoUnmute[] = [];
  private alertsToAutoUnmuteIds: Set<string> = new Set();
  /** Alert instance IDs evaluated in the initial pass whose snooze is still active (not yet expired). */
  private snoozedAlertStillMutedSet: Set<string> = new Set();

  constructor(
    private readonly context: ActionSchedulerOptions<
      Params,
      ExtractedParams,
      RuleState,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >
  ) {
    this.ruleTypeActionGroups = new Map(
      context.ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
    );
    this.mutedAlertIdsSet = context.mutedInstanceIdsSet ?? new Set(context.rule.mutedInstanceIds);

    const canGetSummarizedAlerts =
      !!context.ruleType.alerts && !!context.alertsClient.getSummarizedAlerts;

    // filter for per-alert actions; if the action has an alertsFilter, check that
    // rule type supports summarized alerts and filter out if not
    this.actions = compact(
      (context.rule.actions ?? [])
        .filter((action) => !isSummaryAction(action))
        .map((action) => {
          if (!canGetSummarizedAlerts && action.alertsFilter) {
            this.context.logger.error(
              `Skipping action "${action.id}" for rule "${this.context.rule.id}" because the rule type "${this.context.ruleType.name}" does not support alert-as-data.`
            );
            return null;
          }

          return action;
        })
    );
  }

  public get priority(): number {
    return 2;
  }

  public getAlertsToAutoUnmute(): AlertToAutoUnmute[] {
    return this.alertsToAutoUnmute;
  }

  public async getActionsToSchedule({
    activeAlerts,
    recoveredAlerts,
  }: GetActionsToScheduleOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>): Promise<
    ActionsToSchedule[]
  > {
    const executables: Array<{
      action: RuleAction;
      alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
    }> = [];
    const results: ActionsToSchedule[] = [];

    const activeAlertsArray = Object.values(activeAlerts || {});
    const recoveredAlertsArray = Object.values(recoveredAlerts || {});

    // Evaluate per-alert snooze expiry and populate alertsToAutoUnmute even when the rule
    // has no actions, so auto-unsnooze runs regardless of action count.
    for (const alert of activeAlertsArray) {
      this.evaluateAlertForAutoUnmute(alert);
    }
    for (const alert of recoveredAlertsArray) {
      this.evaluateAlertForAutoUnmute(alert);
    }

    const excludedAlertInstanceIds = [
      ...this.context.rule.mutedInstanceIds,
      ...(this.context.rule.snoozedInstances ?? []).map((e) => e.instanceId),
    ];
    const allActionUuids = this.actions.map((a) => a.uuid!);

    for (const action of this.actions) {
      let summarizedAlerts = null;

      if (action.useAlertDataForTemplate || action.alertsFilter) {
        const optionsBase = {
          spaceId: this.context.taskInstance.params.spaceId,
          ruleId: this.context.rule.id,
          excludedAlertInstanceIds,
          alertsFilter: action.alertsFilter,
        };

        let options: GetSummarizedAlertsParams;
        if (isActionOnInterval(action)) {
          const throttleMills = parseDuration(action.frequency!.throttle!);
          const start = new Date(Date.now() - throttleMills);
          options = { ...optionsBase, start, end: new Date() };
        } else {
          options = { ...optionsBase, executionUuid: this.context.executionId };
        }
        summarizedAlerts = await getSummarizedAlerts({
          queryOptions: options,
          alertsClient: this.context.alertsClient,
        });

        logNumberOfFilteredAlerts({
          logger: this.context.logger,
          numberOfAlerts: activeAlertsArray.length + recoveredAlertsArray.length,
          numberOfSummarizedAlerts: summarizedAlerts.all.count,
          action,
        });
      }

      for (const alert of activeAlertsArray) {
        alert.clearThrottlingLastScheduledActions(allActionUuids);
        if (
          this.isExecutableAlert({ alert, action, summarizedAlerts }) &&
          this.isExecutableActiveAlert({ alert, action })
        ) {
          this.addSummarizedAlerts({ alert, summarizedAlerts });
          executables.push({ action, alert });
        }
      }

      if (this.isRecoveredAction(action.group)) {
        for (const alert of recoveredAlertsArray) {
          if (this.isExecutableAlert({ alert, action, summarizedAlerts })) {
            this.addSummarizedAlerts({ alert, summarizedAlerts });
            executables.push({ action, alert });
          }
        }
      }
    }

    if (executables.length === 0) return [];

    this.context.ruleRunMetricsStore.incrementNumberOfGeneratedActions(executables.length);

    const ruleUrl = buildRuleUrl({
      getViewInAppRelativeUrl: this.context.ruleType.getViewInAppRelativeUrl,
      kibanaBaseUrl: this.context.taskRunnerContext.kibanaBaseUrl,
      logger: this.context.logger,
      rule: this.context.rule,
      spaceId: this.context.taskInstance.params.spaceId,
    });

    for (const { action, alert } of executables) {
      const { actionTypeId } = action;
      if (
        !shouldScheduleAction({
          action,
          actionsConfigMap: this.context.taskRunnerContext.actionsConfigMap,
          isActionExecutable: this.context.taskRunnerContext.actionsPlugin.isActionExecutable,
          logger: this.context.logger,
          ruleId: this.context.rule.id,
          ruleRunMetricsStore: this.context.ruleRunMetricsStore,
        })
      ) {
        continue;
      }
      this.context.ruleRunMetricsStore.incrementNumberOfTriggeredActions();
      this.context.ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(
        actionTypeId
      );

      const actionGroup = action.group as ActionGroupIds;
      const transformActionParamsOptions: TransformActionParamsOptions = {
        actionsPlugin: this.context.taskRunnerContext.actionsPlugin,
        alertId: this.context.rule.id,
        alertType: this.context.ruleType.id,
        actionTypeId: action.actionTypeId,
        alertName: this.context.rule.name,
        spaceId: this.context.taskInstance.params.spaceId,
        tags: this.context.rule.tags,
        alertInstanceId: alert.getId(),
        alertUuid: alert.getUuid(),
        alertActionGroup: actionGroup,
        alertActionGroupName: this.ruleTypeActionGroups!.get(actionGroup)!,
        context: alert.getContext(),
        actionId: action.id,
        state: alert.getState(),
        kibanaBaseUrl: this.context.taskRunnerContext.kibanaBaseUrl,
        alertParams: this.context.rule.params,
        actionParams: action.params,
        flapping: alert.getFlapping(),
        ruleUrl: ruleUrl?.absoluteUrl,
        consecutiveMatches: alert.getActiveCount(),
      };

      if (alert.isAlertAsData()) {
        transformActionParamsOptions.aadAlert = alert.getAlertAsData();
      }

      const actionToRun = {
        ...action,
        params: injectActionParams({
          actionTypeId: action.actionTypeId,
          ruleUrl,
          ruleName: this.context.rule.name,
          actionParams: transformActionParams(transformActionParamsOptions),
        }),
      };

      results.push({
        actionToEnqueue: formatActionToEnqueue({
          action: actionToRun,
          apiKey: this.context.apiKey,
          apiKeyId: this.context.apiKeyId,
          executionId: this.context.executionId,
          priority: this.context.priority,
          ruleConsumer: this.context.ruleConsumer,
          ruleId: this.context.rule.id,
          ruleTypeId: this.context.ruleType.id,
          spaceId: this.context.taskInstance.params.spaceId,
        }),
        actionToLog: {
          id: action.id,
          // uuid is typed as optional but in reality it is always
          // populated - https://github.com/elastic/kibana/issues/195255
          uuid: action.uuid,
          typeId: action.actionTypeId,
          alertId: alert.getId(),
          alertGroup: action.group,
        },
      });

      if (!this.isRecoveredAction(actionGroup)) {
        if (isActionOnInterval(action)) {
          alert.updateLastScheduledActions(
            action.group as ActionGroupIds,
            generateActionHash(action),
            action.uuid
          );
        } else {
          alert.updateLastScheduledActions(action.group as ActionGroupIds);
        }
        alert.unscheduleActions();
      }
    }

    return results;
  }

  private isExecutableAlert({
    alert,
    action,
    summarizedAlerts,
  }: IsExecutableAlertOpts<ActionGroupIds, RecoveryActionGroupId>) {
    // Snooze is carried on the alert (set in initializeExecution); isAlertMuted uses alert.getSnoozeConfig().
    return (
      !this.hasActiveMaintenanceWindow({ alert, action }) &&
      !this.isAlertMuted(alert) &&
      !this.isAlertDelayed(alert) &&
      !this.hasPendingCountButNotNotifyOnChange({ alert, action }) &&
      !alert.isFilteredOut(summarizedAlerts)
    );
  }

  private isExecutableActiveAlert({ alert, action }: IsExecutableActiveAlertOpts<ActionGroupIds>) {
    if (!alert.hasScheduledActions()) {
      return false;
    }

    const alertsActionGroup = alert.getScheduledActionOptions()?.actionGroup;

    if (!this.isValidActionGroup(alertsActionGroup as ActionGroupIds)) {
      return false;
    }

    if (action.group !== alertsActionGroup) {
      return false;
    }

    const alertId = alert.getId();
    const {
      context: { rule, logger, ruleLabel },
    } = this;
    const notifyWhen = action.frequency?.notifyWhen || rule.notifyWhen;

    if (notifyWhen === 'onActionGroupChange' && !alert.scheduledActionGroupHasChanged()) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] &&
          this.skippedAlerts[alertId].reason !== Reasons.ACTION_GROUP_NOT_CHANGED)
      ) {
        logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: alert is active but action group has not changed`
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.ACTION_GROUP_NOT_CHANGED };
      return false;
    }

    if (notifyWhen === 'onThrottleInterval') {
      const throttled = action.frequency?.throttle
        ? alert.isThrottled({
            throttle: action.frequency.throttle ?? null,
            actionHash: generateActionHash(action), // generateActionHash must be removed once all the hash identifiers removed from the task state
            uuid: action.uuid,
          })
        : alert.isThrottled({ throttle: rule.throttle ?? null });

      if (throttled) {
        if (
          !this.skippedAlerts[alertId] ||
          (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.THROTTLED)
        ) {
          logger.debug(
            `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: rule is throttled`
          );
        }
        this.skippedAlerts[alertId] = { reason: Reasons.THROTTLED };
        return false;
      }
    }

    return true;
  }

  private isRecoveredAction(actionGroup: string) {
    return actionGroup === this.context.ruleType.recoveryActionGroup.id;
  }

  /**
   * Returns the current execution's built alert fields for condition evaluation.
   * Uses only the built alert from this execution cycle (never tracked/previous-execution data).
   */
  private getCurrentAlertFields(alertId: string): Record<string, unknown> {
    return (
      (this.context.alertsClient.getBuiltAlertByInstanceId?.(alertId) as
        | Record<string, unknown>
        | undefined) ?? {}
    );
  }

  /**
   * Evaluates whether an alert's per-alert snooze (from alert.getSnoozeConfig()) has expired
   * and should be auto-unmuted. Returns null if the alert has no snooze config.
   *
   * Alert field data for condition evaluation must come from the current execution
   * (via the caller), not from persisted alert-as-data documents.
   */
  private evaluateSnoozeForAlert(
    currentAlertFields: Record<string, unknown>,
    snoozeInstanceConfig: SnoozedInstanceConfig | undefined | null
  ): { shouldUnmute: boolean; reason?: string } | null {
    if (!snoozeInstanceConfig) {
      return null;
    }

    const evalResult = evaluateSnoozeConditions(snoozeInstanceConfig, currentAlertFields);
    return {
      shouldUnmute: evalResult.shouldUnmute,
      reason: evalResult.reason ?? 'conditions met',
    };
  }

  /**
   * Evaluates whether an alert's per-alert snooze has expired and should be auto-unmuted.
   * Populates alertsToAutoUnmute so the task runner can clear the rule SO and AAD doc
   * even when the rule has no actions.
   */
  private evaluateAlertForAutoUnmute(
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>
  ): void {
    const alertId = alert.getId();
    const currentAlertFields = this.getCurrentAlertFields(alertId);
    const result = this.evaluateSnoozeForAlert(
      currentAlertFields,
      alert.getSnoozeConfig() ?? undefined
    );
    if (!result) {
      return;
    }
    if (!result.shouldUnmute) {
      this.snoozedAlertStillMutedSet.add(alertId);
      return;
    }
    this.addAutoUnmute(alertId, result.reason ?? 'conditions met');
  }

  private addAutoUnmute(alertId: string, reason: string): void {
    if (this.alertsToAutoUnmuteIds.has(alertId)) {
      return;
    }
    this.alertsToAutoUnmute.push({ alertInstanceId: alertId, reason });
    this.alertsToAutoUnmuteIds.add(alertId);
    this.context.logger.debug(
      `auto-unmuting alert '${alertId}' in rule ${this.context.ruleLabel}: ${reason}`
    );
  }

  private isAlertMuted(
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>
  ) {
    const alertId = alert.getId();

    // Path 1: Simple mute via rule SO's mutedInstanceIds.
    if (this.mutedAlertIdsSet.has(alertId)) {
      return this.markAlertAsMuted(alertId);
    }

    // Path 2: Conditional snooze from alert.getSnoozeConfig() (set in initializeExecution from rule SO).
    // Use cached results from the initial evaluateAlertForAutoUnmute pass to avoid re-evaluation.
    if (this.alertsToAutoUnmuteIds.has(alertId)) {
      return false;
    }
    if (this.snoozedAlertStillMutedSet.has(alertId)) {
      return this.markAlertAsMuted(alertId);
    }

    const currentAlertFields = this.getCurrentAlertFields(alertId);
    const result = this.evaluateSnoozeForAlert(
      currentAlertFields,
      alert.getSnoozeConfig() ?? undefined
    );
    if (!result) {
      return false;
    }
    if (result.shouldUnmute) {
      this.addAutoUnmute(alertId, result.reason ?? 'conditions met');
      return false;
    }

    // Conditional snooze not yet met -- suppress actions
    return this.markAlertAsMuted(alertId);
  }

  private markAlertAsMuted(alertId: string): true {
    if (
      !this.skippedAlerts[alertId] ||
      (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.MUTED)
    ) {
      this.context.logger.debug(
        `skipping scheduling of actions for '${alertId}' in rule ${this.context.ruleLabel}: alert is muted`
      );
    }
    this.skippedAlerts[alertId] = { reason: Reasons.MUTED };
    return true;
  }

  private isAlertDelayed(
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>
  ) {
    if (alert.isDelayed()) {
      const alertId = alert.getId();
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.DELAYED)
      ) {
        this.context.logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${this.context.ruleLabel}: alert is delayed`
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.DELAYED };
      return true;
    }
    return false;
  }

  private isValidActionGroup(actionGroup: ActionGroupIds | RecoveryActionGroupId) {
    if (!this.ruleTypeActionGroups!.has(actionGroup)) {
      this.context.logger.error(
        `Invalid action group "${actionGroup}" for rule "${this.context.ruleType.id}".`
      );
      return false;
    }
    return true;
  }

  private hasActiveMaintenanceWindow({
    alert,
    action,
  }: HelperOpts<ActionGroupIds, RecoveryActionGroupId>) {
    const alertMaintenanceWindowIds = alert.getMaintenanceWindowIds();
    if (alertMaintenanceWindowIds.length !== 0) {
      this.context.logger.debug(
        `no scheduling of actions "${action.id}" for alert "${alert.getId()}" from rule "${
          this.context.rule.id
        }": has active maintenance windows ${alertMaintenanceWindowIds.join(', ')}.`
      );
      return true;
    }

    return false;
  }

  private addSummarizedAlerts({
    alert,
    summarizedAlerts,
  }: AddSummarizedAlertsOpts<ActionGroupIds, RecoveryActionGroupId>) {
    if (summarizedAlerts) {
      const alertAsData = summarizedAlerts.all.data.find(
        (alertHit: AlertHit) => alertHit._id === alert.getUuid()
      );
      if (alertAsData) {
        alert.setAlertAsData(alertAsData);
      }
    }
  }

  private hasPendingCountButNotNotifyOnChange({
    alert,
    action,
  }: HelperOpts<ActionGroupIds, RecoveryActionGroupId>) {
    // only actions with notifyWhen set to "on status change" should return
    // notifications for flapping pending recovered alerts
    if (
      alert.getPendingRecoveredCount() > 0 &&
      action?.frequency?.notifyWhen !== RuleNotifyWhen.CHANGE
    ) {
      return true;
    }
    return false;
  }
}
