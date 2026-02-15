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
import { createEsClientForTesting } from '@kbn/test';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { KibanaEvalsClient } from './kibana_evals_executor/client';
import { KibanaPhoenixClient } from './kibana_phoenix_client/client';
import type { EvaluationTestOptions } from './config/create_playwright_eval_config';
import { httpHandlerFromKbnClient } from './utils/http_handler_from_kbn_client';
import { wrapKbnClientWithRetries } from './utils/kbn_client_with_retries';
import { createCriteriaEvaluator } from './evaluators/criteria';
import type { DefaultEvaluators, EvaluationSpecificWorkerFixtures } from './types';
import { mapToEvaluationScoreDocuments, exportEvaluations } from './utils/report_model_score';
import { getPhoenixConfig } from './utils/get_phoenix_config';
import { createDefaultTerminalReporter } from './utils/reporting/evaluation_reporter';
import { createConnectorFixture, getConnectorIdAsUuid } from './utils/create_connector_fixture';
import { createCorrectnessAnalysisEvaluator } from './evaluators/correctness';
import { EvaluationScoreRepository } from './utils/score_repository';
import { createGroundednessAnalysisEvaluator } from './evaluators/groundedness';
import {
  createCachedTokensEvaluator,
  createInputTokensEvaluator,
  createLatencyEvaluator,
  createOutputTokensEvaluator,
  createToolCallsEvaluator,
} from './evaluators/trace_based';
import { ESQL_EQUIVALENCE_EVALUATOR_NAME } from './evaluators/esql';

function isElasticCloudEsUrl(esUrl: string): boolean {
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(esUrl) ? esUrl : `https://${esUrl}`;
    const hostname = new URL(withProtocol).hostname.replace(/\.$/, '').toLowerCase();
    return (
      hostname === 'elastic-cloud.com' ||
      hostname.endsWith('.elastic-cloud.com') ||
      hostname.endsWith('elastic.cloud')
    );
  } catch {
    return false;
  }
}

/**
 * Test type for evaluations. Loads an inference client and a
 * executor client (defaults to in-Kibana; Phoenix-backed via `KBN_EVALS_EXECUTOR=phoenix`).
 */

export const evaluate = base.extend<{}, EvaluationSpecificWorkerFixtures>({
  kbnClient: [
    async ({ kbnClient, log }, use) => {
      // Centralize request retries for evals so suites don't need to wrap calls.
      await use(wrapKbnClientWithRetries({ kbnClient, log }));
    },
    { scope: 'worker' },
  ],
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

      const evaluationConnectorUuid = getConnectorIdAsUuid(predefinedConnector.id);

      if (evaluationConnectorUuid !== connector.id) {
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

  reportDisplayOptions: [
    async ({ evaluators }, use) => {
      const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
        evaluators.traceBasedEvaluators;

      await use({
        evaluatorDisplayOptions: new Map([
          [
            inputTokens.name,
            { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
          ],
          [
            outputTokens.name,
            { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
          ],
          [
            cachedTokens.name,
            { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
          ],
          [toolCalls.name, { decimalPlaces: 1, statsToInclude: ['mean', 'median', 'min', 'max'] }],
          [
            latency.name,
            { unitSuffix: 's', statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
          ],
          [
            'Precision@K',
            { decimalPlaces: 2, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
          ],
          [
            'F1@K',
            { decimalPlaces: 2, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
          ],
          [
            'Recall@K',
            { decimalPlaces: 2, statsToInclude: ['mean', 'median', 'stdDev', 'min', 'max'] },
          ],
          [
            ESQL_EQUIVALENCE_EVALUATOR_NAME,
            { decimalPlaces: 2, statsToInclude: ['mean', 'stdDev'] },
          ],
        ]),
        evaluatorDisplayGroups: [
          {
            evaluatorNames: [inputTokens.name, outputTokens.name, cachedTokens.name],
            combinedColumnName: 'Tokens',
          },
          {
            evaluatorNames: ['Precision@K', 'F1@K', 'Recall@K'],
            combinedColumnName: 'RAG',
          },
        ],
      });
    },
    { scope: 'worker' },
  ],
  reportModelScore: [
    async ({ reportDisplayOptions }, use) => {
      await use(createDefaultTerminalReporter({ reportDisplayOptions }));
    },
    { scope: 'worker' },
  ],
  executorClient: [
    async (
      { log, connector, evaluationConnector, repetitions, evaluationsEsClient, reportModelScore },
      use
    ) => {
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

      const usePhoenixExecutor = process.env.KBN_EVALS_EXECUTOR === 'phoenix';

      const scoreRepository = new EvaluationScoreRepository(evaluationsEsClient, log);

      const executorClient = usePhoenixExecutor
        ? new KibanaPhoenixClient({
            config: getPhoenixConfig(),
            log,
            model,
            runId: process.env.TEST_RUN_ID!,
            repetitions,
          })
        : new KibanaEvalsClient({
            log,
            model,
            runId: process.env.TEST_RUN_ID!,
            repetitions,
          });

      const currentRunId = process.env.TEST_RUN_ID;
      await use(executorClient);

      if (!currentRunId) {
        throw new Error(
          'runId must be provided via TEST_RUN_ID environment variable before exporting scores'
        );
      }

      const experiments = await executorClient.getRanExperiments();
      const documents = await mapToEvaluationScoreDocuments({
        experiments,
        taskModel: model,
        evaluatorModel,
        runId: currentRunId,
        totalRepetitions: repetitions,
      });

      try {
        await exportEvaluations(documents, scoreRepository, log);
      } catch (error) {
        log.error(
          new Error(
            `Failed to export evaluation results to Elasticsearch for run ID: ${currentRunId}.`,
            { cause: error }
          )
        );
        throw error;
      }

      await reportModelScore(scoreRepository, currentRunId, log, {
        taskModelId: model.id,
        suiteId: process.env.EVAL_SUITE_ID,
      });
    },
    {
      scope: 'worker',
    },
  ],
  phoenixClient: [
    async ({ executorClient }, use) => {
      await use(executorClient);
    },
    { scope: 'worker' },
  ],
  evaluators: [
    async ({ log, inferenceClient, evaluationConnector, traceEsClient }, use) => {
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
        traceBasedEvaluators: {
          inputTokens: createInputTokensEvaluator({
            traceEsClient,
            log,
          }),
          outputTokens: createOutputTokensEvaluator({
            traceEsClient,
            log,
          }),
          cachedTokens: createCachedTokensEvaluator({
            traceEsClient,
            log,
          }),
          toolCalls: createToolCallsEvaluator({
            traceEsClient,
            log,
          }),
          latency: createLatencyEvaluator({
            traceEsClient,
            log,
          }),
        },
      };
      await use(evaluators);
    },
    {
      scope: 'worker',
    },
  ],
  traceEsClient: [
    async ({ esClient }, use) => {
      const esUrl = process.env.TRACING_ES_URL;
      const apiKey = process.env.TRACING_ES_API_KEY;
      const traceEsClient = esUrl
        ? createEsClientForTesting({
            esUrl,
            isCloud: isElasticCloudEsUrl(esUrl),
            ...(apiKey ? { auth: { apiKey } } : {}),
          })
        : esClient;
      await use(traceEsClient);
    },
    { scope: 'worker' },
  ],
  evaluationsEsClient: [
    async ({ esClient }, use) => {
      const esUrl = process.env.EVALUATIONS_ES_URL;
      const apiKey = process.env.EVALUATIONS_ES_API_KEY;
      const evaluationsEsClient = esUrl
        ? createEsClientForTesting({
            esUrl,
            isCloud: isElasticCloudEsUrl(esUrl),
            ...(apiKey ? { auth: { apiKey } } : {}),
          })
        : esClient;
      await use(evaluationsEsClient);
    },
    { scope: 'worker' },
  ],
  repetitions: [
    async ({}, use, testInfo) => {
      // Get repetitions from test options (set in playwright config)
      const repetitions = (testInfo.project.use as any).repetitions || 1;
      await use(repetitions);
    },
    { scope: 'worker' },
  ],
});
