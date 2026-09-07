/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import type { RuleAction, RuleTypeParams } from '@kbn/alerting-types';
import { RuleNotifyWhen } from '@kbn/alerting-types';
import { compact } from 'lodash';
import { createTaskRunnerLogger } from '../../lib';
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
  SNOOZED = 'snoozed',
  THROTTLED = 'throttled',
  ACTION_GROUP_NOT_CHANGED = 'actionGroupHasNotChanged',
  DELAYED = 'delayed',
}

// Yield to the event loop after holding the thread for this many milliseconds
// during the action-parameter building loop. Prevents event loop starvation
// when a rule has many alert×action pairs. Does not reduce CPU; only ensures
// other pending I/O and Task Manager heartbeats get a turn between slices.
const YIELD_AFTER_MS = 50;

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
  private mutedAlertIdsSet: Set<string> = new Set();
  private snoozedAlertIdsSet: Set<string> = new Set();
  private ruleTypeActionGroups?: Map<ActionGroupIds | RecoveryActionGroupId, string>;
  private skippedAlerts: { [key: string]: { reason: string } } = {};

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
    this.mutedAlertIdsSet = new Set(context.rule.mutedInstanceIds);
    this.snoozedAlertIdsSet = context.activeSnoozedIds ?? new Set();

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
              `Skipping action "${action.id}" for rule "${this.context.rule.id}" because the rule type "${this.context.ruleType.name}" does not support alert-as-data.`,
              {
                labels: {
                  ruleId: this.context.rule.id,
                  ruleType: this.context.rule.alertTypeId,
                  spaceId: this.context.taskInstance.params.spaceId,
                  executionId: this.context.executionId,
                  taskInstanceId: this.context.taskInstance.id,
                  actionId: action.id,
                  actionTypeId: action.actionTypeId,
                },
              }
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

    const logger = createTaskRunnerLogger({
      logger: this.context.logger,
      labels: {
        executionId: this.context.executionId,
        spaceId: this.context.taskInstance.params.spaceId,
        taskInstanceId: this.context.taskInstance.id,
        ruleType: this.context.rule.alertTypeId,
        ruleId: this.context.rule.id,
      },
    });
    const activeAlertsArray = Object.values(activeAlerts || {});
    const recoveredAlertsArray = Object.values(recoveredAlerts || {});

    for (const action of this.actions) {
      let summarizedAlerts = null;

      if (action.useAlertDataForTemplate || action.alertsFilter) {
        const optionsBase = {
          spaceId: this.context.taskInstance.params.spaceId,
          ruleId: this.context.rule.id,
          excludedAlertInstanceIds: [
            ...this.context.rule.mutedInstanceIds,
            ...this.snoozedAlertIdsSet,
          ],
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
          logger,
          numberOfAlerts: activeAlertsArray.length + recoveredAlertsArray.length,
          numberOfSummarizedAlerts: summarizedAlerts.all.count,
          action,
        });
      }

      for (const alert of activeAlertsArray) {
        const allActionUuids = this.actions.map((a) => a.uuid!);
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
      logger,
      rule: this.context.rule,
      spaceId: this.context.taskInstance.params.spaceId,
    });

    let sliceStart = Date.now();
    for (const { action, alert } of executables) {
      if (Date.now() - sliceStart > YIELD_AFTER_MS) {
        await new Promise(setImmediate);
        sliceStart = Date.now();
      }
      const { actionTypeId } = action;
      if (
        !shouldScheduleAction({
          action,
          actionsConfigMap: this.context.taskRunnerContext.actionsConfigMap,
          isActionExecutable: this.context.taskRunnerContext.actionsPlugin.isActionExecutable,
          logger,
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
          uiamApiKeyExternal: this.context.uiamApiKeyExternal,
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
    return (
      !this.hasActiveMaintenanceWindow({ alert, action }) &&
      !this.isAlertMuted(alert) &&
      !this.isAlertSnoozed(alert) &&
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
      context: { rule, ruleLabel },
    } = this;
    const logger = createTaskRunnerLogger({
      logger: this.context.logger,
      labels: {
        alertId,
        ruleId: rule.id,
        ruleType: rule.alertTypeId,
        actionId: action.id,
        actionTypeId: action.actionTypeId,
        executionId: this.context.executionId,
        taskInstanceId: this.context.taskInstance.id,
        spaceId: this.context.taskInstance.params.spaceId,
      },
    });
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
            `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: rule is throttled`,
            {
              labels: {
                alertId,
                ruleId: this.context.rule.id,
                ruleType: this.context.rule.alertTypeId,
                spaceId: this.context.taskInstance.params.spaceId,
                executionId: this.context.executionId,
                taskInstanceId: this.context.taskInstance.id,
              },
            }
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

  private isAlertMuted(
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>
  ) {
    const alertId = alert.getId();
    const muted = this.mutedAlertIdsSet.has(alertId);
    if (muted) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.MUTED)
      ) {
        this.context.logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${this.context.ruleLabel}: rule is muted`,
          {
            labels: {
              alertId,
              ruleId: this.context.rule.id,
              ruleType: this.context.rule.alertTypeId,
              spaceId: this.context.taskInstance.params.spaceId,
              executionId: this.context.executionId,
              taskInstanceId: this.context.taskInstance.id,
            },
          }
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.MUTED };
      return true;
    }
    return false;
  }

  private isAlertSnoozed(
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>
  ) {
    const alertId = alert.getId();
    const snoozed = this.snoozedAlertIdsSet.has(alertId);
    if (snoozed) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.SNOOZED)
      ) {
        this.context.logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${this.context.ruleLabel}: alert is snoozed`,
          {
            labels: {
              alertId,
              ruleId: this.context.rule.id,
              ruleType: this.context.rule.alertTypeId,
              spaceId: this.context.taskInstance.params.spaceId,
              executionId: this.context.executionId,
              taskInstanceId: this.context.taskInstance.id,
            },
          }
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.SNOOZED };
      return true;
    }
    return false;
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
          `skipping scheduling of actions for '${alertId}' in rule ${this.context.ruleLabel}: alert is delayed`,
          {
            labels: {
              alertId,
              ruleId: this.context.rule.id,
              ruleType: this.context.ruleType.id,
              spaceId: this.context.taskInstance.params.spaceId,
              executionId: this.context.executionId,
              taskInstanceId: this.context.taskInstance.id,
            },
          }
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
        `Invalid action group "${actionGroup}" for rule "${this.context.ruleType.id}".`,
        {
          labels: {
            ruleId: this.context.rule.id,
            ruleType: this.context.ruleType.id,
            spaceId: this.context.taskInstance.params.spaceId,
            executionId: this.context.executionId,
            taskInstanceId: this.context.taskInstance.id,
          },
        }
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
      const alertId = alert.getId();
      this.context.logger.debug(
        `no scheduling of actions "${action.id}" for alert "${alertId}" from rule "${
          this.context.rule.id
        }": has active maintenance windows ${alertMaintenanceWindowIds.join(', ')}.`,
        {
          labels: {
            alertId,
            actionId: action.id,
            actionTypeId: action.actionTypeId,
            ruleId: this.context.rule.id,
            ruleType: this.context.rule.alertTypeId,
            spaceId: this.context.taskInstance.params.spaceId,
            executionId: this.context.executionId,
            taskInstanceId: this.context.taskInstance.id,
          },
        }
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
