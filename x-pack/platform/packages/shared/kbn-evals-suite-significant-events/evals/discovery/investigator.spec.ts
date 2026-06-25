/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGEVENTS_INVESTIGATOR_AGENT_ID } from '@kbn/streams-plugin/server';
import { tags } from '@kbn/scout';
import { getCurrentTraceId } from '@kbn/evals';
import type { Detection } from '@kbn/streams-schema';

import type { GcsConfig } from '../../src/data_generators/replay';
import {
  listAvailableSnapshots,
  replayIntoManagedStream,
  SIGEVENTS_SNAPSHOT_RUN,
  SIGEVENTS_WIRED_ROOTS,
  cleanSignificantEventsDataStreams,
  ensureStreamsEnabled,
  deleteTemporaryReplayIndices,
  canonicalDetectionsFromGroundTruth,
} from '../../src/data_generators/replay';
import { loadDetectionsFromSnapshot } from '../../src/data_generators/load_from_snapshot';
import { replayKnowledgeIndicatorsSnapshot } from '../../src/data_generators/replay_knowledge_indicators_snapshot';
import { evaluate } from '../../src/evaluate';
import {
  getActiveDatasets,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  snapshotSourceKey,
} from '../../src/datasets';
import type { DiscoveryInvestigatorScenario } from '../../src/datasets';
import { createInvestigatorEvaluators } from '../../src/evaluators/discovery';
import { parseDiscoveries } from '../../src/evaluators/discovery/utils/parse_agent_output';
import { buildInvestigatorInput } from '../../src/evaluators/discovery/investigator/build_agent_input';

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

evaluate.describe(
  'Significant Events Discovery',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
      // The discovery agents gate availability on the significant-events UI setting; enable it
      // before any converse call (agent availability is cached per space).
      await kbnClient.uiSettings.update({ 'observability:streamsEnableSignificantEvents': true });
      log.info('Enabled significant events UI setting');

      const uniqueCatalogSources = new Map<string, GcsConfig>();
      for (const dataset of activeDatasets) {
        for (const scenario of dataset.discoveryInvestigator) {
          const source = resolveScenarioSnapshotSource({
            scenarioId: scenario.input.scenario_id,
            datasetGcs: dataset.gcs,
            snapshotSource: scenario.snapshot_source,
          });
          uniqueCatalogSources.set(snapshotCatalogKey(source.gcs), source.gcs);
        }
      }

      for (const [catalogSourceKey, gcs] of uniqueCatalogSources.entries()) {
        const availableSnapshots = await listAvailableSnapshots(esClient, log, gcs);
        availableSnapshotsBySource.set(catalogSourceKey, new Set(availableSnapshots));
      }
    });

    for (const dataset of activeDatasets) {
      if (dataset.discoveryInvestigator.length === 0) {
        continue;
      }

      for (const source of ['canonical', 'snapshot'] as const) {
        evaluate.describe(`${dataset.id} (${source})`, () => {
          interface CollectedExample {
            scenario: DiscoveryInvestigatorScenario;
            detections: Detection[];
            snapshotKey: string;
          }

          const collectedExamples: CollectedExample[] = [];
          const snapshotSources = new Map<string, { snapshotName: string; gcs: GcsConfig }>();

          evaluate.beforeAll(async ({ esClient, apiServices, log }) => {
            for (const scenario of dataset.discoveryInvestigator) {
              const snapshotSource = resolveScenarioSnapshotSource({
                scenarioId: scenario.input.scenario_id,
                datasetGcs: dataset.gcs,
                snapshotSource: scenario.snapshot_source,
              });

              const availableSnapshots =
                availableSnapshotsBySource.get(snapshotCatalogKey(snapshotSource.gcs)) ?? new Set();

              if (!availableSnapshots.has(snapshotSource.snapshotName)) {
                if (source === 'snapshot') {
                  log.info(
                    `Snapshot "${snapshotSource.snapshotName}" not found in run "${SIGEVENTS_SNAPSHOT_RUN}" ` +
                      `(source: ${snapshotSource.gcs.bucket}/${snapshotSource.gcs.basePathPrefix}) — skipping snapshot variant for scenario "${scenario.input.scenario_id}"`
                  );
                  continue;
                }
              }

              let detections: Detection[];

              if (source === 'canonical') {
                detections = canonicalDetectionsFromGroundTruth({
                  streamName: scenario.input.stream_name,
                  rules: scenario.input.detections,
                });
              } else {
                detections = await loadDetectionsFromSnapshot(
                  esClient,
                  log,
                  snapshotSource.snapshotName,
                  snapshotSource.gcs,
                  { kinds: ['detection', 'quiet'] }
                );
                if (detections.length === 0) {
                  log.info(
                    `No snapshot detections for "${snapshotSource.snapshotName}" — skipping snapshot variant`
                  );
                  continue;
                }
              }

              // Ensure KI features index is available by replaying the snapshot
              await cleanSignificantEventsDataStreams(esClient, log);
              for (const name of SIGEVENTS_WIRED_ROOTS) {
                await esClient.indices.deleteDataStream({ name }).catch(() => {});
                await esClient.indices
                  .delete({ index: name, ignore_unavailable: true })
                  .catch(() => {});
              }
              await ensureStreamsEnabled({ esClient, apiServices, log });

              const stats = await replayIntoManagedStream(
                esClient,
                log,
                snapshotSource.snapshotName,
                snapshotSource.gcs
              );

              if (stats.created === 0) {
                log.info(
                  `No documents indexed from snapshot "${snapshotSource.snapshotName}" — skipping`
                );
                continue;
              }

              await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });

              const key = snapshotSourceKey(snapshotSource);
              collectedExamples.push({ scenario, detections, snapshotKey: key });
              snapshotSources.set(scenario.input.scenario_id, snapshotSource);
            }

            if (collectedExamples.length === 0) {
              log.info(`No scenarios available for dataset "${dataset.id}" (${source}) — skipping`);
              evaluate.skip();
            }
          });

          evaluate(
            'Discovery investigator',
            async ({
              executorClient,
              evaluators,
              esClient,
              agentBuilderClient,
              apiServices,
              log,
            }) => {
              let lastReplayedSnapshotKey: string | undefined;

              const detectionsByScenario = new Map(
                collectedExamples.map(({ scenario, detections, snapshotKey }) => [
                  scenario.input.scenario_id,
                  { detections, snapshotKey },
                ])
              );

              await executorClient.runExperiment(
                {
                  datasets: [
                    {
                      name: `sigevents: Discovery investigator (${dataset.id}) (${source})`,
                      description: `[${dataset.id}] investigator agent across scenarios (${source})`,
                      examples: collectedExamples.map(({ scenario }) => ({
                        id: scenario.input.scenario_id,
                        input: { ...scenario.input, snapshot_source: scenario.snapshot_source },
                        output: { ...scenario.output, criteria: scenario.output.criteria },
                        metadata: {
                          ...scenario.metadata,
                          test_index: MANAGED_STREAM_SEARCH_PATTERN,
                        },
                      })),
                    },
                  ],
                  concurrency: 1,
                  trustUpstreamDataset: TRUST_UPSTREAM,
                  task: async ({ input }: { input: DiscoveryInvestigatorScenario['input'] }) => {
                    const data = detectionsByScenario.get(input.scenario_id);
                    if (!data) {
                      throw new Error(`No pre-collected data for scenario "${input.scenario_id}"`);
                    }

                    const { detections, snapshotKey } = data;
                    const snapshotSource = snapshotSources.get(input.scenario_id);
                    if (!snapshotSource) {
                      throw new Error(
                        `No snapshot source found for scenario "${input.scenario_id}"`
                      );
                    }

                    if (snapshotKey !== lastReplayedSnapshotKey) {
                      await cleanSignificantEventsDataStreams(esClient, log);
                      for (const name of SIGEVENTS_WIRED_ROOTS) {
                        await esClient.indices.deleteDataStream({ name }).catch(() => {});
                        await esClient.indices
                          .delete({ index: name, ignore_unavailable: true })
                          .catch(() => {});
                      }
                      await ensureStreamsEnabled({ esClient, apiServices, log });
                      const stats = await replayIntoManagedStream(
                        esClient,
                        log,
                        snapshotSource.snapshotName,
                        snapshotSource.gcs
                      );
                      if (stats.created === 0) {
                        throw new Error(
                          `No documents indexed after replaying snapshot "${snapshotSource.snapshotName}"`
                        );
                      }
                      await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });
                      lastReplayedSnapshotKey = snapshotKey;
                    }

                    // Replay the captured knowledge indicators (features + queries) into the LIVE KI
                    // data stream so the real search_knowledge_indicators tool resolves them when we
                    // invoke the agent over /converse.
                    await replayKnowledgeIndicatorsSnapshot(
                      esClient,
                      log,
                      snapshotSource.snapshotName,
                      snapshotSource.gcs
                    );

                    // Build the investigator's user message (same shape as the production batch).
                    const agentInput = buildInvestigatorInput({
                      episodeSuffix: Date.now().toString(36).slice(-8),
                      detections,
                      continuationCandidates: input.continuation_candidates ?? [],
                    });

                    // Invoke the REAL investigator agent (its instructions, tools, runtime).
                    const converseResult = await agentBuilderClient.converse({
                      agentId: SIGEVENTS_INVESTIGATOR_AGENT_ID,
                      input: agentInput,
                    });

                    return {
                      // The agent returns its result as JSON in the final message (no emit tool /
                      // structured_output on the public converse API); parse it for the evaluators.
                      discoveries: parseDiscoveries(converseResult.message),
                      // Raw converse steps — the trajectory and grounding evaluators read tool calls.
                      steps: converseResult.steps,
                      // The agent runs inline (local execution), so its gen_ai spans nest under the
                      // eval's trace — tag with that id, like the inferenceClient-based evals. This
                      // keeps trace metrics correlatable against the default cluster (no TRACING_ES_URL).
                      traceId: getCurrentTraceId(),
                    };
                  },
                },
                [
                  ...createInvestigatorEvaluators(esClient, {
                    criteriaFn: evaluators.criteria.bind(evaluators),
                  }),
                  evaluators.traceBasedEvaluators.inputTokens,
                  evaluators.traceBasedEvaluators.outputTokens,
                  evaluators.traceBasedEvaluators.cachedTokens,
                  evaluators.traceBasedEvaluators.toolCalls,
                  evaluators.traceBasedEvaluators.latency,
                ]
              );
            }
          );

          evaluate.afterAll(async ({ esClient, apiServices, log }) => {
            log.debug('Cleaning up investigator test data');
            await deleteTemporaryReplayIndices(esClient, log);
            await apiServices.streams.disable().catch(() => {});
            await cleanSignificantEventsDataStreams(esClient, log);
          });
        });
      }
    }
  }
);
