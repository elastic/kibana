/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGEVENTS_INVESTIGATOR_INSTRUCTIONS } from '@kbn/streams-plugin/server';
import { tags } from '@kbn/scout';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
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
  loadKIFeaturesFromSnapshot,
} from '../../src/data_generators/replay';
import { loadDetectionsFromSnapshot } from '../../src/data_generators/load_detections_from_snapshot';
import { evaluate } from '../../src/evaluate';
import {
  getActiveDatasets,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  snapshotSourceKey,
} from '../../src/datasets';
import type { DiscoveryInvestigatorScenario } from '../../src/datasets';
import { runDiscoveryInvestigator } from '../../src/agents';
import { createInvestigatorEvaluators } from '../../src/evaluators/discovery';

// ---------------------------------------------------------------------------
// Output schema (copied from discovery.yaml run_investigator_agent step)
// ---------------------------------------------------------------------------
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    discoveries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          root_cause: { type: 'string' },
          criticality: { type: 'integer', minimum: 0, maximum: 100 },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          kind: {
            type: 'string',
            enum: ['discovery', 'clearance'],
          },
          parent_discovery_id: { type: 'string' },
          detections: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['detection_id', 'rule_name', 'rule_uuid'],
              properties: {
                detection_id: { type: 'string' },
                kind: { type: 'string', enum: ['detection', 'quiet', 'handled'] },
                rule_name: { type: 'string' },
                rule_uuid: { type: 'string' },
                stream_name: { type: 'string' },
                change_point_type: { type: 'string' },
                p_value: { type: 'number' },
                alert_count: { type: 'integer' },
              },
            },
          },
          dependency_edges: {
            type: 'array',
            items: {
              type: 'object',
              required: ['source', 'target'],
              properties: {
                source: { type: 'string' },
                target: { type: 'string' },
                protocol: { type: 'string' },
                exposure: { type: 'string', enum: ['exposed', 'not_exposed'] },
              },
            },
          },
          infra_components: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                workloads: { type: 'array', items: { type: 'string' } },
                exposure: { type: 'string', enum: ['exposed', 'not_exposed'] },
              },
            },
          },
          cause_kis: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, stream_name: { type: 'string' } },
            },
          },
          evidences: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rule_name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                result: { type: 'string', enum: ['found', 'empty', 'error'] },
                description: { type: 'string' },
                stream_name: { type: 'string' },
                row_count: { type: 'integer' },
                collected_at: { type: 'string' },
                esql_query: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              },
            },
          },
          discovery_slug: {
            type: 'string',
            pattern: '^[a-z0-9-]+__[a-z0-9-]+$',
          },
        },
        required: [
          'kind',
          'title',
          'summary',
          'criticality',
          'confidence',
          'detections',
          'cause_kis',
          'discovery_slug',
          'dependency_edges',
          'infra_components',
          'evidences',
        ],
      },
    },
  },
  required: ['discoveries'],
};

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

const INVESTIGATOR_SYSTEM_PROMPT = SIGEVENTS_INVESTIGATOR_INSTRUCTIONS;

// ---------------------------------------------------------------------------
// Eval spec
// ---------------------------------------------------------------------------

evaluate.describe(
  'sigevents: investigator agent',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, log }) => {
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
                detections = scenario.input.detections as Detection[];
              } else {
                detections = await loadDetectionsFromSnapshot(
                  esClient,
                  log,
                  snapshotSource.snapshotName,
                  snapshotSource.gcs
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
            'investigator agent',
            async ({
              executorClient,
              evaluators,
              esClient,
              inferenceClient,
              evaluationConnector,
              logger,
              apiServices,
              traceEsClient,
              log,
            }) => {
              const boundInferenceClient = inferenceClient.bindTo({
                connectorId: evaluationConnector.id,
              });

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
                      name: `sigevents: investigator agent (${dataset.id}) (${source})`,
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

                    // Load KI features from snapshot for in-memory resolution
                    const knowledgeIndicators = await loadKIFeaturesFromSnapshot(
                      esClient,
                      log,
                      snapshotSource.snapshotName,
                      snapshotSource.gcs,
                      input.stream_name
                    );

                    const { discoveries, toolUsage } = await runDiscoveryInvestigator({
                      systemPrompt: INVESTIGATOR_SYSTEM_PROMPT,
                      outputSchema: OUTPUT_SCHEMA,
                      detections,
                      continuationCandidates:
                        (input.continuation_candidates as
                          | import('@kbn/streams-schema').Discovery[]
                          | undefined) ?? [],
                      knowledgeIndicators,
                      inferenceClient: boundInferenceClient,
                      esClient,
                      logger,
                      signal: new AbortController().signal,
                    });

                    return { discoveries, toolUsage, traceId: getCurrentTraceId() };
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
                  createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
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
