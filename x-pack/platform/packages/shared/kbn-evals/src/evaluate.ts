/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnectorType, InferenceConnector, Model } from '@kbn/inference-common';
import { getConnectorModel, getConnectorFamily, getConnectorProvider } from '@kbn/inference-common';
import { createRestClient } from '@kbn/inference-plugin/common';
import { test as base } from '@kbn/scout';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { getPhoenixConfig } from './utils/get_phoenix_config';
import { KibanaPhoenixClient } from './kibana_phoenix_client/client';
import type { EvaluationTestOptions } from './config/create_playwright_eval_config';
import { httpHandlerFromKbnClient } from './utils/http_handler_from_kbn_client';
import { createCriteriaEvaluator } from './evaluators/criteria';
import type { DefaultEvaluators, EvaluationSpecificWorkerFixtures } from './types';
import {
  buildEvaluationReport,
  exportEvaluations,
  createDefaultTerminalReporter,
} from './utils/report_model_score';
import { createConnectorFixture } from './utils/create_connector_fixture';
import { createCorrectnessAnalysisEvaluator } from './evaluators/correctness';
import { EvaluationAnalysisService } from './utils/analysis';
import { EvaluationScoreRepository } from './utils/score_repository';
import { createGroundednessAnalysisEvaluator } from './evaluators/groundedness';

/**
 * Test type for evaluations. Loads an inference client and a
 * (Kibana-flavored) Phoenix client.
 */

export const evaluate = base.extend<{}, EvaluationSpecificWorkerFixtures>({
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
      const predefinedConnector = (
        testInfo.project.use as Pick<EvaluationTestOptions, 'evaluationConnector'>
      ).evaluationConnector;

      if (predefinedConnector.id !== connector.id) {
        await createConnectorFixture({ predefinedConnector, fetch, log, use });
      } else {
        // If the evaluation connector is the same as the main connector, reuse it
        await use(connector);
      }
    },
    {
      scope: 'worker',
    },
  ],
  inferenceClient: [
    async ({ log, fetch, connector }, use) => {
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
  reportModelScore: [
    async ({}, use) => {
      // Provide default terminal reporter implementation
      // Consumers can override this fixture to provide custom reporting
      await use(createDefaultTerminalReporter());
    },
    { scope: 'worker' },
  ],
  phoenixClient: [
    async (
      { log, connector, evaluationConnector, repetitions, esClient, reportModelScore },
      use
    ) => {
      const config = getPhoenixConfig();

      function buildModelFromConnector(connectorWithId: AvailableConnectorWithId): Model {
        const inferenceConnector: InferenceConnector = {
          type: connectorWithId.actionTypeId as InferenceConnectorType,
          config: connectorWithId.config,
          connectorId: connectorWithId.id,
          name: connectorWithId.name,
          capabilities: {
            contextWindowSize: 32000,
          },
        };

        const model: Model = {
          family: getConnectorFamily(inferenceConnector),
          provider: getConnectorProvider(inferenceConnector),
          id: getConnectorModel(inferenceConnector),
        };

        return model;
      }

      const model = buildModelFromConnector(connector);
      const evaluatorModel = buildModelFromConnector(evaluationConnector);

      const phoenixClient = new KibanaPhoenixClient({
        config,
        log,
        model,
        runId: process.env.TEST_RUN_ID!,
        repetitions,
      });

      await use(phoenixClient);

      const report = await buildEvaluationReport({
        phoenixClient,
        experiments: await phoenixClient.getRanExperiments(),
        model,
        evaluatorModel,
        repetitions,
        runId: process.env.TEST_RUN_ID,
      });

      try {
        await exportEvaluations(report, esClient, log);
      } catch (error) {
        log.error(
          new Error(
            `Failed to export evaluation results to Elasticsearch for run ID: ${report.runId}.`,
            { cause: error }
          )
        );
        throw error;
      }

      const scoreRepository = new EvaluationScoreRepository(esClient, log);
      await reportModelScore(scoreRepository, report.runId, log);
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
