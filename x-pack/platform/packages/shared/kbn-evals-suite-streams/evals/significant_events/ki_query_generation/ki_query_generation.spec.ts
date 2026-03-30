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
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { Feature, Streams } from '@kbn/streams-schema';
import type { GcsConfig } from '../../../src/data_generators/replay';
import {
  canonicalKIFeaturesFromExpectedGroundTruth,
  cleanSignificantEventsDataStreams,
  listAvailableSnapshots,
  loadKIFeaturesFromSnapshot,
  replayIntoManagedStream,
  SIGEVENTS_SNAPSHOT_RUN,
} from '../../../src/data_generators/replay';
import { evaluate } from '../../../src/evaluate';
import { createKIQueryGenerationEvaluators } from '../../../src/evaluators/ki_query_generation/evaluators';
import { createScenarioCriteriaLlmEvaluator } from '../../../src/evaluators/scenario_criteria/evaluators';
import {
  getActiveDatasets,
  MANAGED_STREAM_NAME,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
} from '../datasets';
import { KI_FEATURE_SOURCES_TO_RUN } from './resolve_ki_sources';
import { extractLogTextFromSourceDoc } from './extract_log_text';
import { getComputedKIFeaturesFromDocs } from './get_computed_ki_features_from_docs';

const SAMPLE_DOCS_SIZE = 500;

evaluate.describe('KI query generation', { tag: tags.serverless.observability.complete }, () => {
  const activeDatasets = getActiveDatasets();
  const kiQueryGenerationRuns = activeDatasets.flatMap((dataset) =>
    dataset.kiQueryGeneration.map((scenario) => ({ dataset, scenario }))
  );
  const availableSnapshotsBySource = new Map<string, Set<string>>();

  evaluate.beforeAll(async ({ esClient, log }) => {
    const uniqueCatalogSources = new Map<string, GcsConfig>();
    for (const { dataset, scenario } of kiQueryGenerationRuns) {
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

  for (const { dataset, scenario } of kiQueryGenerationRuns) {
    for (const kiSource of KI_FEATURE_SOURCES_TO_RUN) {
      evaluate.describe(`${dataset.id} / ${scenario.input.scenario_id} (${kiSource})`, () => {
        let sampleLogs: string[] = [];
        let kis: Feature[] = [];

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

          const extractionScenario = dataset.kiFeatureExtraction.find(
            (item) => item.input.scenario_id === scenario.input.scenario_id
          );
          const canonicalKIs =
            extractionScenario?.output.expected_ground_truth != null
              ? canonicalKIFeaturesFromExpectedGroundTruth({
                  streamName: scenario.input.stream_name,
                  scenarioId: scenario.input.scenario_id,
                  expectedGroundTruth: extractionScenario.output.expected_ground_truth,
                })
              : [];

          const shouldUseCanonicalKIs =
            kiSource === 'canonical' || (kiSource === 'auto' && canonicalKIs.length > 0);

          const resolvedKIs = shouldUseCanonicalKIs
            ? canonicalKIs
            : await loadKIFeaturesFromSnapshot(
                esClient,
                log,
                source.snapshotName,
                source.gcs,
                scenario.input.stream_name
              );

          if (!shouldUseCanonicalKIs && resolvedKIs.length === 0) {
            log.info(
              `No snapshot KIs available for "${source.snapshotName}" - skipping snapshot variant`
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

          await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });

          const query = extractionScenario?.input.log_query_filter ?? { match_all: {} };

          const searchResult = await esClient.search<Record<string, unknown>>({
            index: MANAGED_STREAM_SEARCH_PATTERN,
            size: SAMPLE_DOCS_SIZE,
            query,
            sort: [{ '@timestamp': { order: 'desc' } }],
          });

          sampleLogs = searchResult.hits.hits.map((hit) =>
            extractLogTextFromSourceDoc(hit._source)
          );

          if (shouldUseCanonicalKIs) {
            const sourceDocs = searchResult.hits.hits
              .map((hit) => hit._source)
              .filter((doc): doc is Record<string, unknown> => doc != null);

            const computedKIs = getComputedKIFeaturesFromDocs({
              streamName: scenario.input.stream_name,
              docs: sourceDocs,
            });

            kis = [...resolvedKIs, ...computedKIs];
          } else {
            kis = resolvedKIs;
          }

          if (kis.length === 0) {
            const details = shouldUseCanonicalKIs
              ? 'No canonical KIs could be derived from expected_ground_truth.'
              : `No snapshot KIs found for "${source.snapshotName}". Ensure the snapshot includes sigevents-streams-features-<scenario>.`;
            throw new Error(
              `No KIs available for scenario "${scenario.input.scenario_id}". ${details}`
            );
          }
        });

        evaluate(
          'KI query generation',
          async ({
            executorClient,
            evaluators,
            esClient,
            inferenceClient,
            logger,
            apiServices,
            traceEsClient,
            log,
          }) => {
            await executorClient.runExperiment(
              {
                dataset: {
                  name: `sigevents: KI query generation: ${scenario.input.scenario_id} (${dataset.id}) (${kiSource})`,
                  description: `[${dataset.id}] ${scenario.input.stream_description}`,
                  examples: [
                    {
                      input: {
                        ...scenario.input,
                        features: kis,
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

                  const stream = {
                    ...logsStream,
                    name: MANAGED_STREAM_SEARCH_PATTERN,
                  } as Streams.all.Definition;
                  const kiTypeCounts = kis.reduce<Record<string, number>>((counts, ki) => {
                    counts[ki.type] = (counts[ki.type] ?? 0) + 1;
                    return counts;
                  }, {});

                  logger.info(
                    `[DEBUG] KI query generation input: scenario=${scenario.input.scenario_id}, ` +
                      `ki_source=${kiSource}, total_kis=${kis.length}, ` +
                      `ki_types=${JSON.stringify(kiTypeCounts)}, sample_logs=${sampleLogs.length}`
                  );

                  const { queries, toolUsage } = await generateSignificantEvents({
                    stream,
                    esClient,
                    start: kbnDatemath.parse('now-24h')!.valueOf(),
                    end: kbnDatemath.parse('now')!.valueOf(),
                    inferenceClient,
                    logger,
                    signal: new AbortController().signal,
                    systemPrompt: significantEventsPrompt,
                    getFeatures: async () => kis,
                  });

                  logger.info(
                    `[DEBUG] Tool usage: get_stream_features calls=${toolUsage.get_stream_features.calls}, failures=${toolUsage.get_stream_features.failures}; add_queries calls=${toolUsage.add_queries.calls}, failures=${toolUsage.add_queries.failures}; generated_queries=${queries.length}`
                  );

                  return { queries, traceId: getCurrentTraceId() };
                },
              },
              [
                ...createKIQueryGenerationEvaluators(
                  esClient,
                  {
                    criteriaFn: evaluators.criteria.bind(evaluators),
                    criteria: scenario.output.criteria,
                  },
                  logger
                ),
                evaluators.traceBasedEvaluators.inputTokens,
                evaluators.traceBasedEvaluators.outputTokens,
                evaluators.traceBasedEvaluators.cachedTokens,
                createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
              ]
            );
          }
        );

        evaluate.afterAll(async ({ esClient, apiServices, log }) => {
          log.debug('Cleaning up KI query generation test data');
          await apiServices.streams.disable().catch(() => {});
          await cleanSignificantEventsDataStreams(esClient, log);
        });
      });
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
      'KI query generation',
      async ({ executorClient, evaluators, esClient, inferenceClient, logger, apiServices }) => {
        if (!emptyDataStreamTestIndex) {
          throw new Error('Missing temporary test index for empty datastream evaluation');
        }

        await executorClient.runExperiment(
          {
            dataset: {
              name: 'sigevents: KI query generation: empty datastream',
              description: 'Significant events KI query generation with empty stream data',
              examples: [
                {
                  input: {},
                  output: {},
                  metadata: {},
                },
              ],
            },
            task: async () => {
              const { stream: streamFromApi } = await apiServices.streams.getStreamDefinition(
                emptyDataStreamTestIndex!
              );

              const { queries } = await generateSignificantEvents({
                stream: streamFromApi as Streams.all.Definition,
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
        await esClient.indices.deleteDataStream({ name: emptyDataStreamTestIndex }).catch(() => {});
      }

      await apiServices.streams.disable().catch(() => {});
    });
  });
});
