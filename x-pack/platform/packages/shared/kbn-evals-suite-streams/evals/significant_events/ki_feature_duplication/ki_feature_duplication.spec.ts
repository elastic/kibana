/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { tags } from '@kbn/scout';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { BaseFeature } from '@kbn/streams-schema';
import type { GcsConfig } from '../../../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
  listAvailableSnapshots,
  replaySignificantEventsSnapshot,
} from '../../../src/data_generators/replay';
import { evaluate } from '../../../src/evaluate';
import {
  kiFeatureDuplicationEvaluator,
  createSemanticUniquenessEvaluator,
  createIdConsistencyEvaluator,
} from '../../../src/evaluators/ki_feature_duplication/evaluators';
import {
  getActiveDatasets,
  MANAGED_STREAM_NAME,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
} from '../datasets';

evaluate.describe('KI feature duplication', { tag: tags.serverless.observability.complete }, () => {
  const activeDatasets = getActiveDatasets();
  const kiFeatureDuplicationRuns = activeDatasets.flatMap((dataset) =>
    dataset.kiFeatureDuplication.map((scenario) => ({ dataset, scenario }))
  );
  const availableSnapshotsBySource = new Map<string, Set<string>>();

  evaluate.beforeAll(async ({ esClient, log }) => {
    const uniqueCatalogSources = new Map<string, GcsConfig>();
    for (const { dataset, scenario } of kiFeatureDuplicationRuns) {
      const source = resolveScenarioSnapshotSource({
        scenarioId: scenario.input.scenario_id,
        datasetGcs: dataset.gcs,
        snapshotSource: scenario.snapshot_source,
      });
      uniqueCatalogSources.set(snapshotCatalogKey(source.gcs), source.gcs);
    }

    for (const [catalogSourceKey, gcs] of uniqueCatalogSources.entries()) {
      const availableSnapshots = await listAvailableSnapshots(esClient, log, gcs);
      availableSnapshotsBySource.set(catalogSourceKey, new Set(availableSnapshots));
    }
  });

  for (const { dataset, scenario } of kiFeatureDuplicationRuns) {
    evaluate.describe(`${dataset.id} / ${scenario.input.scenario_id}`, () => {
      evaluate.beforeAll(async ({ esClient, log }) => {
        const source = resolveScenarioSnapshotSource({
          scenarioId: scenario.input.scenario_id,
          datasetGcs: dataset.gcs,
          snapshotSource: scenario.snapshot_source,
        });

        const availableSnapshots =
          availableSnapshotsBySource.get(snapshotCatalogKey(source.gcs)) ?? new Set();

        if (!availableSnapshots.has(source.snapshotName)) {
          log.info(
            `Snapshot "${source.snapshotName}" not found in run "${SIGEVENTS_SNAPSHOT_RUN}" ` +
              `(source: ${source.gcs.bucket}/${source.gcs.basePathPrefix}) - skipping`
          );
          evaluate.skip();
          return;
        }

        await cleanSignificantEventsDataStreams(esClient, log);
        await replaySignificantEventsSnapshot(esClient, log, source.snapshotName, source.gcs);
        await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });
      });

      evaluate(
        'KI feature duplication',
        async ({
          esClient,
          inferenceClient,
          evaluationConnector,
          evaluators,
          logger,
          executorClient,
          traceEsClient,
          log,
        }) => {
          const evaluatorInferenceClient = inferenceClient.bindTo({
            connectorId: evaluationConnector.id,
          });

          await executorClient.runExperiment(
            {
              dataset: {
                name: `sigevents: KI feature duplication: ${scenario.input.scenario_id} (${dataset.id})`,
                description: `[${dataset.id}] KI feature duplication across ${scenario.input.runs} runs on ${scenario.input.scenario_id}`,
                examples: [
                  {
                    input: {
                      stream_name: MANAGED_STREAM_NAME,
                      runs: scenario.input.runs,
                      sample_document_count: scenario.input.sample_document_count,
                    },
                  },
                ],
              },
              concurrency: 1,
              task: async ({
                input,
              }: {
                input: {
                  stream_name: string;
                  runs: number;
                  sample_document_count: number;
                };
              }) => {
                const outputs: Array<{ features: BaseFeature[] }> = [];

                // Each run samples a different random subset of documents from the replayed
                // snapshot. This measures whether the LLM identifies consistent features
                // regardless of which documents it sees, not just whether it's deterministic
                // on identical input.
                for (let i = 0; i < input.runs; i++) {
                  const { hits: sampleDocuments } = await esClient.search<Record<string, unknown>>({
                    index: MANAGED_STREAM_SEARCH_PATTERN,
                    size: input.sample_document_count,
                    query: {
                      // random_score with seed=i gives a different but deterministic
                      // ordering per run — a failing run can be replayed by re-running
                      // with the same run index, while each run still samples a distinct
                      // subset of documents
                      function_score: {
                        query: { match_all: {} },
                        functions: [{ random_score: { seed: i } }],
                      },
                    },
                    sort: [{ _score: { order: 'desc' } }],
                  });

                  const { features } = await identifyFeatures({
                    streamName: input.stream_name,
                    sampleDocuments: sampleDocuments.hits,
                    systemPrompt: featuresPrompt,
                    inferenceClient,
                    logger,
                    signal: new AbortController().signal,
                  });
                  outputs.push({ features });
                }

                return { runs: outputs, traceId: getCurrentTraceId() };
              },
            },
            [
              kiFeatureDuplicationEvaluator,
              createSemanticUniquenessEvaluator({ inferenceClient: evaluatorInferenceClient }),
              createIdConsistencyEvaluator({ inferenceClient: evaluatorInferenceClient }),
              evaluators.traceBasedEvaluators.inputTokens,
              evaluators.traceBasedEvaluators.outputTokens,
              evaluators.traceBasedEvaluators.cachedTokens,
              createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
            ]
          );
        }
      );

      evaluate.afterAll(async ({ esClient, log }) => {
        log.debug('Cleaning replayed logs and index template');
        await cleanSignificantEventsDataStreams(esClient, log);
      });
    });
  }
});
