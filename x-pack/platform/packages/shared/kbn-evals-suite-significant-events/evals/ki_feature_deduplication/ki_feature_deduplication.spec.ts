/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import {
  EMPTY_TOKENS,
  identifyFeatures,
  sumTokens,
  toPreviouslyIdentifiedFeature,
  type SearchSimilarFeaturesArguments,
  type SimilarFeatureHit,
} from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { tags } from '@kbn/scout';
import {
  createChatCallsEvaluator,
  createSpanLatencyEvaluator,
  getCurrentTraceId,
  type EvaluationDataset,
  type Evaluator,
  type Example,
} from '@kbn/evals';
import { FeatureAccumulator, type BaseFeature, mergeFeature } from '@kbn/significant-events-schema';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
  replaySignificantEventsSnapshot,
} from '../../src/data_generators/replay';
import { evaluate } from '../../src/evaluate';
import {
  createSemanticUniquenessEvaluator,
  createMergeCorrectnessEvaluator,
  createIdReuseEvaluator,
} from '../../src/evaluators/ki_feature_deduplication/evaluators';
import { createReportedTokenEvaluators } from '../../src/evaluators/reported_tokens';
import {
  getActiveDatasets,
  MANAGED_STREAM_NAME,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  type KIFeatureExtractionScenario,
  type KIFeatureDeduplicationScenario,
} from '../../src/datasets';
import { buildAvailableSnapshotsBySource } from '../shared';
import { collectSampleDocuments } from '../ki_feature_extraction/collect_sample_documents';

interface AvailableDeduplicationScenario {
  scenario: KIFeatureDeduplicationScenario;
  extractionScenario: KIFeatureExtractionScenario;
}

interface DedupContextInput extends Record<string, unknown> {
  sampleDocuments: Array<SearchHit<Record<string, string>>>;
  knownFeatureIds: string;
  similarFeature?: SimilarFeatureHit;
}

interface DedupContextExpected {
  expectedId: string;
  expectEntitySearch: boolean;
}

type DedupContextExample = Example<DedupContextInput, DedupContextExpected>;

interface DedupContextOutput {
  features: BaseFeature[];
  searchCalls: SearchSimilarFeaturesArguments[];
}

const checkoutDocument: SearchHit<Record<string, string>> = {
  _id: 'checkout-doc',
  _index: 'logs-synthetic',
  _source: {
    'service.name': 'checkout-api',
    'event.dataset': 'checkout-api.logs',
    message: 'checkout-api handled GET /checkout',
  },
};

const dedupContextDataset: EvaluationDataset<DedupContextExample> = {
  name: 'sigevents: KI feature deduplication context contracts',
  description: 'Known feature id and semantic duplicate search behavior',
  examples: [
    {
      id: 'known-feature-id-reuse',
      input: {
        sampleDocuments: [checkoutDocument],
        // Deliberately not derivable from `service.name`, so reusing it is observable.
        knownFeatureIds: 'entity: checkout-api-svc-7',
      },
      output: {
        expectedId: 'checkout-api-svc-7',
        expectEntitySearch: false,
      },
    },
    {
      id: 'semantic-search-id-reuse',
      input: {
        sampleDocuments: [checkoutDocument],
        knownFeatureIds: '',
        similarFeature: {
          id: 'checkout-service',
          title: 'Checkout API',
          description: 'Checkout API service handling checkout requests',
          confidence: 0.99,
        },
      },
      output: {
        expectedId: 'checkout-service',
        expectEntitySearch: true,
      },
    },
  ],
};

const dedupContextContractEvaluator: Evaluator<DedupContextExample, DedupContextOutput> = {
  name: 'dedup_context_contract',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    if (!expected) {
      return { score: 0, explanation: 'Expected deduplication contract is missing' };
    }

    // Membership alone would pass when the model reuses the id AND mints a duplicate
    // alongside it, which is the deduplication failure these cases exist to catch.
    const entityFeatures = output.features.filter(({ type }) => type === 'entity');
    const reusedExpectedId =
      entityFeatures.length === 1 && entityFeatures[0].id === expected.expectedId;
    const entitySearchCalls = output.searchCalls.filter(({ type }) => type === 'entity');
    const searchBehaviorMatches = expected.expectEntitySearch
      ? entitySearchCalls.length > 0
      : entitySearchCalls.length === 0;

    return {
      score: reusedExpectedId && searchBehaviorMatches ? 1 : 0,
      explanation: [
        reusedExpectedId
          ? `Reused expected id "${expected.expectedId}"`
          : entityFeatures.length === 1
          ? `Emitted entity id "${entityFeatures[0].id}" instead of "${expected.expectedId}"`
          : `Expected exactly 1 entity feature with id "${expected.expectedId}", got ${
              entityFeatures.length
            }: ${entityFeatures.map(({ id }) => id).join(', ')}`,
        expected.expectEntitySearch
          ? `Entity semantic search calls: ${entitySearchCalls.length}`
          : `Unexpected entity semantic search calls: ${entitySearchCalls.length}`,
      ].join('; '),
      metadata: {
        emitted_ids: output.features.map(({ id }) => id),
        entity_search_calls: entitySearchCalls,
      },
    };
  },
};

evaluate.describe(
  'KI feature deduplication',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, log }) => {
      const snapshots = await buildAvailableSnapshotsBySource(
        activeDatasets,
        (dataset) => dataset.kiFeatureDeduplication,
        esClient,
        log
      );
      snapshots.forEach((v, k) => availableSnapshotsBySource.set(k, v));
    });

    for (const dataset of activeDatasets) {
      evaluate.describe(dataset.id, () => {
        const availableScenarios: AvailableDeduplicationScenario[] = [];
        const snapshotSources = new Map<string, { snapshotName: string; gcs: GcsConfig }>();

        evaluate.beforeAll(async ({ log }) => {
          for (const scenario of dataset.kiFeatureDeduplication) {
            const extractionScenario = dataset.kiFeatureExtraction.find(
              (s) => s.input.scenario_id === scenario.input.scenario_id
            );
            if (!extractionScenario) {
              throw new Error(
                `KI feature deduplication scenario "${scenario.input.scenario_id}" in dataset "${dataset.id}" ` +
                  `has no matching KI feature extraction scenario (needed for sample document collection)`
              );
            }

            const source = resolveScenarioSnapshotSource({
              scenarioId: scenario.input.scenario_id,
              datasetGcs: dataset.gcs,
              snapshotSource: scenario.snapshot_source,
            });

            const available =
              availableSnapshotsBySource.get(snapshotCatalogKey(source.gcs)) ?? new Set();

            if (!available.has(source.snapshotName)) {
              log.info(
                `Snapshot "${source.snapshotName}" not found in run "${SIGEVENTS_SNAPSHOT_RUN}" ` +
                  `(source: ${source.gcs.bucket}/${source.gcs.basePathPrefix}) - skipping`
              );
              continue;
            }

            availableScenarios.push({ scenario, extractionScenario });
            snapshotSources.set(scenario.input.scenario_id, source);
          }

          if (availableScenarios.length === 0) {
            log.info(`No scenarios available for dataset "${dataset.id}" - skipping`);
            evaluate.skip();
          }
        });

        evaluate(
          'KI feature deduplication',
          async ({
            esClient,
            inferenceClient,
            evaluators,
            evaluationConnector,
            logger,
            executorClient,
            traceEsClient,
            log,
          }) => {
            const evaluatorInferenceClient = inferenceClient.bindTo({
              connectorId: evaluationConnector.id,
            });

            const extractionScenariosByScenarioId = new Map(
              availableScenarios.map(({ scenario, extractionScenario }) => [
                scenario.input.scenario_id,
                extractionScenario,
              ])
            );

            let lastReplayedSnapshot: string | undefined;

            await executorClient.runExperiment(
              {
                datasets: [
                  {
                    name: `sigevents: KI feature deduplication (${dataset.id})`,
                    description: `[${dataset.id}] KI feature deduplication across scenarios`,
                    examples: availableScenarios.map(({ scenario }) => ({
                      id: scenario.input.scenario_id,
                      input: {
                        scenario_id: scenario.input.scenario_id,
                        stream_name: MANAGED_STREAM_NAME,
                        iterations: scenario.input.iterations,
                      },
                    })),
                  },
                ],
                concurrency: 1,
                task: async ({
                  input,
                }: {
                  input: {
                    scenario_id: string;
                    stream_name: string;
                    iterations: number;
                  };
                }) => {
                  const source = snapshotSources.get(input.scenario_id);
                  if (!source) {
                    throw new Error(`No snapshot source found for scenario "${input.scenario_id}"`);
                  }
                  if (source.snapshotName !== lastReplayedSnapshot) {
                    await cleanSignificantEventsDataStreams(esClient, log);
                    await replaySignificantEventsSnapshot(
                      esClient,
                      log,
                      source.snapshotName,
                      source.gcs
                    );
                    await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });
                    lastReplayedSnapshot = source.snapshotName;
                  }

                  const extractionScenario = extractionScenariosByScenarioId.get(input.scenario_id);
                  if (!extractionScenario) {
                    throw new Error(
                      `No extraction scenario found for scenario "${input.scenario_id}"`
                    );
                  }

                  const iterations: Array<{
                    features: BaseFeature[];
                    previousFeatureCount: number;
                  }> = [];
                  const accumulated = new FeatureAccumulator();
                  const mergeEvents = [];
                  const fingerprintOnlyMergeEvents = [];
                  // Deduplication identifies once per iteration, so provider
                  // token counts are summed to match the trace-derived totals.
                  let tokensUsed = EMPTY_TOKENS;

                  for (let i = 0; i < input.iterations; i++) {
                    const sampleDocuments = await collectSampleDocuments({
                      esClient,
                      scenario: extractionScenario,
                      log,
                    });

                    const previouslyIdentifiedFeatures = accumulated
                      .getAll()
                      .map(toPreviouslyIdentifiedFeature);

                    const { features: identifiedFeatures, tokensUsed: iterationTokens } =
                      await identifyFeatures({
                        streamName: input.stream_name,
                        sampleDocuments,
                        systemPrompt: featuresPrompt,
                        inferenceClient,
                        logger,
                        signal: new AbortController().signal,
                        previouslyIdentifiedFeatures,
                      });

                    tokensUsed = sumTokens({ accumulated: tokensUsed, added: iterationTokens });

                    iterations.push({
                      features: identifiedFeatures,
                      previousFeatureCount: previouslyIdentifiedFeatures.length,
                    });

                    for (const baseFeature of identifiedFeatures) {
                      const existing = accumulated.findDuplicate(baseFeature);
                      if (existing) {
                        if (existing.id.toLowerCase() === baseFeature.id.toLowerCase()) {
                          mergeEvents.push({ existing, incoming: baseFeature });
                        } else {
                          fingerprintOnlyMergeEvents.push({ existing, incoming: baseFeature });
                        }
                        const merged = mergeFeature(existing, baseFeature);

                        accumulated.update(merged);
                      } else {
                        accumulated.add(baseFeature);
                      }
                    }
                  }

                  return {
                    iterations,
                    mergeEvents,
                    fingerprintOnlyMergeEvents,
                    finalFeatures: accumulated.getAll(),
                    traceId: getCurrentTraceId(),
                    tokens_used: tokensUsed,
                  };
                },
              },
              [
                createSemanticUniquenessEvaluator({
                  inferenceClient: evaluatorInferenceClient,
                }),
                createMergeCorrectnessEvaluator({
                  inferenceClient: evaluatorInferenceClient,
                }),
                createIdReuseEvaluator(),
                ...createReportedTokenEvaluators(),
                evaluators.traceBasedEvaluators.inputTokens,
                evaluators.traceBasedEvaluators.outputTokens,
                evaluators.traceBasedEvaluators.cachedTokens,
                createChatCallsEvaluator({ traceEsClient, log }),
                createSpanLatencyEvaluator({ traceEsClient, log, operationName: 'chat' }),
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

    evaluate(
      'known feature ids and semantic duplicate search',
      async ({ executorClient, inferenceClient, logger }) => {
        await executorClient.runExperiment(
          {
            datasets: [dedupContextDataset],
            concurrency: 1,
            task: async ({ input }: DedupContextExample): Promise<DedupContextOutput> => {
              if (!input) {
                throw new Error('Deduplication context input is missing');
              }

              const searchCalls: SearchSimilarFeaturesArguments[] = [];
              const { features } = await identifyFeatures({
                streamName: MANAGED_STREAM_NAME,
                sampleDocuments: input.sampleDocuments,
                systemPrompt: featuresPrompt,
                inferenceClient,
                logger,
                signal: new AbortController().signal,
                knownFeatureIds: input.knownFeatureIds,
                searchSimilarFeatures: async (args) => {
                  searchCalls.push(args);
                  const searchText =
                    `${args.candidate_id} ${args.title} ${args.description}`.toLowerCase();
                  if (
                    input.similarFeature &&
                    args.type === 'entity' &&
                    searchText.includes('checkout')
                  ) {
                    return [input.similarFeature];
                  }
                  return [];
                },
              });

              return { features, searchCalls };
            },
          },
          [dedupContextContractEvaluator]
        );
      }
    );
  }
);
