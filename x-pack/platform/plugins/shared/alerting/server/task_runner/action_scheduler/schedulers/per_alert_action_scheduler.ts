/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import type { RuleAction, RuleTypeParams } from '@kbn/alerting-types';
import { compact } from 'lodash';
import type { RuleTypeState, RuleAlertData } from '../../../../common';
import type { Alert } from '../../../alert';
import { buildRuleUrl, formatActionToEnqueue, isSummaryAction, shouldScheduleAction } from '../lib';
import type {
  ActionSchedulerOptions,
  ActionsToSchedule,
  GetActionsToScheduleOpts,
  IActionScheduler,
} from '../types';
import type { TransformActionParamsOptions } from '../../transform_action_params';
import { transformActionParams } from '../../transform_action_params';
import { injectActionParams } from '../../inject_action_params';

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

    for (const action of this.actions) {
      for (const alert of activeAlertsArray) {
        executables.push({ action, alert });
      }

      for (const alert of recoveredAlertsArray) {
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

      const transformActionParamsOptions: TransformActionParamsOptions = {
        actionsPlugin: this.context.taskRunnerContext.actionsPlugin,
        actionTypeId: action.actionTypeId,
        spaceId: this.context.taskInstance.params.spaceId,
        tags: this.context.rule.tags,
        actionId: action.id,
        actionParams: action.params,
        aadAlert: alert.getAlertAsData(),
      };

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
    }

    return results;
  }
}
