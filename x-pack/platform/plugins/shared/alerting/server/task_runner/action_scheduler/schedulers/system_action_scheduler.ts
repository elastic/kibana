/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import type { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-state-types';
import type { RuleSystemAction, RuleTypeParams } from '@kbn/alerting-types';
import type { CombinedSummarizedAlerts } from '../../../types';
import type { RuleTypeState, RuleAlertData } from '../../../../common';
import { parseDuration } from '../../../../common';
import type { GetSummarizedAlertsParams } from '../../../alerts_client/types';
import {
  buildRuleUrl,
  formatActionToEnqueue,
  getSummarizedAlerts,
  shouldScheduleAction,
  isActionOnInterval,
  isSummaryActionThrottled,
  isSummaryAction,
  logNumberOfFilteredAlerts,
} from '../lib';
import type {
  ActionSchedulerOptions,
  ActionsToSchedule,
  GetActionsToScheduleOpts,
  IActionScheduler,
} from '../types';

export class SystemActionScheduler<
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
  private actions: RuleSystemAction[] = [];

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

    // only process system actions when rule type supports summarized alerts
    this.actions = canGetSummarizedAlerts ? context.rule.systemActions ?? [] : [];
  }

  public get priority(): number {
    return 1;
  }

  public async getActionsToSchedule({
    throttledSummaryActions,
  }: GetActionsToScheduleOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>): Promise<
    ActionsToSchedule[]
  > {
    const executables: Array<{
      action: RuleSystemAction;
      summarizedAlerts: CombinedSummarizedAlerts;
    }> = [];
    const results: ActionsToSchedule[] = [];

    for (const action of this.actions) {
      const isSummary = isSummaryAction(action);

      // Check if summary action is throttled (only for summary actions)
      if (
        isSummary &&
        isSummaryActionThrottled({
          action,
          throttledSummaryActions,
          logger: this.context.logger,
        })
      ) {
        continue;
      }

      const actionHasThrottleInterval = isActionOnInterval(action);
      const optionsBase = {
        spaceId: this.context.taskInstance.params.spaceId,
        ruleId: this.context.rule.id,
        excludedAlertInstanceIds: this.context.rule.mutedInstanceIds,
      };

      let options: GetSummarizedAlertsParams;
      if (actionHasThrottleInterval) {
        const throttleMills = parseDuration(action.frequency!.throttle!);
        const start = new Date(Date.now() - throttleMills);
        options = { ...optionsBase, start, end: new Date() };
      } else {
        options = { ...optionsBase, executionUuid: this.context.executionId };
      }

      const summarizedAlerts = await getSummarizedAlerts({
        queryOptions: options,
        alertsClient: this.context.alertsClient,
      });

      if (!actionHasThrottleInterval) {
        logNumberOfFilteredAlerts({
          logger: this.context.logger,
          numberOfAlerts: isSummary ? 0 : summarizedAlerts.all.count, // For per-alert, count individual alerts
          numberOfSummarizedAlerts: summarizedAlerts.all.count,
          action,
        });
      }

      if (summarizedAlerts && summarizedAlerts.all.count !== 0) {
        if (isSummary) {
          // Summary action: one workflow with all alerts
          executables.push({ action, summarizedAlerts });
        } else {
          // Per-alert action: separate workflow for each alert
          for (const alert of summarizedAlerts.all.data) {
            const alertUuid = get(alert, ALERT_UUID);
            const isInNew = summarizedAlerts.new.data.some((a) => get(a, ALERT_UUID) === alertUuid);
            const isInOngoing = summarizedAlerts.ongoing.data.some(
              (a) => get(a, ALERT_UUID) === alertUuid
            );
            const isInRecovered = summarizedAlerts.recovered.data.some(
              (a) => get(a, ALERT_UUID) === alertUuid
            );

            const singleAlertSummary: CombinedSummarizedAlerts = {
              new: {
                count: isInNew ? 1 : 0,
                data: isInNew ? [alert] : [],
              },
              ongoing: {
                count: isInOngoing ? 1 : 0,
                data: isInOngoing ? [alert] : [],
              },
              recovered: {
                count: isInRecovered ? 1 : 0,
                data: isInRecovered ? [alert] : [],
              },
              all: {
                count: 1,
                data: [alert],
              },
            };
            executables.push({ action, summarizedAlerts: singleAlertSummary });
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

    for (const { action, summarizedAlerts } of executables) {
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

      const hasConnectorAdapter = this.context.taskRunnerContext.connectorAdapterRegistry.has(
        action.actionTypeId
      );

      // System actions without an adapter cannot be executed
      if (!hasConnectorAdapter) {
        this.context.logger.warn(
          `Rule "${this.context.rule.id}" skipped scheduling system action "${action.id}" because no connector adapter is configured`
        );

        continue;
      }

      this.context.ruleRunMetricsStore.incrementNumberOfTriggeredActions();
      this.context.ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(
        actionTypeId
      );

      // Update throttled state for summary actions with throttle interval
      if (isSummaryAction(action) && isActionOnInterval(action) && throttledSummaryActions) {
        throttledSummaryActions[action.uuid!] = { date: new Date().toISOString() };
      }

      const connectorAdapter = this.context.taskRunnerContext.connectorAdapterRegistry.get(
        action.actionTypeId
      );

      const connectorAdapterActionParams = connectorAdapter.buildActionParams({
        alerts: summarizedAlerts,
        rule: {
          id: this.context.rule.id,
          tags: this.context.rule.tags,
          name: this.context.rule.name,
          consumer: this.context.rule.consumer,
          producer: this.context.ruleType.producer,
          ruleTypeId: this.context.rule.alertTypeId,
        },
        ruleUrl: ruleUrl?.absoluteUrl,
        spaceId: this.context.taskInstance.params.spaceId,
        params: action.params,
      });

      const actionToRun = Object.assign(action, { params: connectorAdapterActionParams });

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
          uuid: action.uuid,
          typeId: action.actionTypeId,
          alertSummary: {
            new: summarizedAlerts.new.count,
            ongoing: summarizedAlerts.ongoing.count,
            recovered: summarizedAlerts.recovered.count,
          },
        },
      });
    }

    return results;
  }
}
