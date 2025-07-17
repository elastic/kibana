/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getConnectorModel,
  type BoundInferenceClient,
  InferenceConnectorType,
  getConnectorFamily,
  getConnectorProvider,
  InferenceConnector,
  Model,
} from '@kbn/inference-common';
import { createRestClient } from '@kbn/inference-plugin/common';
import { test as base } from '@kbn/scout';
import { HttpHandler } from '@kbn/core/public';
import { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { getPhoenixConfig } from './utils/get_phoenix_config';
import { KibanaPhoenixClient } from './kibana_phoenix_client/client';
import { EvaluationTestOptions } from './config/create_playwright_eval_config';
import { httpHandlerFromKbnClient } from './utils/http_handler_from_kbn_client';
import { createCriteriaEvaluator } from './evaluators/criteria';
import { DefaultEvaluators } from './types';
import { reportModelScore } from './utils/report_model_score';
import { createConnectorFixture } from './utils/create_connector_fixture';

/**
 * Test type for evaluations. Loads an inference client and a
 * (Kibana-flavored) Phoenix client.
 */
export const evaluate = base.extend<
  {},
  {
    inferenceClient: BoundInferenceClient;
    phoenixClient: KibanaPhoenixClient;
    evaluators: DefaultEvaluators;
    fetch: HttpHandler;
    connector: AvailableConnectorWithId;
    evaluationConnector: AvailableConnectorWithId;
  }
>({
  fetch: [
    async ({ kbnClient, log }, use) => {
      // add a HttpHandler as a fixture, so consumers can use
      // modules that depend on it (like the inference client)
      const fetch = httpHandlerFromKbnClient({ kbnClient, log });
      await use(fetch);
    },
    { scope: 'worker' },
  ],
  connector: [
    async ({ fetch, log }, use, testInfo) => {
      const predefinedConnector = (testInfo.project.use as Pick<EvaluationTestOptions, 'connector'>)
        .connector;

      await createConnectorFixture({ predefinedConnector, fetch, log, use });
    },
    {
      scope: 'worker',
    },
  ],
  evaluationConnector: [
    async ({ fetch, log, connector }, use, testInfo) => {
      const predefinedConnector = (testInfo.project.use as Pick<EvaluationTestOptions, 'connector'>)
        .connector;

      if (predefinedConnector.id !== connector.id) {
        await createConnectorFixture({ predefinedConnector, fetch, log, use });
      }
    },
    {
      scope: 'worker',
    },
  ],
  inferenceClient: [
    async ({ kbnClient, log, fetch, connector }, use, testInfo) => {
      log.info('Loading inference client');

      const inferenceClient = createRestClient({
        fetch,
        bindTo: {
          connectorId: connector.id,
        },
      });
      log.serviceLoaded?.('inferenceClient');

      await use(inferenceClient);
    },
    { scope: 'worker' },
  ],
  phoenixClient: [
    async ({ log, connector }, use) => {
      const config = getPhoenixConfig();

      const inferenceConnector: InferenceConnector = {
        type: connector.actionTypeId as InferenceConnectorType,
        config: connector.config,
        connectorId: connector.id,
        name: connector.name,
      };

      const model: Model = {
        family: getConnectorFamily(inferenceConnector),
        provider: getConnectorProvider(inferenceConnector),
        id: getConnectorModel(inferenceConnector),
      };

      const phoenixClient = new KibanaPhoenixClient({
        config,
        log,
        model,
        runId: process.env.TEST_RUN_ID!,
      });

      await use(phoenixClient);

      await reportModelScore({
        phoenixClient,
        log,
        model,
        experiments: await phoenixClient.getRanExperiments(),
      });
    },
    {
      scope: 'worker',
    },
  ],
  evaluators: [
    async ({ log, inferenceClient, evaluationConnector }, use) => {
      const evaluatorInferenceClient = inferenceClient.bindTo({
        connectorId: evaluationConnector.id,
      });

      const evaluators: DefaultEvaluators = {
        criteria: (criteria) => {
          return createCriteriaEvaluator({
            inferenceClient: evaluatorInferenceClient,
            criteria,
            log,
          });
        },
      };
      await use(evaluators);
    },
    {
      scope: 'worker',
    },
  ],
});
