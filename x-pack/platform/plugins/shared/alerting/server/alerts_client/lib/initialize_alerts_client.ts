/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { Logger } from '@kbn/core/server';
import { LegacyAlertsClient } from '..';
import type { IAlertsClient } from '../types';
import type { AlertsService } from '../../alerts_service';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  RuleTypeParams,
  SanitizedRule,
} from '../../types';
import { DEFAULT_FLAPPING_SETTINGS } from '../../types';
import type { RuleTaskInstance, RuleTypeRunnerContext } from '../../task_runner/types';
import type { TaskRunnerTimer } from '../../task_runner/task_runner_timer';
import type { RuleRunMetricsStore } from '../../lib/rule_run_metrics_store';

export type RuleData<Params extends RuleTypeParams> = Pick<
  SanitizedRule<Params>,
  'id' | 'name' | 'tags' | 'consumer' | 'revision' | 'alertDelay' | 'params'
>;

interface InitializeAlertsClientOpts<Params extends RuleTypeParams> {
  alertsService: AlertsService | null;
  context: RuleTypeRunnerContext;
  executionId: string;
  logger: Logger;
  maxAlerts: number;
  rule: RuleData<Params>;
  ruleType: UntypedNormalizedRuleType;
  ruleRunMetricsStore: RuleRunMetricsStore;
  runTimestamp?: Date;
  startedAt: Date | null;
  taskInstance: RuleTaskInstance;
  timer: TaskRunnerTimer;
}

export const initializeAlertsClient = async <
  Params extends RuleTypeParams,
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  alertsService,
  context,
  executionId,
  logger,
  maxAlerts,
  rule,
  ruleType,
  ruleRunMetricsStore,
  runTimestamp,
  startedAt,
  taskInstance,
  timer,
}: InitializeAlertsClientOpts<Params>) => {
  const {
    state: {
      alertInstances: alertRawInstances = {},
      alertRecoveredInstances: alertRecoveredRawInstances = {},
      trackedExecutions,
    },
  } = taskInstance;

  const alertsClientParams = {
    alertingEventLogger: context.alertingEventLogger,
    logger,
    maintenanceWindowsService: context.maintenanceWindowsService,
    request: context.request,
    ruleRunMetricsStore,
    ruleType,
    spaceId: context.spaceId,
    timer,
  };

  // Create AlertsClient if rule type has registered an alerts context
  // with the framework. The AlertsClient will handle reading and
  // writing from alerts-as-data indices and eventually
  // we will want to migrate all the processing of alerts out
  // of the LegacyAlertsClient and into the AlertsClient.
  let alertsClient: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;

  try {
    const client =
      (await alertsService?.createAlertsClient<
        AlertData,
        State,
        Context,
        ActionGroupIds,
        RecoveryActionGroupId
      >({
        ...alertsClientParams,
        namespace: context.namespace ?? DEFAULT_NAMESPACE_STRING,
        rule: {
          consumer: rule.consumer,
          executionId,
          id: rule.id,
          name: rule.name,
          parameters: rule.params,
          revision: rule.revision,
          spaceId: context.spaceId,
          tags: rule.tags,
          alertDelay: rule.alertDelay?.active ?? 0,
        },
      })) ?? null;

    alertsClient = client
      ? client
      : new LegacyAlertsClient<State, Context, ActionGroupIds, RecoveryActionGroupId>(
          alertsClientParams
        );
  } catch (err) {
    logger.error(
      `Error initializing AlertsClient for context ${ruleType.alerts?.context}. Using legacy alerts client instead. - ${err.message}`
    );

    alertsClient = new LegacyAlertsClient<State, Context, ActionGroupIds, RecoveryActionGroupId>(
      alertsClientParams
    );
  }

  await alertsClient.initializeExecution({
    maxAlerts,
    ruleLabel: context.ruleLogPrefix,
    flappingSettings: context.flappingSettings ?? DEFAULT_FLAPPING_SETTINGS,
    startedAt,
    runTimestamp,
    activeAlertsFromState: alertRawInstances,
    recoveredAlertsFromState: alertRecoveredRawInstances,
    trackedExecutions,
  });

  return alertsClient;
};
