/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  EsClient,
  KbnClient,
  ScoutLogger,
  ScoutTestConfig,
} from '@kbn/scout';
import {
  getActionPoliciesApiService,
  getAlertActionsApiService,
  getAlertActionsEventsService,
  getDispatcherApiService,
  getMaintenanceWindowsApiService,
  getRuleChangesHistoryApiService,
  getRuleExecutionsApiService,
  getRulesApiService,
  getRuleSavedObjectService,
  getRuleTemplatesApiService,
  getTaskManagerService,
  getTelemetryService,
  getWorkflowsApiService,
  type ActionPoliciesApiService,
  type AlertActionsApiService,
  type AlertActionsEventsService,
  type DispatcherApiService,
  type MaintenanceWindowsApiService,
  type RuleChangesHistoryApiService,
  type RuleExecutionsApiService,
  type RulesApiService,
  type RuleSavedObjectService,
  type RuleEventsApiService,
  type RuleTemplatesApiService,
  type TaskManagerService,
  type TelemetryService,
  type WorkflowsApiService,
} from './services';
import { getRuleEventsApiService } from './services/rule_events_api_service';
import type { SourceIndexApiService } from './services/source_index_api_service';
import { getSourceIndexApiService } from './services/source_index_api_service';

export interface AlertingApiServices {
  rules: RulesApiService;
  ruleSavedObject: RuleSavedObjectService;
  ruleTemplates: RuleTemplatesApiService;
  ruleChangesHistory: RuleChangesHistoryApiService;
  ruleEvents: RuleEventsApiService;
  alertActionsEvents: AlertActionsEventsService;
  alertActions: AlertActionsApiService;
  actionPolicies: ActionPoliciesApiService;
  maintenanceWindows: MaintenanceWindowsApiService;
  sourceIndex: SourceIndexApiService;
  ruleExecutions: RuleExecutionsApiService;
  dispatcher: DispatcherApiService;
  taskManager: TaskManagerService;
  telemetry: TelemetryService;
  workflows: WorkflowsApiService;
}

export interface AlertingApiServicesFixture extends ApiServicesFixture {
  alertingV2: AlertingApiServices;
}

/**
 * Builds the `alertingV2` API services bundle used by both the API and UI
 * Scout test fixtures. Centralizing construction keeps the two fixture
 * entry points in sync as new services are added.
 */
export const buildAlertingApiServices = ({
  esClient,
  kbnClient,
  log,
  config,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  log: ScoutLogger;
  config: ScoutTestConfig;
}): AlertingApiServices => {
  const taskManager = getTaskManagerService({ kbnClient, log });
  return {
    rules: getRulesApiService({ kbnClient, log }),
    ruleSavedObject: getRuleSavedObjectService({ esClient, log, config }),
    ruleTemplates: getRuleTemplatesApiService({ kbnClient, log }),
    ruleChangesHistory: getRuleChangesHistoryApiService({ esClient, log, config }),
    ruleEvents: getRuleEventsApiService({ esClient, log }),
    alertActionsEvents: getAlertActionsEventsService({ esClient, log }),
    alertActions: getAlertActionsApiService({ kbnClient, log }),
    actionPolicies: getActionPoliciesApiService({ kbnClient, log }),
    maintenanceWindows: getMaintenanceWindowsApiService({ kbnClient, log }),
    sourceIndex: getSourceIndexApiService({ esClient, log }),
    ruleExecutions: getRuleExecutionsApiService({ esClient, log }),
    dispatcher: getDispatcherApiService({ esClient, log }),
    taskManager,
    telemetry: getTelemetryService({ esClient, log, taskManager }),
    workflows: getWorkflowsApiService({ kbnClient, log }),
  };
};
