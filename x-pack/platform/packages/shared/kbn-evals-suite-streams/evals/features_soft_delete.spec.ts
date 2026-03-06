/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
import { getSampleDocuments } from '@kbn/ai-tools';
import { tags } from '@kbn/scout';
import { isDuplicateFeature, type BaseFeature } from '@kbn/streams-schema';
import { identifyFeatures, type DeletedFeatureSummary, type IgnoredFeature } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { sampleSize as lodashSampleSize } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import { evaluate } from '../src/evaluate';
import {
  FEATURES_SOFT_DELETE_DATASETS,
  type FeaturesSoftDeleteEvaluationDataset,
} from './features_soft_delete_datasets';
import { indexSynthtraceScenario } from './synthtrace_helpers';
import { SoftDeleteCompliancePrompt } from './features_soft_delete_evaluator_prompt';

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Streams features soft delete', () => {
  const from = kbnDatemath.parse('now-10m')!;
  const to = kbnDatemath.parse('now')!;

  interface SoftDeleteTaskOutput {
    initialFeatures: BaseFeature[];
    deletedFeatures: DeletedFeatureSummary[];
    followUpRuns: Array<{
      features: BaseFeature[];
      rawFeatures: BaseFeature[];
      ignoredFeatures: IgnoredFeature[];
    }>;
  }

  async function fetchSampleDocuments({
    esClient,
    streamName,
    sampleSize,
    logger,
  }: {
    esClient: ElasticsearchClient;
    streamName: string;
    sampleSize: number;
    logger: Logger;
  }) {
    const { hits: sampleDocuments } = await getSampleDocuments({
      esClient,
      index: streamName,
      size: sampleSize,
      start: from.valueOf(),
      end: to.valueOf(),
    });

    logger.info(`Fetched ${sampleDocuments.length} sample documents from ${streamName}`);

    if (sampleDocuments.length === 0) {
      throw new Error(
        `No sample documents found in ${streamName} for the given time range. Ensure data has been indexed before running the experiment.`
      );
    }

    return sampleDocuments;
  }

  async function runSoftDeleteExperiment({
    esClient,
    streamName,
    deleteCount,
    followUpRuns,
    inferenceClient,
    logger,
    sampleSize,
  }: {
    esClient: ElasticsearchClient;
    streamName: string;
    deleteCount: number;
    followUpRuns: number;
    inferenceClient: BoundInferenceClient;
    logger: Logger;
    sampleSize: number;
  }): Promise<SoftDeleteTaskOutput> {
    const initialSampleDocuments = await fetchSampleDocuments({
      esClient,
      streamName,
      sampleSize,
      logger,
    });

    const { features: initialFeatures } = await identifyFeatures({
      streamName,
      sampleDocuments: initialSampleDocuments,
      systemPrompt: featuresPrompt,
      inferenceClient,
      logger,
      signal: new AbortController().signal,
    });

    logger.info(`Initial identification returned ${initialFeatures.length} features`);

    if (initialFeatures.length < deleteCount) {
      logger.info(
        `Not enough features identified (${initialFeatures.length}) to delete ${deleteCount}, skipping follow-up runs`
      );
      return {
        initialFeatures,
        deletedFeatures: [],
        followUpRuns: [],
      };
    }

    const featuresToDelete = lodashSampleSize(initialFeatures, deleteCount);
    const deletedFeatures: DeletedFeatureSummary[] = featuresToDelete.map(
      ({ id, type, subtype, title, description, properties }) => ({
        id,
        type,
        subtype,
        title,
        description,
        properties,
      })
    );

    const outputs: SoftDeleteTaskOutput['followUpRuns'] = [];

    for (let i = 0; i < followUpRuns; i++) {
      const sampleDocuments = await fetchSampleDocuments({
        esClient,
        streamName,
        sampleSize,
        logger,
      });

      const { features: rawFeatures, ignoredFeatures } = await identifyFeatures({
        streamName,
        sampleDocuments,
        deletedFeatures,
        systemPrompt: featuresPrompt,
        inferenceClient,
        logger,
        signal: new AbortController().signal,
      });

      const features = rawFeatures.filter(
        (feature) => !deletedFeatures.some((deleted) => isDuplicateFeature(feature, deleted))
      );

      outputs.push({ features, rawFeatures, ignoredFeatures });
    }

    return {
      initialFeatures,
      deletedFeatures,
      followUpRuns: outputs,
    };
  }

  function createSoftDeleteSemanticEvaluator({
    inferenceClient,
  }: {
    inferenceClient: BoundInferenceClient;
  }) {
    return {
      name: 'llm_soft_delete_compliance',
      kind: 'LLM' as const,
      evaluate: async ({ output }: { output: SoftDeleteTaskOutput }) => {
        const { initialFeatures, deletedFeatures, followUpRuns } = output;

        if (deletedFeatures.length === 0) {
          return {
            score: undefined,
            explanation:
              'Inconclusive: initial identification did not return enough features to fulfill the requested deletion count',
          };
        }

        if (followUpRuns.length === 0) {
          return { score: 1, explanation: 'Nothing to evaluate' };
        }

        const allFollowUpFeatures = followUpRuns.flatMap((run) => run.features);

        if (allFollowUpFeatures.length === 0) {
          const allDeleted = initialFeatures.length === deletedFeatures.length;
          const filteringPerRun = followUpRuns.map((run) => ({
            raw_features: run.rawFeatures.length,
            llm_ignored: run.ignoredFeatures.length,
            code_filtered: run.rawFeatures.length - run.features.length,
          }));
          return {
            score: allDeleted ? 1 : 0,
            explanation: allDeleted
              ? 'All initial features were deleted, no features expected in follow-up runs'
              : `Follow-up runs returned 0 features, but only ${deletedFeatures.length} of ${initialFeatures.length} were deleted — the remaining features should have been preserved`,
            metadata: {
              initial_features_count: initialFeatures.length,
              deleted_count: deletedFeatures.length,
              follow_up_runs: followUpRuns.length,
              filtering_per_run: filteringPerRun,
            },
          };
        }

        const followUpRunsGrouped = followUpRuns.map((run, runIndex) => ({
          run_index: runIndex,
          features: run.features.map(({ id, type, subtype, title, properties, description }) => ({
            id,
            type,
            subtype,
            title,
            properties,
            description,
          })),
        }));

        const response = await inferenceClient.prompt({
          prompt: SoftDeleteCompliancePrompt,
          input: {
            deleted_features: JSON.stringify(deletedFeatures),
            follow_up_runs: JSON.stringify(followUpRunsGrouped),
          },
          toolChoice: {
            function: 'analyze',
          } as ToolChoice,
        });

        const toolCall = response.toolCalls[0];
        if (!toolCall) {
          throw new Error('No tool call found in LLM response');
        }

        const { violations, explanation } = toolCall.function.arguments;

        const perRunScores = followUpRuns.map((run, runIndex) => {
          const runViolationCount = violations.filter((v) => v.run_index === runIndex).length;
          const llmIgnored = run.ignoredFeatures.length;
          const codeFiltered = run.rawFeatures.length - run.features.length;
          return {
            score: Math.max(0, 1 - runViolationCount / deletedFeatures.length),
            violations: runViolationCount,
            llm_ignored: llmIgnored,
            code_filtered: codeFiltered,
          };
        });

        const score = perRunScores.reduce((sum, r) => sum + r.score, 0) / perRunScores.length;

        const totalLlmIgnored = perRunScores.reduce((sum, r) => sum + r.llm_ignored, 0);
        const totalCodeFiltered = perRunScores.reduce((sum, r) => sum + r.code_filtered, 0);

        return {
          score,
          explanation,
          metadata: {
            initial_features_count: initialFeatures.length,
            deleted_count: deletedFeatures.length,
            follow_up_runs: followUpRuns.length,
            follow_up_features_count: allFollowUpFeatures.length,
            violations_count: violations.length,
            per_run_scores: perRunScores,
            violations,
            llm_ignored_count: totalLlmIgnored,
            code_filtered_count: totalCodeFiltered,
          },
        };
      },
    };
  }

  FEATURES_SOFT_DELETE_DATASETS.forEach((dataset) => {
    evaluate.describe(dataset.name, { tag: tags.stateful.classic }, () => {
      evaluate.beforeAll(async ({ apiServices }) => {
        await apiServices.streams.enable();
      });

      evaluate.afterAll(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices
          .deleteDataStream({ name: dataset.input.stream_name })
          .catch(() => {});
      });

      evaluate(
        dataset.name,
        async ({
          config,
          esClient,
          inferenceClient,
          evaluationConnector,
          logger,
          executorClient,
        }) => {
          const evaluatorInferenceClient = inferenceClient.bindTo({
            connectorId: evaluationConnector.id,
          });

          await indexSynthtraceScenario({
            scenario: dataset.input.scenario,
            scenarioOpts: dataset.input.scenarioOpts,
            config,
            from,
            to,
          });

          await esClient.indices.refresh({ index: dataset.input.stream_name });

          await executorClient.runExperiment(
            {
              dataset: {
                name: dataset.name,
                description: dataset.description,
                examples: [{ input: dataset.input }],
              },
              task: async ({
                input,
              }: {
                input: Pick<
                  FeaturesSoftDeleteEvaluationDataset['input'],
                  'stream_name' | 'delete_count' | 'follow_up_runs' | 'sample_document_count'
                >;
              }) => {
                return runSoftDeleteExperiment({
                  esClient,
                  streamName: input.stream_name,
                  deleteCount: input.delete_count,
                  followUpRuns: input.follow_up_runs,
                  inferenceClient,
                  logger,
                  sampleSize: input.sample_document_count,
                });
              },
            },
            [createSoftDeleteSemanticEvaluator({ inferenceClient: evaluatorInferenceClient })]
          );
        }
      );
    });
  });
});
