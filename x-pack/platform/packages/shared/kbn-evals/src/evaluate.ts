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

/**
 * Test type for evaluations. Loads an inference client and a
 * executor client (defaults to in-Kibana; Phoenix-backed via `KBN_EVALS_EXECUTOR=phoenix`).
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
  phoenixClient: [
    async (
      { log, connector, evaluationConnector, repetitions, esClient, reportModelScore },
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

      const evaluationsEsClient = process.env.EVALUATIONS_ES_URL
        ? createEsClientForTesting({
          esUrl: process.env.EVALUATIONS_ES_URL,
        })
        : esClient;

      const experiments = await executorClient.getRanExperiments();
      const documents = await mapToEvaluationScoreDocuments({
        experiments,
        taskModel: model,
        evaluatorModel,
        runId: currentRunId,
        totalRepetitions: repetitions,
      });
      const scoreRepository = new EvaluationScoreRepository(evaluationsEsClient, log);

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

      await reportModelScore(scoreRepository, currentRunId, log);
    },
    {
      scope: 'worker',
    },
  ],
  executorClient: [
    async ({ phoenixClient, log }, use, testInfo) => {
      const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>;
      const debugOnFailureEnabled = env.EVALS_DEBUG_ON_FAILURE !== 'false';

      function safeStringify(value: unknown, maxChars: number): string {
        try {
          const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
          return str.length > maxChars ? `${str.slice(0, maxChars)}…(truncated)` : str;
        } catch {
          return String(value);
        }
      }

      function extractActualText(output: unknown): string {
        const out = output as any;
        const messages = Array.isArray(out?.messages) ? out.messages : undefined;
        if (messages && messages.length > 0) {
          const last = messages[messages.length - 1];
          if (typeof last?.message === 'string') return last.message;
        }
        if (typeof out?.response === 'string') return out.response;
        if (typeof out?.text === 'string') return out.text;
        return safeStringify(output, 4000);
      }

      const wrapped = {
        ...phoenixClient,
        runExperiment: async (...args: Parameters<typeof phoenixClient.runExperiment>) => {
          const experiment = await phoenixClient.runExperiment(...args);

          if (!debugOnFailureEnabled) {
            return experiment;
          }

          const failing = experiment.evaluationRuns
            .map((e) => {
              const score = e.result?.score;
              if (typeof score !== 'number' || Number.isNaN(score) || score >= 1) return undefined;

              const runKey = e.runKey;
              const run = runKey ? experiment.runs?.[runKey] : undefined;
              const expected = run?.expected ?? null;
              const actual = run ? extractActualText(run.output) : undefined;

              return {
                dataset: experiment.datasetName,
                evaluator: e.name,
                score,
                runKey,
                exampleIndex: e.exampleIndex ?? run?.exampleIndex,
                repetition: e.repetition ?? run?.repetition,
                input: run?.input,
                expected: safeStringify(expected, 4000),
                actual: actual ? safeStringify(actual, 4000) : undefined,
                metadata: run?.metadata,
              };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x));

          if (failing.length === 0) {
            return experiment;
          }

          // Console logs (concise, one per failing evaluator run)
          for (const f of failing.slice(0, 25)) {
            log.warning(
              [
                `Evals failure (score=${f.score})`,
                `- dataset: ${f.dataset}`,
                `- evaluator: ${f.evaluator}`,
                `- exampleIndex: ${String(f.exampleIndex)}`,
                `- repetition: ${String(f.repetition)}`,
                `- expected: ${f.expected}`,
                `- actual: ${f.actual ?? '(no run linkage available)'}`,
              ].join('\n')
            );
          }

          // Playwright attachment (JSON) for easy debugging
          const attachment = {
            dataset: experiment.datasetName,
            experimentId: experiment.id,
            totalFailures: failing.length,
            shownInConsole: Math.min(25, failing.length),
            failures: failing,
          };

          try {
            await testInfo.attach('eval-failures.json', {
              body: JSON.stringify(attachment, null, 2),
              contentType: 'application/json',
            });
          } catch (err) {
            log.warning(
              `Failed to attach eval-failures.json: ${err instanceof Error ? err.message : String(err)}`
            );
          }

          return experiment;
        },
      };

      await use(wrapped);
    },
    // Must be test-scoped so attachments land on the right failing test
    { scope: 'test' },
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
      const traceEsClient = process.env.TRACING_ES_URL
        ? createEsClientForTesting({
          esUrl: process.env.TRACING_ES_URL,
        })
        : esClient;
      await use(traceEsClient);
    },
    { scope: 'worker' },
  ],
  repetitions: [
    async ({ }, use, testInfo) => {
      // Get repetitions from test options (set in playwright config)
      const repetitions = (testInfo.project.use as any).repetitions || 1;
      await use(repetitions);
    },
    { scope: 'worker' },
  ],
  evaluationAnalysisService: [
    async ({ esClient, log }, use) => {
      const evaluationsEsClient = process.env.EVALUATIONS_ES_URL
        ? createEsClientForTesting({
          esUrl: process.env.EVALUATIONS_ES_URL,
        })
        : esClient;
      const scoreRepository = new EvaluationScoreRepository(evaluationsEsClient, log);
      const helper = new EvaluationAnalysisService(scoreRepository, log);
      await use(helper);
    },
    { scope: 'worker' },
  ],
});
