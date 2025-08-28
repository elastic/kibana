/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times } from 'lodash';
import type { InferenceConnectorType, InferenceConnector, Model } from '@kbn/inference-common';
import {
  getConnectorModel,
  type BoundInferenceClient,
  getConnectorFamily,
  getConnectorProvider,
} from '@kbn/inference-common';
import { createRestClient } from '@kbn/inference-plugin/common';
import { test as base } from '@kbn/scout';
import type { HttpHandler } from '@kbn/core/public';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { getPhoenixConfig } from './utils/get_phoenix_config';
import { KibanaPhoenixClient } from './kibana_phoenix_client/client';
import type { EvaluationTestOptions } from './config/create_playwright_eval_config';
import { httpHandlerFromKbnClient } from './utils/http_handler_from_kbn_client';
import { createCriteriaEvaluator } from './evaluators/criteria';
import type { DefaultEvaluators } from './types';
import { reportModelScore } from './utils/report_model_score';
import { createConnectorFixture } from './utils/create_connector_fixture';
import { createCorrectnessAnalysisEvaluator } from './evaluators/correctness';
import { EvaluationAnalysisService } from './utils/analysis';
import { EvaluationScoreRepository } from './utils/score_repository';
import { createGroundednessAnalysisEvaluator } from './evaluators/groundedness';

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
    repetitions: number;
    evaluationAnalysisService: EvaluationAnalysisService;
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
    async ({ log, connector, repetitions, esClient }, use) => {
      const config = getPhoenixConfig();

      const inferenceConnector: InferenceConnector = {
        type: connector.actionTypeId as InferenceConnectorType,
        config: connector.config,
        connectorId: connector.id,
        name: connector.name,
        capabilities: {
          contextWindowSize: 32000,
        },
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

      // Temporary: wraps Phoenix client to handle repetitions until native support is added (see https://github.com/Arize-ai/phoenix/issues/3584)
      const repetitionAwarePhoenixClient = {
        ...phoenixClient,
        runExperiment: async (experimentConfig: any, evaluators: any) => {
          const experiments = await Promise.all(
            times(repetitions, () => phoenixClient.runExperiment(experimentConfig, evaluators))
          );

          return repetitions === 1 ? experiments[0] : experiments;
        },
      } as KibanaPhoenixClient;

      await use(repetitionAwarePhoenixClient);

      await reportModelScore({
        phoenixClient,
        esClient,
        log,
        model,
        experiments: await phoenixClient.getRanExperiments(),
        repetitions,
        runId: process.env.TEST_RUN_ID,
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
        correctnessAnalysis: () => {
          return createCorrectnessAnalysisEvaluator({
            inferenceClient: evaluatorInferenceClient,
            log,
          });
        },
        groundednessAnalysis: () => {
          return createGroundednessAnalysisEvaluator({
            inferenceClient: evaluatorInferenceClient,
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
  repetitions: [
    async ({}, use, testInfo) => {
      // Get repetitions from test options (set in playwright config)
      const repetitions = (testInfo.project.use as any).repetitions || 1;
      await use(repetitions);
    },
    { scope: 'worker' },
  ],
  evaluationAnalysisService: [
    async ({ esClient, log }, use) => {
      const scoreRepository = new EvaluationScoreRepository(esClient, log);
      const helper = new EvaluationAnalysisService(scoreRepository, log);
      await use(helper);
    },
    { scope: 'worker' },
  ],
});
