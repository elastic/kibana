/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGEVENTS_JUDGE_INSTRUCTIONS } from '@kbn/streams-plugin/server';
import { tags } from '@kbn/scout';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { Discovery } from '@kbn/streams-schema';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  listAvailableSnapshots,
  replayIntoManagedStream,
  SIGEVENTS_SNAPSHOT_RUN,
  SIGEVENTS_WIRED_ROOTS,
  cleanSignificantEventsDataStreams,
  ensureStreamsEnabled,
  deleteTemporaryReplayIndices,
} from '../../src/data_generators/replay';
import { loadDiscoveriesFromSnapshot } from '../../src/data_generators/load_discoveries_from_snapshot';
import { evaluate } from '../../src/evaluate';
import {
  getActiveDatasets,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  snapshotSourceKey,
} from '../../src/datasets';
import type { DiscoveryJudgeScenario } from '../../src/datasets';
import { JUDGE_ADVERSARIAL_SCENARIOS } from '../../src/datasets/judge_adversarial_scenarios';
import { runDiscoveryJudge } from '../../src/agents';
import { createJudgeEvaluators } from '../../src/evaluators/discovery';

// ---------------------------------------------------------------------------
// Output schema (copied from triage.yaml run_judge_agent step)
// ---------------------------------------------------------------------------
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    significant_events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          discovery_id: {
            type: 'string',
            description: 'Echo verbatim from the input discovery doc. READ-ONLY.',
          },
          discovery_slug: {
            type: 'string',
            description: 'Echo verbatim from the input discovery doc. READ-ONLY.',
          },
          status: {
            type: 'string',
            enum: ['promoted', 'acknowledged', 'demoted', 'resolved'],
            description:
              'promoted: active incident requiring immediate action. acknowledged: real issue, not critical enough for immediate escalation. demoted: insignificant or confirmed false positive. resolved: alerts genuinely stopped (kind:clearance inputs only).',
          },
          criticality: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: "Judge's own severity assessment 0–100.",
          },
          confidence: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: 'Confidence in this verdict 0–100.',
          },
          summary: {
            type: 'string',
            description:
              'Operator notification — always emit for promoted and acknowledged. Lead with service + operator-visible symptom; name the exposed path when dependency_edges has exposed entries; close with the single most time-sensitive on-call action. One to two sentences. For demoted/resolved: omit unless you have a material correction.',
          },
          root_cause: {
            type: 'string',
            description:
              'Corrected probable-cause hypothesis. Omit when nothing contradicts the discovery. Must cite KI name + row_count and keep the causal chain coherent.',
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' },
            description:
              '3 candidate stop-the-bleeding actions ranked by likelihood of stopping user impact. These are operational attempts — not a guaranteed fix sequence. Order from most reversible and most targeted to broader interventions. Each must name the specific service or error code observed in evidences and include the exact operational command (kubectl, helm, systemctl, CLI). No ES|QL or diagnostic queries — investigation is complete. Required for promoted and acknowledged.',
          },
          assessment_note: {
            type: 'string',
            description:
              'Adversarial reasoning trace: what was independently verified, what signals confirmed or contradicted the discovery, and how criticality and status were calibrated. Not operator-facing. Required for promoted and acknowledged; brief for demoted and resolved.',
          },
        },
        required: [
          'discovery_id',
          'discovery_slug',
          'status',
          'criticality',
          'confidence',
          'assessment_note',
        ],
      },
    },
  },
  required: ['significant_events'],
};

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

const JUDGE_SYSTEM_PROMPT = SIGEVENTS_JUDGE_INSTRUCTIONS;

// ---------------------------------------------------------------------------
// Eval spec
// ---------------------------------------------------------------------------

evaluate.describe('sigevents: judge agent', { tag: tags.serverless.observability.complete }, () => {
  const activeDatasets = getActiveDatasets();
  const availableSnapshotsBySource = new Map<string, Set<string>>();

  // -----------------------------------------------------------------------
  // Outer beforeAll: catalog available snapshots for all dataset scenarios
  // -----------------------------------------------------------------------
  evaluate.beforeAll(async ({ esClient, log }) => {
    const uniqueCatalogSources = new Map<string, GcsConfig>();
    for (const dataset of activeDatasets) {
      for (const scenario of dataset.discoveryJudge) {
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

  // -----------------------------------------------------------------------
  // Adversarial block — dataset-independent, runs once
  // -----------------------------------------------------------------------
  evaluate.describe('adversarial', () => {
    evaluate(
      'judge agent adversarial scenarios',
      async ({
        executorClient,
        evaluators,
        esClient,
        inferenceClient,
        evaluationConnector,
        logger,
        traceEsClient,
        log,
      }) => {
        const boundInferenceClient = inferenceClient.bindTo({
          connectorId: evaluationConnector.id,
        });

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'sigevents: judge agent (adversarial)',
                description: 'Canonical adversarial scenarios for the judge agent',
                examples: JUDGE_ADVERSARIAL_SCENARIOS.map((scenario) => ({
                  id: scenario.input.scenario_id,
                  input: scenario.input,
                  output: scenario.output,
                  metadata: scenario.metadata,
                })),
              },
            ],
            concurrency: 1,
            trustUpstreamDataset: TRUST_UPSTREAM,
            task: async ({ input }: { input: DiscoveryJudgeScenario['input'] }) => {
              const discoveries = input.discoveries as Discovery[];

              const { significantEvents, toolUsage } = await runDiscoveryJudge({
                systemPrompt: JUDGE_SYSTEM_PROMPT,
                outputSchema: OUTPUT_SCHEMA,
                discoveries,
                inferenceClient: boundInferenceClient,
                esClient,
                logger,
                signal: new AbortController().signal,
              });

              return {
                significantEvents,
                toolUsage,
                inputDiscoveries: discoveries,
                traceId: getCurrentTraceId(),
              };
            },
          },
          [
            ...createJudgeEvaluators({
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
  });

  // -----------------------------------------------------------------------
  // Per-dataset blocks — dual-source (canonical + snapshot)
  // -----------------------------------------------------------------------
  for (const dataset of activeDatasets) {
    if (dataset.discoveryJudge.length === 0) {
      continue;
    }

    for (const source of ['canonical', 'snapshot'] as const) {
      evaluate.describe(`${dataset.id} (${source})`, () => {
        interface CollectedExample {
          scenario: DiscoveryJudgeScenario;
          discoveries: Discovery[];
          snapshotKey: string;
        }

        const collectedExamples: CollectedExample[] = [];
        const snapshotSources = new Map<string, { snapshotName: string; gcs: GcsConfig }>();

        evaluate.beforeAll(async ({ esClient, apiServices, log }) => {
          for (const scenario of dataset.discoveryJudge) {
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

            let discoveries: Discovery[];

            if (source === 'canonical') {
              discoveries = scenario.input.discoveries as Discovery[];
            } else {
              discoveries = await loadDiscoveriesFromSnapshot(
                esClient,
                log,
                snapshotSource.snapshotName,
                snapshotSource.gcs
              );
              if (discoveries.length === 0) {
                log.info(
                  `No snapshot discoveries for "${snapshotSource.snapshotName}" — skipping snapshot variant`
                );
                continue;
              }
            }

            // Ensure the managed stream is replayed so ES|QL queries in judge can execute
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
            collectedExamples.push({ scenario, discoveries, snapshotKey: key });
            snapshotSources.set(scenario.input.scenario_id, snapshotSource);
          }

          if (collectedExamples.length === 0) {
            log.info(`No scenarios available for dataset "${dataset.id}" (${source}) — skipping`);
            evaluate.skip();
          }
        });

        evaluate(
          'judge agent',
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

            const discoveriesByScenario = new Map(
              collectedExamples.map(({ scenario, discoveries, snapshotKey }) => [
                scenario.input.scenario_id,
                { discoveries, snapshotKey },
              ])
            );

            await executorClient.runExperiment(
              {
                datasets: [
                  {
                    name: `sigevents: judge agent (${dataset.id}) (${source})`,
                    description: `[${dataset.id}] judge agent across scenarios (${source})`,
                    examples: collectedExamples.map(({ scenario }) => ({
                      id: scenario.input.scenario_id,
                      input: { ...scenario.input, snapshot_source: scenario.snapshot_source },
                      output: scenario.output,
                      metadata: {
                        ...scenario.metadata,
                        test_index: MANAGED_STREAM_SEARCH_PATTERN,
                      },
                    })),
                  },
                ],
                concurrency: 1,
                trustUpstreamDataset: TRUST_UPSTREAM,
                task: async ({ input }: { input: DiscoveryJudgeScenario['input'] }) => {
                  const data = discoveriesByScenario.get(input.scenario_id);
                  if (!data) {
                    throw new Error(`No pre-collected data for scenario "${input.scenario_id}"`);
                  }

                  const { discoveries, snapshotKey } = data;
                  const snapshotSource = snapshotSources.get(input.scenario_id);
                  if (!snapshotSource) {
                    throw new Error(`No snapshot source found for scenario "${input.scenario_id}"`);
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

                  const { significantEvents, toolUsage } = await runDiscoveryJudge({
                    systemPrompt: JUDGE_SYSTEM_PROMPT,
                    outputSchema: OUTPUT_SCHEMA,
                    discoveries,
                    inferenceClient: boundInferenceClient,
                    esClient,
                    logger,
                    signal: new AbortController().signal,
                  });

                  return {
                    significantEvents,
                    toolUsage,
                    inputDiscoveries: discoveries,
                    traceId: getCurrentTraceId(),
                  };
                },
              },
              [
                ...createJudgeEvaluators({
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
          log.debug('Cleaning up judge test data');
          await deleteTemporaryReplayIndices(esClient, log);
          await apiServices.streams.disable().catch(() => {});
          await cleanSignificantEventsDataStreams(esClient, log);
        });
      });
    }
  }
});
