/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import type { RuleAction, RuleTypeParams } from '@kbn/alerting-types';
import { cloneDeep, compact } from 'lodash';
import type { UntypedNormalizedRuleType } from '../../../rule_type_registry';
import {
  AlertCategory,
  type AlertsResult,
  type CategorizedAlert,
} from '../../../alerts_client/types';
import type { RuleTypeState, RuleAlertData } from '../../../../common';
import { parseDuration } from '../../../../common';
import type { GetSummarizedAlertsParams } from '../../../alerts_client/types';
import type { AlertHit } from '../../../types';
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
  IActionScheduler,
  RuleActionWithSummary,
} from '../types';
import type { TransformActionParamsOptions } from '../../transform_action_params';
import { transformActionParams } from '../../transform_action_params';
import { injectActionParams } from '../../inject_action_params';
import { reduceAlerts } from '../alert_reducers';
import { actionReducers } from '../alert_reducers/reducers';

// enum Reasons {
//   MUTED = 'muted',
//   THROTTLED = 'throttled',
//   ACTION_GROUP_NOT_CHANGED = 'actionGroupHasNotChanged',
// }

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
  private actions: RuleActionWithSummary[] = [];
  private ruleTypeActionGroups?: Map<ActionGroupIds | RecoveryActionGroupId, string>;
  // private skippedAlerts: { [key: string]: { reason: string } } = {};

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

    // filter for per-alert actions; if the action has an alertsFilter, check that
    // rule type supports summarized alerts and filter out if not
    this.actions = compact(
      (context.rule.actions ?? [])
        .filter((action) => !isSummaryAction(action))
        .map((action) => {
          if (!context.canGetSummarizedAlerts && action.alertsFilter) {
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

  public async getActionsToSchedule(
    alerts: AlertsResult<State, Context, ActionGroupIds>
  ): Promise<ActionsToSchedule[]> {
    const executables: Array<{
      action: RuleAction;
      alert: CategorizedAlert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
    }> = [];
    const results: ActionsToSchedule[] = [];

    for (const action of this.actions) {
      action.summarizedAlerts = await this.getSummarizedAlertsForAction(action);

      if (action.summarizedAlerts) {
        logNumberOfFilteredAlerts({
          logger: this.context.logger,
          numberOfAlerts: alerts.length,
          numberOfSummarizedAlerts: action.summarizedAlerts.all.count,
          action,
        });
      }

      const reducedAlerts = await reduceAlerts(cloneDeep(alerts), actionReducers, {
        action,
        logger: this.context.logger,
        rule: this.context.rule,
        ruleType: this.context.ruleType as unknown as UntypedNormalizedRuleType,
      });

      for (const alert of reducedAlerts) {
        this.addSummarizedAlerts({
          alert: alert.alert,
          summarizedAlerts: action.summarizedAlerts ?? null,
        });
        executables.push({ action, alert });
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

    for (const {
      action,
      alert: { alert, category },
    } of executables) {
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

      if (category === AlertCategory.New || category === AlertCategory.Ongoing) {
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

  private async getSummarizedAlertsForAction(action: RuleActionWithSummary) {
    if (action.useAlertDataForTemplate || action.alertsFilter) {
      const optionsBase = {
        spaceId: this.context.taskInstance.params.spaceId,
        ruleId: this.context.rule.id,
        excludedAlertInstanceIds: this.context.rule.mutedInstanceIds,
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
      return await getSummarizedAlerts({
        queryOptions: options,
        alertsClient: this.context.alertsClient,
      });
    }
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
}
