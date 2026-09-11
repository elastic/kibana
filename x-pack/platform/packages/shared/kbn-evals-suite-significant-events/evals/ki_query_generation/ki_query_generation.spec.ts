/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AnalysisTarget, type SignificantEventType } from '@kbn/nightshift-ai';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import { tags } from '@kbn/scout';

import {
  getCurrentTraceId,
  createSpanLatencyEvaluator,
  createChatCallsEvaluator,
} from '@kbn/evals';
import { getSourcesForStream, getStreamSamplingSource, type Streams } from '@kbn/streams-schema';
import type { Feature } from '@kbn/significant-events-schema';
import { createReportedTokenEvaluators } from '../../src/evaluators/reported_tokens';
import {
  assertRerunRequiresCanonicalKIs,
  buildQueryGenerationExamples,
  type CollectedQueryGenExample,
} from './build_query_gen_examples';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  canonicalKIFeaturesFromExpectedGroundTruth,
  cleanSignificantEventsDataStreams,
  deleteTemporaryReplayIndices,
  ensureStreamsEnabled,
  loadKIFeaturesFromSnapshot,
  replayIntoManagedStream,
  SIGEVENTS_SNAPSHOT_RUN,
  SIGEVENTS_WIRED_ROOTS,
} from '../../src/data_generators/replay';
import { evaluate } from '../../src/evaluate';
import {
  createKIQueryGenerationEvaluators,
  type Query,
} from '../../src/evaluators/ki_query_generation';
import {
  getActiveDatasets,
  MANAGED_STREAM_NAME,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  type KIQueryGenerationScenario,
} from '../../src/datasets';
import { buildAvailableSnapshotsBySource } from '../shared';
import { KI_FEATURE_SOURCES_TO_RUN } from './resolve_ki_sources';
import {
  assertQueryGenerationDatasetSafety,
  resolveQueryGenerationDatasets,
  resolveQueryGenerationDatasetName,
} from './resolve_scenarios';
import { getEmptyDatastreamEvaluators, selectQueryGenerationEvaluators } from './select_evaluators';
import { extractLogTextFromSourceDoc } from './extract_log_text';
import { getComputedKIFeaturesFromDocs } from './get_computed_ki_features_from_docs';
import { collectSampleDocuments } from './collect_sample_documents';
import { runKIQueryGenerationAgent } from '../../src/run_ki_query_generation_agent';

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

evaluate.describe('KI query generation', { tag: tags.serverless.observability.complete }, () => {
  const scenarioResolution = resolveQueryGenerationDatasets(getActiveDatasets());
  const activeDatasets = scenarioResolution.datasets;
  const availableSnapshotsBySource = new Map<string, Set<string>>();

  assertQueryGenerationDatasetSafety(scenarioResolution, TRUST_UPSTREAM);

  evaluate.beforeAll(async ({ esClient, kbnClient, log, uiSettings }) => {
    await uiSettings.set({ 'agentBuilder:experimentalFeatures': true });
    await kbnClient.request({
      path: '/internal/core/_settings',
      method: 'PUT',
      headers: { 'elastic-api-version': '1' },
      body: {
        'feature_flags.overrides': {
          [STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG]: true,
        },
      },
    });
    log.info('Enabled significant events availability feature flag');

    const snapshots = await buildAvailableSnapshotsBySource(
      activeDatasets,
      (dataset) => dataset.kiQueryGeneration,
      esClient,
      log
    );
    snapshots.forEach((v, k) => availableSnapshotsBySource.set(k, v));
  });

  for (const dataset of activeDatasets) {
    for (const kiSource of KI_FEATURE_SOURCES_TO_RUN) {
      evaluate.describe(`${dataset.id} (${kiSource})`, () => {
        const collectedExamples: CollectedQueryGenExample[] = [];
        const snapshotSources = new Map<string, { snapshotName: string; gcs: GcsConfig }>();

        evaluate.beforeAll(async ({ esClient, apiServices, log }) => {
          for (const scenario of dataset.kiQueryGeneration) {
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
              continue;
            }

            await cleanSignificantEventsDataStreams(esClient, log);

            for (const name of SIGEVENTS_WIRED_ROOTS) {
              await esClient.indices.deleteDataStream({ name }).catch(() => {});
              await esClient.indices
                .delete({ index: name, ignore_unavailable: true })
                .catch(() => {});
            }

            await ensureStreamsEnabled({ esClient, apiServices, log });

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

            assertRerunRequiresCanonicalKIs(scenario, canonicalKIs);

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
              continue;
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

            const sampleHits = await collectSampleDocuments({
              esClient,
              extractionScenario,
              queryGenerationScenario: scenario,
              log,
            });

            const sampleDocs = sampleHits
              .map((hit) => hit._source)
              .filter((doc): doc is Record<string, unknown> => doc != null);

            const sampleLogs = sampleDocs.map((doc) => extractLogTextFromSourceDoc(doc));

            let kis: Feature[];
            if (shouldUseCanonicalKIs) {
              const computedKIs = getComputedKIFeaturesFromDocs({
                streamName: scenario.input.stream_name,
                docs: sampleDocs,
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

            collectedExamples.push({ scenario, kis, sampleLogs, sampleDocs });
            snapshotSources.set(scenario.input.scenario_id, source);
          }

          if (collectedExamples.length === 0) {
            log.info(`No scenarios available for dataset "${dataset.id}" (${kiSource}) - skipping`);
            evaluate.skip();
          }
        });

        evaluate(
          'KI query generation',
          async ({
            executorClient,
            evaluators,
            esClient,
            kbnClient,
            logger,
            apiServices,
            traceEsClient,
            log,
            fetch,
            connector,
            repetitions,
          }) => {
            let lastReplayedSnapshot: string | undefined;
            let lastSeededScenarioId: string | undefined;

            // The agent's `platform_sig_events_ki_features_get` tool reads from the KI
            // store, so each scenario's pre-collected features must be indexed there
            // before the run (the legacy inference flow injected them directly into the
            // prompt tool). Stored features from a previous scenario are deleted first.
            const seedKIFeatures = async (scenarioId: string, features: Feature[]) => {
              if (lastSeededScenarioId === scenarioId) {
                return;
              }
              const {
                data: { features: storedFeatures },
              } = await kbnClient.request<{ features: Feature[] }>({
                method: 'GET',
                path: `/internal/streams/${MANAGED_STREAM_NAME}/features`,
              });
              await kbnClient.request({
                method: 'POST',
                path: `/internal/streams/${MANAGED_STREAM_NAME}/features/_bulk`,
                body: {
                  operations: [
                    ...storedFeatures.map(({ id }) => ({ delete: { id } })),
                    // uuid is server-derived; featureUpsertSchema rejects it as an excess key.
                    ...features.map(({ uuid, ...feature }) => ({ index: { feature } })),
                  ],
                },
              });
              lastSeededScenarioId = scenarioId;
            };

            const heavyDataByScenario = new Map(
              collectedExamples.map(({ scenario, kis, sampleLogs, sampleDocs }) => [
                scenario.input.scenario_id,
                { kis, sampleLogs, sampleDocs },
              ])
            );

            const examples = buildQueryGenerationExamples(
              collectedExamples,
              MANAGED_STREAM_SEARCH_PATTERN
            );

            const evaluatorsList = selectQueryGenerationEvaluators([
              ...createKIQueryGenerationEvaluators(
                esClient,
                {
                  criteriaFn: evaluators.criteria.bind(evaluators),
                },
                logger
              ),
              ...createReportedTokenEvaluators(),
              evaluators.traceBasedEvaluators.inputTokens,
              evaluators.traceBasedEvaluators.outputTokens,
              evaluators.traceBasedEvaluators.cachedTokens,
              evaluators.traceBasedEvaluators.toolCalls,
              createChatCallsEvaluator({ traceEsClient, log }),
              createSpanLatencyEvaluator({ traceEsClient, log, operationName: 'chat' }),
            ]);

            const task = async ({ input }: { input: KIQueryGenerationScenario['input'] }) => {
              const heavy = heavyDataByScenario.get(input.scenario_id);
              if (!heavy) {
                throw new Error(`No pre-collected data for scenario "${input.scenario_id}"`);
              }
              const { kis, sampleLogs, sampleDocs } = heavy;

              const source = snapshotSources.get(input.scenario_id);
              if (!source) {
                throw new Error(`No snapshot source found for scenario "${input.scenario_id}"`);
              }

              if (source.snapshotName !== lastReplayedSnapshot) {
                await cleanSignificantEventsDataStreams(esClient, log);
                for (const name of ['logs.otel', 'logs.ecs']) {
                  await esClient.indices.deleteDataStream({ name }).catch(() => {});
                  await esClient.indices
                    .delete({ index: name, ignore_unavailable: true })
                    .catch(() => {});
                }
                await apiServices.streams.disable().catch(() => {});
                await apiServices.streams.enable();
                await replayIntoManagedStream(esClient, log, source.snapshotName, source.gcs);
                await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });
                lastReplayedSnapshot = source.snapshotName;
              }

              await seedKIFeatures(input.scenario_id, kis);

              const { stream: logsStream } = await apiServices.streams.getStreamDefinition(
                MANAGED_STREAM_NAME
              );

              // The agent's tools resolve the target through `streamsClient.getStream`,
              // so `target_id` must be the real stream name, not a search pattern.
              const stream = logsStream as Streams.all.Definition;
              const target: AnalysisTarget = {
                id: MANAGED_STREAM_NAME,
                name: MANAGED_STREAM_NAME,
                description: stream.description,
                sources: getSourcesForStream(stream),
                samplingSource: getStreamSamplingSource(stream),
              };

              const kiTypeCounts = kis.reduce<Record<string, number>>((counts, ki) => {
                counts[ki.type] = (counts[ki.type] ?? 0) + 1;
                return counts;
              }, {});

              logger.info(
                `[DEBUG] KI query generation input: scenario=${input.scenario_id}, ` +
                  `ki_source=${kiSource}, total_kis=${kis.length}, ` +
                  `ki_types=${JSON.stringify(kiTypeCounts)}, sample_logs=${sampleLogs.length}`
              );

              const {
                queries: rawQueries,
                tokensUsed,
                toolUsage,
              } = await runKIQueryGenerationAgent({
                fetch,
                log,
                target,
                connectorId: connector.id,
              });

              const queries: Query[] = rawQueries.map((q) => ({
                esql: q.esql.query,
                title: q.title,
                category: q.category as SignificantEventType,
                severity_score: q.severity_score,
                evidence: q.evidence,
              }));

              logger.info(`[DEBUG] generated_queries=${queries.length}`);

              return {
                queries,
                tokens_used: tokensUsed,
                toolUsage,
                evaluation_arm: 'clean' as const,
                traceId: getCurrentTraceId(),
                ki_source: kiSource,
                grounding_mode: 'baseline' as const,
                sample_logs: sampleLogs,
                sample_docs: sampleDocs,
                features: kis,
              };
            };

            logger.info(
              `QUERY_GENERATION_EVAL_CONFIG ${JSON.stringify({
                dataset: dataset.id,
                ki_source: kiSource,
                grounding: 'baseline',
                scenario_ids: dataset.kiQueryGeneration.map(
                  (scenario) => scenario.input.scenario_id
                ),
                example_ids: examples.map((example) => example.id),
                evaluator_names: evaluatorsList.map((evaluator) => evaluator.name),
                repetitions,
                generation_model: connector.id,
              })}`
            );

            const canonicalDatasetName = `sigevents: KI query generation (${dataset.id}) (${kiSource}) [baseline]`;
            const datasetName = resolveQueryGenerationDatasetName(
              scenarioResolution,
              canonicalDatasetName
            );
            const description = scenarioResolution.isFocused
              ? `[${dataset.id}] KI query generation across scenarios (${kiSource}) [baseline] ` +
                `focused=${scenarioResolution.selectedScenarioIds.join(',')}`
              : `[${dataset.id}] KI query generation across scenarios (${kiSource}) [baseline]`;

            await executorClient.runExperiment(
              {
                datasets: [{ name: datasetName, description, examples }],
                concurrency: 1,
                trustUpstreamDataset: TRUST_UPSTREAM,
                task,
              },
              evaluatorsList
            );
          }
        );

        evaluate.afterAll(async ({ esClient, apiServices, log }) => {
          log.debug('Cleaning up KI query generation test data');
          await deleteTemporaryReplayIndices(esClient, log);
          await apiServices.streams.disable().catch(() => {});
          await cleanSignificantEventsDataStreams(esClient, log);
        });
      });
    }
  }

  evaluate.describe('empty datastream', () => {
    let emptyDataStreamTestIndex: string | undefined;

    evaluate.beforeAll(async ({ esClient, apiServices, log }) => {
      emptyDataStreamTestIndex = `logs-sig-events-test-${Date.now()}`;
      await ensureStreamsEnabled({ esClient, apiServices, log });
      await esClient.indices.createDataStream({ name: emptyDataStreamTestIndex });
    });

    evaluate(
      'KI query generation',
      async ({ executorClient, logger, apiServices, connector, repetitions, fetch, log }) => {
        if (!emptyDataStreamTestIndex) {
          throw new Error('Missing temporary test index for empty datastream evaluation');
        }

        const emptyDatastreamEvaluators = getEmptyDatastreamEvaluators();
        logger.info(
          `QUERY_GENERATION_EVAL_CONFIG ${JSON.stringify({
            dataset: 'empty-datastream',
            ki_source: 'none',
            grounding: 'baseline',
            scenario_ids: ['empty-datastream'],
            example_ids: ['empty-datastream'],
            evaluator_names: emptyDatastreamEvaluators.map((evaluator) => evaluator.name),
            repetitions,
            generation_model: connector.id,
          })}`
        );

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'sigevents: KI query generation: empty datastream',
                description: 'Significant events KI query generation with empty stream data',
                examples: [
                  {
                    id: 'empty-datastream',
                    input: {},
                    output: { expect_queries: false },
                    metadata: {},
                  },
                ],
              },
            ],
            task: async () => {
              const { stream: streamFromApi } = await apiServices.streams.getStreamDefinition(
                emptyDataStreamTestIndex!
              );
              const emptyStream = streamFromApi as Streams.all.Definition;

              const target: AnalysisTarget = {
                id: emptyStream.name,
                name: emptyStream.name,
                description: emptyStream.description,
                sources: getSourcesForStream(emptyStream),
                samplingSource: getStreamSamplingSource(emptyStream),
              };

              const { queries: rawQueries, tokensUsed } = await runKIQueryGenerationAgent({
                fetch,
                log,
                target,
                connectorId: connector.id,
              });

              const queries: Query[] = rawQueries.map((q) => ({
                esql: q.esql.query,
                title: q.title,
                category: q.category as SignificantEventType,
                severity_score: q.severity_score,
                evidence: q.evidence,
              }));

              return {
                queries,
                tokens_used: tokensUsed,
                traceId: getCurrentTraceId(),
                ki_source: 'none' as const,
                grounding_mode: 'baseline' as const,
              };
            },
          },
          // The empty-stream safety canary always runs its mandatory deterministic
          // evaluator. Evaluator-selection variables must never disable this canary.
          emptyDatastreamEvaluators
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
