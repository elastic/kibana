/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '@kbn/scout';
import type { ApiServicesFixture, EsClient, KbnClient, ScoutLogger } from '@kbn/scout';
import {
  getActionPoliciesApiService,
  getAlertActionsApiService,
  getDispatcherApiService,
  getInsightsApiService,
  getMaintenanceWindowsApiService,
  getRuleExecutionsApiService,
  getRulesApiService,
  type ActionPoliciesApiService,
  type AlertActionsApiService,
  type DispatcherApiService,
  type InsightsApiService,
  type MaintenanceWindowsApiService,
  type RuleExecutionsApiService,
  type RulesApiService,
  type RuleEventsApiService,
} from '../../common/services';
import { getRuleEventsApiService } from '../../common/services/rule_events_api_service';
import type { SourceIndexApiService } from '../../common/services/source_index_api_service';
import { getSourceIndexApiService } from '../../common/services/source_index_api_service';

export interface AlertingApiServices {
  rules: RulesApiService;
  ruleEvents: RuleEventsApiService;
  alertActions: AlertActionsApiService;
  actionPolicies: ActionPoliciesApiService;
  maintenanceWindows: MaintenanceWindowsApiService;
  insights: InsightsApiService;
  sourceIndex: SourceIndexApiService;
  ruleExecutions: RuleExecutionsApiService;
  dispatcher: DispatcherApiService;
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
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  log: ScoutLogger;
}): AlertingApiServices => ({
  rules: getRulesApiService({ kbnClient, log }),
  ruleEvents: getRuleEventsApiService({ esClient, log }),
  alertActions: getAlertActionsApiService({ esClient, log }),
  actionPolicies: getActionPoliciesApiService({ kbnClient, log }),
  maintenanceWindows: getMaintenanceWindowsApiService({ kbnClient, log }),
  insights: getInsightsApiService({ esClient, log }),
  sourceIndex: getSourceIndexApiService({ esClient, log }),
  ruleExecutions: getRuleExecutionsApiService({ esClient, log }),
  dispatcher: getDispatcherApiService({ esClient, log }),
});

export const apiTest = baseApiTest.extend<{}, { apiServices: AlertingApiServicesFixture }>({
  apiServices: [
    async (
      { apiServices, esClient, kbnClient, log },
      use: (extendedApiServices: AlertingApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices: AlertingApiServicesFixture = {
        ...apiServices,
        alertingV2: buildAlertingApiServices({ esClient, kbnClient, log }),
      };
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

export { ALL_ROLE, NO_ACCESS_ROLE, READ_ROLE } from '../../common/roles';
export { buildCreateRuleData } from '../../common/builders';
export { getRuleUrl } from '../../common/urls';
export { expectNoBulkTruncationMetadata } from '../../common/assertions';
export * as testData from '../../common/constants';
