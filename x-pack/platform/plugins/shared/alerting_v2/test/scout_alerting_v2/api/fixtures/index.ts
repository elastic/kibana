/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '@kbn/scout';
import type { ApiServicesFixture, EsClient, KbnClient, ScoutLogger } from '@kbn/scout';
import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '../../common/constants';
import {
  getDataStreamApiService,
  getInsightsApiService,
  getRulesApiService,
  type DataStreamApiService,
  type InsightsApiService,
  type RulesApiService,
} from '../services';

export interface AlertingApiServices {
  rules: RulesApiService;
  ruleEvents: DataStreamApiService;
  alertActions: DataStreamApiService;
  insights: InsightsApiService;
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
  ruleEvents: getDataStreamApiService({
    esClient,
    log,
    dataStreamName: ALERT_EVENTS_DATA_STREAM,
  }),
  alertActions: getDataStreamApiService({
    esClient,
    log,
    dataStreamName: ALERT_ACTIONS_DATA_STREAM,
  }),
  insights: getInsightsApiService({ esClient, log }),
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
export * as testData from '../../common/constants';
