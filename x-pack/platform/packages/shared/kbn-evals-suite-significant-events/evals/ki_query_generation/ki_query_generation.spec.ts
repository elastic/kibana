/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyKIQueries, QUERY_GENERATION_EXCLUDED_FEATURE_TYPES } from '@kbn/streams-ai';
import { significantEventsPrompt } from '@kbn/streams-ai/src/significant_events/prompt';
import {
  createMemoryDiscoveryTools,
  MemoryServiceImpl,
} from '@kbn/significant-events-plugin/server';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import { tags } from '@kbn/scout';

import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { Streams } from '@kbn/streams-schema';
import type { Feature } from '@kbn/significant-events-schema';
import {
  canonicalKIFeaturesFromExpectedGroundTruth,
  deleteQueryGenReplayIndices,
  ensureStreamsEnabled,
  queryGenReplayIndexName,
  replaySnapshotIntoIndex,
  SIGEVENTS_SNAPSHOT_RUN,
} from '../../src/data_generators/replay';
import { evaluate } from '../../src/evaluate';
import { createEvalSignificantEventSearchTool } from '../../src/tools/significant_event_search_tool';
import { createKIQueryGenerationEvaluators } from '../../src/evaluators/ki_query_generation';
import { createScenarioCriteriaLlmEvaluator } from '../../src/evaluators/scenario_criteria/evaluators';
import {
  getActiveDatasets,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  type KIQueryGenerationScenario,
} from '../../src/datasets';
import { buildAvailableSnapshotsBySource } from '../shared';
import { extractLogTextFromSourceDoc } from './extract_log_text';
import { getComputedKIFeaturesFromDocs } from './get_computed_ki_features_from_docs';
import { collectSampleDocuments } from './collect_sample_documents';
import {
  createEvalSemanticCodeSearchTools,
  resolveCodeIndexForDataset,
  resolveGroundingModes,
  type AgentBuilderToolResult,
  type GroundingMode,
} from './grounding_tools';

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

/** Concurrent scenario runs per experiment. Each scenario has its own isolated
 * replay index, so raising this is safe. */
const QUERYGEN_CONCURRENCY = Number(process.env.SIGEVENTS_QUERYGEN_CONCURRENCY) || 4;

/** A replay that drops more than this fraction of docs (typically mapping
 * conflicts) is treated as unusable and the scenario is skipped rather than
 * scored on partial data. */
const MAX_REPLAY_SKIP_RATE = 0.2;

interface CollectedQueryGenExample {
  scenario: KIQueryGenerationScenario;
  kis: Feature[];
  sampleLogs: string[];
  sampleDocs: Array<Record<string, unknown>>;
  indexName: string;
  stream: Streams.all.Definition;
}

/**
 * Builds a synthetic classic stream definition pointing at an isolated replay
 * index. `getSourcesForStream` returns `[name]` for a classic stream, so the
 * reasoning agent (and its ES|QL validation) target exactly that index — no
 * shared wired `logs` stream, which is what lets scenarios run concurrently.
 */
const buildSyntheticStream = (indexName: string): Streams.all.Definition =>
  ({
    name: indexName,
    // `type: 'classic'` keeps `getSourcesForStream` on the classic branch (returns
    // `[name]`) even if it switches to full-schema validation; without it a future
    // change could fall through to the wired branch and widen the agent's `FROM`.
    type: 'classic',
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      classic: {},
    },
  } as unknown as Streams.all.Definition);

evaluate.describe('KI query generation', { tag: tags.serverless.observability.complete }, () => {
  const activeDatasets = getActiveDatasets();
  const availableSnapshotsBySource = new Map<string, Set<string>>();

  evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
    const deprecatedKiSourceEnv =
      process.env.KI_QUERY_GENERATION_KI_FEATURE_SOURCE ||
      process.env.SIGEVENTS_QUERYGEN_FEATURES_SOURCE;
    if (deprecatedKiSourceEnv) {
      log.warning(
        `KI_QUERY_GENERATION_KI_FEATURE_SOURCE / SIGEVENTS_QUERYGEN_FEATURES_SOURCE ` +
          `("${deprecatedKiSourceEnv}") is no longer supported; KI query generation now always uses ` +
          `canonical KIs derived from expected_ground_truth.`
      );
    }

    // A previous run killed before afterAll leaves stale sigevents-qg-* indices;
    // clear them up front so replays start from a clean slate.
    await deleteQueryGenReplayIndices(esClient, log);

    // The significant_event_search tool is only registered when significant
    // events availability is on (defaults to false); enable it before any run.
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
    evaluate.describe(dataset.id, () => {
      const collectedExamples: CollectedQueryGenExample[] = [];
      // Guards against two distinct scenario ids sanitizing to the same index
      // name, which would otherwise silently clobber each other's replay data.
      const claimedIndexNames = new Map<string, string>();

      evaluate.beforeAll(async ({ esClient, log }) => {
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

          // KIs are derived deterministically from the extraction scenario's
          // expected_ground_truth (canonical source). Scenarios without ground
          // truth can't produce canonical KIs, so they're skipped.
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

          if (canonicalKIs.length === 0) {
            log.info(
              `No canonical KIs for scenario "${scenario.input.scenario_id}" ` +
                `(missing expected_ground_truth) - skipping`
            );
            continue;
          }

          const indexName = queryGenReplayIndexName(scenario.input.scenario_id);
          const existingClaim = claimedIndexNames.get(indexName);
          if (existingClaim) {
            throw new Error(
              `Scenarios "${existingClaim}" and "${scenario.input.scenario_id}" both map to replay ` +
                `index "${indexName}"; disambiguate their scenario ids.`
            );
          }
          claimedIndexNames.set(indexName, scenario.input.scenario_id);

          try {
            await esClient.indices
              .delete({ index: indexName, ignore_unavailable: true })
              .catch((error) =>
                log.debug(
                  `Pre-delete of "${indexName}" failed (continuing): ${
                    error instanceof Error ? error.message : String(error)
                  }`
                )
              );

            const stats = await replaySnapshotIntoIndex(
              esClient,
              log,
              source.snapshotName,
              source.gcs,
              indexName
            );

            if (stats.created === 0) {
              throw new Error(
                `No documents indexed after replaying snapshot "${source.snapshotName}" into "${indexName}"`
              );
            }

            if (stats.total > 0 && stats.skipped / stats.total > MAX_REPLAY_SKIP_RATE) {
              throw new Error(
                `Replay into "${indexName}" dropped ${stats.skipped}/${stats.total} docs ` +
                  `(> ${Math.round(
                    MAX_REPLAY_SKIP_RATE * 100
                  )}% mapping conflicts); data too partial to score`
              );
            }

            const sampleHits = await collectSampleDocuments({
              esClient,
              index: indexName,
              extractionScenario,
              queryGenerationScenario: scenario,
              log,
            });

            const sampleDocs = sampleHits
              .map((hit) => hit._source)
              .filter((doc): doc is Record<string, unknown> => doc != null);

            const sampleLogs = sampleDocs.map((doc) => extractLogTextFromSourceDoc(doc));

            const computedKIs = getComputedKIFeaturesFromDocs({
              streamName: scenario.input.stream_name,
              docs: sampleDocs,
            });

            collectedExamples.push({
              scenario,
              kis: [...canonicalKIs, ...computedKIs],
              sampleLogs,
              sampleDocs,
              indexName,
              stream: buildSyntheticStream(indexName),
            });
          } catch (error) {
            log.warning(
              `Skipping scenario "${scenario.input.scenario_id}": ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }

        if (collectedExamples.length === 0) {
          log.info(`No scenarios available for dataset "${dataset.id}" - skipping`);
          evaluate.skip();
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
          traceEsClient,
          log,
          fetch,
        }) => {
          const heavyDataByScenario = new Map(
            collectedExamples.map((example) => [example.scenario.input.scenario_id, example])
          );

          const executeAgentBuilderTool = async (
            toolId: string,
            toolParams: Record<string, unknown>
          ) =>
            (await fetch('/api/agent_builder/tools/_execute', {
              method: 'POST',
              version: '2023-10-31',
              body: JSON.stringify({ tool_id: toolId, tool_params: toolParams }),
            })) as { results?: AgentBuilderToolResult[] };

          const groundingModes = resolveGroundingModes();
          const codeIndex = resolveCodeIndexForDataset(dataset.id);

          const examples = collectedExamples.map(({ scenario, indexName }) => ({
            id: scenario.input.scenario_id,
            input: {
              ...scenario.input,
              snapshot_source: scenario.snapshot_source,
            },
            output: {
              ...scenario.output,
              expected: scenario.output.expected_ground_truth,
            },
            metadata: {
              ...scenario.metadata,
              test_index: indexName,
            },
          }));

          const evaluatorsList = [
            ...createKIQueryGenerationEvaluators(
              esClient,
              {
                criteriaFn: evaluators.criteria.bind(evaluators),
              },
              logger
            ),
            evaluators.traceBasedEvaluators.inputTokens,
            evaluators.traceBasedEvaluators.outputTokens,
            evaluators.traceBasedEvaluators.cachedTokens,
            evaluators.traceBasedEvaluators.toolCalls,
            createSpanLatencyEvaluator({ traceEsClient, log, operationName: 'chat' }),
          ];

          // Tools bind to the scenario's isolated index, so parallel tasks never
          // collide on a shared stream name (and memory partitions by it too).
          const makeTask =
            (groundingMode: GroundingMode) =>
            async ({ input }: { input: KIQueryGenerationScenario['input'] }) => {
              const heavy = heavyDataByScenario.get(input.scenario_id);
              if (!heavy) {
                throw new Error(`No pre-collected data for scenario "${input.scenario_id}"`);
              }
              const { kis, sampleLogs, sampleDocs, indexName, stream } = heavy;

              const memoryTools = createMemoryDiscoveryTools({
                memoryService: new MemoryServiceImpl({ logger: logger.get('memory'), esClient }),
              });

              const eventSearchTool = createEvalSignificantEventSearchTool({
                executeTool: executeAgentBuilderTool,
                streamName: indexName,
                logger,
              });

              const groundingTools =
                groundingMode === 'grounded' && codeIndex
                  ? createEvalSemanticCodeSearchTools({
                      codeIndex,
                      logger,
                      executeTool: executeAgentBuilderTool,
                    })
                  : undefined;

              const kiTypeCounts = kis.reduce<Record<string, number>>((counts, ki) => {
                counts[ki.type] = (counts[ki.type] ?? 0) + 1;
                return counts;
              }, {});

              logger.info(
                `KI query generation input: scenario=${input.scenario_id}, ` +
                  `index=${indexName}, grounding=${groundingMode}, total_kis=${kis.length}, ` +
                  `ki_types=${JSON.stringify(kiTypeCounts)}, sample_logs=${sampleLogs.length}`
              );

              const promptSnippet = [
                groundingTools?.promptSnippet,
                memoryTools.promptSnippet,
                eventSearchTool.promptSnippet,
              ]
                .filter(Boolean)
                .join('\n');

              const { queries, toolUsage } = await identifyKIQueries({
                stream,
                esClient,
                inferenceClient,
                logger,
                signal: new AbortController().signal,
                systemPrompt: `${significantEventsPrompt}\n${promptSnippet}`,
                // Mirror production: the plugin excludes these at retrieval,
                // but the fixture still builds them — filter here to match.
                getFeatures: async () =>
                  kis.filter(
                    (feature) =>
                      !(QUERY_GENERATION_EXCLUDED_FEATURE_TYPES as readonly string[]).includes(
                        feature.type
                      )
                  ),
                additionalTools: {
                  ...memoryTools.tools,
                  ...eventSearchTool.tools,
                  ...groundingTools?.additionalTools,
                },
                additionalToolCallbacks: {
                  ...memoryTools.callbacks,
                  ...eventSearchTool.callbacks,
                  ...groundingTools?.additionalToolCallbacks,
                },
                maxSteps: groundingTools ? 12 : 8,
              });

              logger.info(
                `Tool usage: get_stream_features calls=${toolUsage.get_stream_features.calls}, failures=${toolUsage.get_stream_features.failures}; add_queries calls=${toolUsage.add_queries.calls}, failures=${toolUsage.add_queries.failures}; generated_queries=${queries.length}`
              );

              return {
                queries,
                toolUsage,
                traceId: getCurrentTraceId(),
                sample_logs: sampleLogs,
                sample_docs: sampleDocs,
                features: kis,
              };
            };

          for (const groundingMode of groundingModes) {
            if (groundingMode === 'grounded' && !codeIndex) {
              log.info(
                `[${dataset.id}] grounded variant skipped — set KI_QUERY_GENERATION_CODE_INDEX ` +
                  `(or KI_QUERY_GENERATION_CODE_INDICES) to an SCS code index, and ensure the SCS ` +
                  `Agent Builder tools are installed in the cluster.`
              );
              continue;
            }

            await executorClient.runExperiment(
              {
                datasets: [
                  {
                    name: `sigevents: KI query generation (${dataset.id}) [${groundingMode}]`,
                    description: `[${dataset.id}] KI query generation across scenarios [${groundingMode}]`,
                    examples,
                  },
                ],
                concurrency: QUERYGEN_CONCURRENCY,
                trustUpstreamDataset: TRUST_UPSTREAM,
                task: makeTask(groundingMode),
              },
              evaluatorsList
            );
          }
        }
      );

      evaluate.afterAll(async ({ esClient, log }) => {
        log.debug('Cleaning up KI query generation replay indices');
        await deleteQueryGenReplayIndices(esClient, log);
      });
    });
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
      async ({ executorClient, evaluators, esClient, inferenceClient, logger, apiServices }) => {
        if (!emptyDataStreamTestIndex) {
          throw new Error('Missing temporary test index for empty datastream evaluation');
        }

        await executorClient.runExperiment(
          {
            datasets: [
              {
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
            ],
            task: async () => {
              const { stream: streamFromApi } = await apiServices.streams.getStreamDefinition(
                emptyDataStreamTestIndex!
              );

              const { queries } = await identifyKIQueries({
                stream: streamFromApi as Streams.all.Definition,
                esClient,
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
