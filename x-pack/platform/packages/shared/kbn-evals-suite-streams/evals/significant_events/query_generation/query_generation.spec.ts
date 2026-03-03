/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateSignificantEvents } from '@kbn/streams-ai';
import { significantEventsPrompt } from '@kbn/streams-ai/src/significant_events/prompt';
import { tags } from '@kbn/scout';
import kbnDatemath from '@kbn/datemath';
import type { Feature } from '@kbn/streams-schema';
import type { GcsConfig } from '../../../src/data_generators/replay';
import {
  canonicalFeaturesFromExpectedGroundTruth,
  cleanSignificantEventsDataStreams,
  listAvailableSnapshots,
  loadFeaturesFromSnapshot,
  replayIntoManagedStream,
  SIGEVENTS_SNAPSHOT_RUN,
} from '../../../src/data_generators/replay';
import { evaluate } from '../../../src/evaluate';
import { createQueryGenerationEvaluators } from '../../../src/evaluators/query_generation_evaluators';
import { createScenarioCriteriaLlmEvaluator } from '../../../src/evaluators/scenario_criteria_llm_evaluator';
import { getActiveDatasets, resolveScenarioSnapshotSource } from '../datasets';
import { FEATURE_SOURCES_TO_RUN } from './resolve_feature_sources';
import { extractLogTextFromSourceDoc } from './extract_log_text';
import { getComputedFeaturesFromDocs } from './get_computed_features_from_docs';

const INDEX_REFRESH_WAIT_MS = 2500;
const SAMPLE_DOCS_SIZE = 500;

const MANAGED_STREAM_NAME = 'logs';
const MANAGED_STREAM_SEARCH_PATTERN = 'logs*';

const snapshotCatalogKey = (gcs: GcsConfig): string => `${gcs.bucket}/${gcs.basePathPrefix}`;

evaluate.describe(
  'Significant events query generation',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const queryGenerationRuns = activeDatasets.flatMap((dataset) =>
      dataset.queryGeneration.map((scenario) => ({ dataset, scenario }))
    );
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, log }) => {
      const uniqueCatalogSources = new Map<string, GcsConfig>();
      for (const { dataset, scenario } of queryGenerationRuns) {
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

    for (const { dataset, scenario } of queryGenerationRuns) {
      for (const featureSource of FEATURE_SOURCES_TO_RUN) {
        evaluate.describe(
          `${dataset.id} / ${scenario.input.scenario_id} (${featureSource})`,
          () => {
            let sampleLogs: string[] = [];
            let features: Feature[] = [];

            evaluate.beforeAll(async ({ esClient, apiServices, log }) => {
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

              for (const name of ['logs.otel', 'logs.ecs']) {
                await esClient.indices.deleteDataStream({ name }).catch(() => {});
                await esClient.indices
                  .delete({ index: name, ignore_unavailable: true })
                  .catch(() => {});
              }

              await apiServices.streams.disable().catch(() => {});
              await apiServices.streams.enable();

              const extractionScenario = dataset.featureExtraction.find(
                (item) => item.input.scenario_id === scenario.input.scenario_id
              );
              const canonicalFeatures =
                extractionScenario?.output.expected_ground_truth != null
                  ? canonicalFeaturesFromExpectedGroundTruth({
                      streamName: scenario.input.stream_name,
                      scenarioId: scenario.input.scenario_id,
                      expectedGroundTruth: extractionScenario.output.expected_ground_truth,
                    })
                  : [];

              const shouldUseCanonicalFeatures =
                featureSource === 'canonical' ||
                (featureSource === 'auto' && canonicalFeatures.length > 0);

              const resolvedFeatures = shouldUseCanonicalFeatures
                ? canonicalFeatures
                : await loadFeaturesFromSnapshot(
                    esClient,
                    log,
                    source.snapshotName,
                    source.gcs,
                    scenario.input.stream_name
                  );

              if (!shouldUseCanonicalFeatures && resolvedFeatures.length === 0) {
                log.info(
                  `No snapshot features available for "${source.snapshotName}" - skipping snapshot variant`
                );
                evaluate.skip();
                return;
              }

              const stats = await replayIntoManagedStream(
                esClient,
                log,
                source.snapshotName,
                source.gcs
              );

              if (stats.created === 0) {
                throw new Error(
                  `No documents indexed after replaying snapshot "${source.snapshotName}" into managed stream`
                );
              }

              await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

              const searchResult = await esClient.search<Record<string, unknown>>({
                index: MANAGED_STREAM_SEARCH_PATTERN,
                size: SAMPLE_DOCS_SIZE,
                query: { match_all: {} },
                sort: [{ '@timestamp': { order: 'desc' } }],
              });

              sampleLogs = searchResult.hits.hits.map((hit) =>
                extractLogTextFromSourceDoc(hit._source)
              );

              if (shouldUseCanonicalFeatures) {
                const sourceDocs = searchResult.hits.hits
                  .map((hit) => hit._source)
                  .filter((doc): doc is Record<string, unknown> => doc != null);

                const computedFeatures = getComputedFeaturesFromDocs({
                  streamName: scenario.input.stream_name,
                  docs: sourceDocs,
                });

                features = [...resolvedFeatures, ...computedFeatures];
              } else {
                features = resolvedFeatures;
              }

              if (features.length === 0) {
                const details = shouldUseCanonicalFeatures
                  ? 'No canonical features could be derived from expected_ground_truth.'
                  : `No snapshot features found for "${source.snapshotName}". Ensure the snapshot includes sigevents-streams-features-<scenario>.`;
                throw new Error(
                  `No features available for scenario "${scenario.input.scenario_id}". ${details}`
                );
              }
            });

            evaluate(
              'query generation',
              async ({
                executorClient,
                evaluators,
                esClient,
                inferenceClient,
                logger,
                apiServices,
              }) => {
                await executorClient.runExperiment(
                  {
                    dataset: {
                      name: `sigevents: query generation: ${scenario.input.scenario_id} (${dataset.id}) (${featureSource})`,
                      description: `[${dataset.id}] ${scenario.input.stream_description}`,
                      examples: [
                        {
                          input: {
                            ...scenario.input,
                            features,
                            sample_logs: sampleLogs,
                          },
                          output: {
                            ...scenario.output,
                            expected: scenario.output.expected_ground_truth,
                          },
                          metadata: {
                            ...scenario.metadata,
                            test_index: MANAGED_STREAM_SEARCH_PATTERN,
                          },
                        },
                      ],
                    },
                    task: async () => {
                      const { stream: logsStream } = await apiServices.streams.getStreamDefinition(
                        MANAGED_STREAM_NAME
                      );

                      const stream = { ...logsStream, name: MANAGED_STREAM_SEARCH_PATTERN };

                      const { queries, toolUsage } = await generateSignificantEvents({
                        stream,
                        esClient,
                        start: kbnDatemath.parse('now-24h')!.valueOf(),
                        end: kbnDatemath.parse('now')!.valueOf(),
                        inferenceClient,
                        logger,
                        signal: new AbortController().signal,
                        systemPrompt: significantEventsPrompt,
                        getFeatures: async () => features,
                      });

                      logger.info(
                        `[DEBUG] Tool usage: add_queries calls=${toolUsage.add_queries.calls}, failures=${toolUsage.add_queries.failures}`
                      );

                      return queries;
                    },
                  },
                  createQueryGenerationEvaluators(
                    esClient,
                    {
                      criteriaFn: evaluators.criteria.bind(evaluators),
                      criteria: scenario.output.criteria,
                    },
                    logger
                  )
                );
              }
            );

            evaluate.afterAll(async ({ esClient, apiServices, log }) => {
              log.debug('Cleaning up query-generation test data');
              await apiServices.streams.disable().catch(() => {});
              await cleanSignificantEventsDataStreams(esClient, log);
            });
          }
        );
      }
    }

    evaluate.describe('empty datastream', () => {
      let emptyDataStreamTestIndex: string | undefined;

      evaluate.beforeAll(async ({ esClient, apiServices }) => {
        emptyDataStreamTestIndex = `logs-sig-events-test-${Date.now()}`;
        await apiServices.streams.disable().catch(() => {});
        await apiServices.streams.enable();
        await esClient.indices.createDataStream({ name: emptyDataStreamTestIndex });
      });

      evaluate(
        'query generation',
        async ({ executorClient, evaluators, esClient, inferenceClient, logger, apiServices }) => {
          if (!emptyDataStreamTestIndex) {
            throw new Error('Missing temporary test index for empty datastream evaluation');
          }

          await executorClient.runExperiment(
            {
              dataset: {
                name: 'sigevents: query generation: empty datastream',
                description: 'Significant events query generation with empty stream data',
                examples: [
                  {
                    input: {},
                    output: {},
                    metadata: {},
                  },
                ],
              },
              task: async () => {
                const { stream } = await apiServices.streams.getStreamDefinition(
                  emptyDataStreamTestIndex!
                );

                const { queries } = await generateSignificantEvents({
                  stream,
                  esClient,
                  start: kbnDatemath.parse('now-24h')!.valueOf(),
                  end: kbnDatemath.parse('now')!.valueOf(),
                  inferenceClient,
                  logger,
                  signal: new AbortController().signal,
                  systemPrompt: significantEventsPrompt,
                  getFeatures: async () => [],
                });

                return queries;
              },
            },
            [
              createScenarioCriteriaLlmEvaluator({
                criteriaFn: evaluators.criteria.bind(evaluators),
                criteria: ['Assert the ES|QL queries are generated following the user intent'],
              }),
            ]
          );
        }
      );

      evaluate.afterAll(async ({ esClient, apiServices }) => {
        if (emptyDataStreamTestIndex) {
          await esClient.indices
            .deleteDataStream({ name: emptyDataStreamTestIndex })
            .catch(() => {});
        }

        await apiServices.streams.disable().catch(() => {});
      });
    });
  }
);
