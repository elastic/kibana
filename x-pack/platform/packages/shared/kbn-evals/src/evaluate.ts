/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnectorType, InferenceConnector, Model } from '@kbn/inference-common';
import { getConnectorModel, getConnectorFamily, getConnectorProvider } from '@kbn/inference-common';
import { createRestClient } from '@kbn/inference-plugin/common';
import {
  DATASET_UUID_NAMESPACE,
  EVALS_DATASET_UPSERT_URL,
  EVALS_DATASET_URL,
  GetEvaluationDatasetResponse,
} from '@kbn/evals-common';
import { v5 as uuidv5 } from 'uuid';
import { test as base } from '@kbn/scout';
import { createEsClientForTesting } from '@kbn/test';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { KibanaEvalsClient } from './kibana_evals_executor/client';
import type { EvaluationTestOptions } from './config/create_playwright_eval_config';
import { httpHandlerFromKbnClient } from './utils/http_handler_from_kbn_client';
import { wrapKbnClientWithRetries } from './utils/kbn_client_with_retries';
import {
  getEvaluationsKbnClient,
  checkEvaluationsPluginEnabled,
} from './utils/evaluations_kbn_client';
import { createCriteriaEvaluator } from './evaluators/criteria';
import { mapToEvaluationScoreDocuments, exportEvaluations } from './utils/report_model_score';
import { createDefaultTerminalReporter } from './utils/reporting/evaluation_reporter';
import { createConnectorFixture, resolveConnectorId } from './utils/create_connector_fixture';
import { wrapInferenceClientWithEisConnectorTelemetry } from './utils/wrap_inference_client_with_connector_telemetry';
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
import type {
  DefaultEvaluators,
  EvaluationDataset,
  EvaluationDatasetWithId,
  EvaluationSpecificWorkerFixtures,
  Example,
} from './types';

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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDatasetRouteExample(example: Example) {
  if (example.input != null && !isObjectRecord(example.input)) {
    throw new Error('Dataset example input must be an object when provided');
  }
  if (example.output != null && !isObjectRecord(example.output)) {
    throw new Error('Dataset example output must be an object when provided');
  }
  if (example.metadata != null && !isObjectRecord(example.metadata)) {
    throw new Error('Dataset example metadata must be an object when provided');
  }

  return {
    ...(example.input != null && { input: example.input }),
    ...(example.output != null && { output: example.output }),
    ...(example.metadata != null && { metadata: example.metadata }),
  };
}

/**
 * Test type for evaluations. Loads an inference client and a
 * executor client.
 */

export const evaluate = base.extend<{}, EvaluationSpecificWorkerFixtures>({
  kbnClient: [
    async ({ kbnClient, log }, use) => {
      // Centralize request retries for evals so suites don't need to wrap calls.
      await use(wrapKbnClientWithRetries({ kbnClient, log }));
    },
    { scope: 'worker' },
  ],
  evaluationsKbnClient: [
    async ({ kbnClient, log }, use) => {
      await use(getEvaluationsKbnClient({ kbnClient, log }));
    },
    { scope: 'worker' },
  ],
  evaluationsPluginEnabled: [
    async ({ evaluationsKbnClient, log }, use) => {
      await use(await checkEvaluationsPluginEnabled({ kbnClient: evaluationsKbnClient, log }));
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

      if (resolveConnectorId(predefinedConnector.id) !== connector.id) {
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
      const wrappedInferenceClient = wrapInferenceClientWithEisConnectorTelemetry(inferenceClient);
      log.serviceLoaded?.('inferenceClient');

      await use(wrappedInferenceClient);
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
      {
        log,
        evaluationsKbnClient,
        evaluationsPluginEnabled,
        connector,
        evaluationConnector,
        repetitions,
        evaluationsEsClient,
        reportModelScore,
      },
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

      const scoreRepository = new EvaluationScoreRepository(evaluationsEsClient, log);

      const upsertDataset = evaluationsPluginEnabled
        ? async (dataset: EvaluationDataset) => {
            await evaluationsKbnClient.request({
              path: EVALS_DATASET_UPSERT_URL,
              method: 'POST',
              body: {
                name: dataset.name,
                description: dataset.description,
                examples: dataset.examples.map(toDatasetRouteExample),
              },
              retries: 0,
            });
          }
        : undefined;

      const getDatasetByName = evaluationsPluginEnabled
        ? async (datasetName: string): Promise<EvaluationDatasetWithId | null> => {
            const datasetId = uuidv5(datasetName, DATASET_UUID_NAMESPACE);
            const response = await evaluationsKbnClient.request({
              path: EVALS_DATASET_URL.replace('{datasetId}', encodeURIComponent(datasetId)),
              method: 'GET',
              retries: 0,
            });
            const datasetResponse = GetEvaluationDatasetResponse.parse(response.data);

            return {
              id: datasetResponse.id,
              name: datasetResponse.name,
              description: datasetResponse.description,
              examples: datasetResponse.examples.map(({ id, input, output, metadata }) => ({
                id,
                input,
                output,
                metadata,
              })),
            };
          }
        : undefined;

      const executorClient = new KibanaEvalsClient({
        log,
        model,
        runId: process.env.TEST_RUN_ID!,
        repetitions,
        upsertDataset,
        getDatasetByName,
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
