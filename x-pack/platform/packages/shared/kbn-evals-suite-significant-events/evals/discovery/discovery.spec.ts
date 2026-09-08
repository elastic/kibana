/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from '@kbn/significant-events-plugin/server';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import { tags } from '@kbn/scout';
import { getCurrentTraceId } from '@kbn/evals';
import type { Detection, SignificantEvent } from '@kbn/significant-events-schema';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  replayIntoManagedStream,
  SIGEVENTS_SNAPSHOT_RUN,
  SIGEVENTS_WIRED_ROOTS,
  cleanSignificantEventsDataStreams,
  ensureStreamsEnabled,
  deleteTemporaryReplayIndices,
  canonicalDetectionsFromGroundTruth,
  resetMemoryPages,
  replayIntoMemoryPages,
  shiftSnapshotTimestamp,
  type ReplayShift,
} from '../../src/data_generators/replay';
import { replayKnowledgeIndicatorsSnapshot } from '../../src/data_generators/replay_knowledge_indicators_snapshot';
import { seedChronicBackground } from '../../src/data_generators/seed_chronic_background';
import { evaluate } from '../../src/evaluate';
import {
  getActiveDatasets,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  snapshotSourceKey,
} from '../../src/datasets';
import type { DiscoveryScenario } from '../../src/datasets';
import {
  createDiscoveryEvaluators,
  createContinuationEvaluators,
} from '../../src/evaluators/discovery';
import { buildAvailableSnapshotsBySource } from '../shared';
import {
  extractDiscoveriesFromToolCall,
  extractSignificantEventsFromToolCall,
  extractRequestedEventIdsFromToolCall,
  extractWriteItemsFromToolCall,
} from '../../src/evaluators/discovery/utils/parse_agent_output';
import { buildDiscoveryInput } from '../../src/evaluators/discovery/discovery/build_agent_input';
import type { ContinuationCycle } from '../../src/evaluators/discovery/discovery/continuation/continuation_stability';

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

/** Events data stream — the index the discovery agent writes to via events_write. */
const SIGNIFICANT_EVENTS_EVENTS_DATA_STREAM = '.significant_events-events';

evaluate.describe(
  'Nightshift Triager - Discovery Agent',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
      // Agent availability is gated on the significant events availability feature flag (defaults to
      // false); force it on before any converse.
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
        (dataset) => dataset.discovery,
        esClient,
        log
      );
      snapshots.forEach((v, k) => availableSnapshotsBySource.set(k, v));
    });

    for (const dataset of activeDatasets) {
      if (dataset.discovery.length === 0) {
        continue;
      }

      evaluate.describe(dataset.id, () => {
        interface CollectedExample {
          scenario: DiscoveryScenario;
          detections: Detection[];
          snapshotKey: string;
        }
        interface ContinuationPlan {
          path: string;
          sequence: Detection[];
          expectReuse?: boolean;
          expectTopologyEventSearch?: boolean;
          seedStatus?: 'closed';
          stripSeedTopology?: boolean;
        }

        const collectedExamples: CollectedExample[] = [];
        const snapshotSources = new Map<string, { snapshotName: string; gcs: GcsConfig }>();

        evaluate.beforeAll(async ({ esClient, apiServices, log }) => {
          const replayedSnapshotKeys = new Set<string>();

          for (const scenario of dataset.discovery) {
            const snapshotSource = resolveScenarioSnapshotSource({
              scenarioId: scenario.input.scenario_id,
              datasetGcs: dataset.gcs,
              snapshotSource: scenario.snapshot_source,
            });
            const key = snapshotSourceKey(snapshotSource);

            const availableSnapshots =
              availableSnapshotsBySource.get(snapshotCatalogKey(snapshotSource.gcs)) ?? new Set();

            if (!availableSnapshots.has(snapshotSource.snapshotName)) {
              log.info(
                `Snapshot "${snapshotSource.snapshotName}" not found in run "${SIGEVENTS_SNAPSHOT_RUN}" ` +
                  `(source: ${snapshotSource.gcs.bucket}/${snapshotSource.gcs.basePathPrefix}) — skipping scenario "${scenario.input.scenario_id}"`
              );
              continue;
            }

            if (!replayedSnapshotKeys.has(key)) {
              // Ensure KI features index is available by replaying the snapshot once per source.
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
              replayedSnapshotKeys.add(key);
            }

            // Detections always come from the canonical dataset regardless of source mode.
            // The snapshot only provides logs and KIs replayed into ES — schema changes
            // between snapshot capture and current code make snapshot detections unreliable.
            // Change points are re-stamped onto the replayed timeline inside each task, using
            // the shift of the replay the agent actually queries.
            const detections = canonicalDetectionsFromGroundTruth({
              streamName: scenario.input.stream_name,
              rules: scenario.input.detections,
            });

            collectedExamples.push({ scenario, detections, snapshotKey: key });
            snapshotSources.set(scenario.input.scenario_id, snapshotSource);
          }

          if (collectedExamples.length === 0) {
            log.info(`No scenarios available for dataset "${dataset.id}" — skipping`);
            evaluate.skip();
          }
        });

        evaluate(
          'Discovery agent',
          async ({
            executorClient,
            evaluators,
            esClient,
            kbnClient,
            agentBuilderClient,
            apiServices,
            log,
          }) => {
            // Concurrency must remain 1 — this variable is not safe under concurrent tasks.
            // Raising concurrency requires replacing it with a per-invocation approach or a proper lock.
            let lastReplayedSnapshotKey: string | undefined;
            let lastReplayShift: ReplayShift | undefined;

            const detectionsByScenario = new Map(
              collectedExamples.map(({ scenario, detections, snapshotKey }) => [
                scenario.input.scenario_id,
                { detections, snapshotKey, memoryPages: scenario.memoryPages },
              ])
            );
            const discoveryExamples = collectedExamples.filter(
              ({ scenario }) => !scenario.memoryPages?.length
            );
            const memoryExamples = collectedExamples.filter(
              ({ scenario }) => scenario.memoryPages?.length
            );

            await executorClient.runExperiment(
              {
                datasets: [
                  ...[
                    {
                      name: `sigevents: Discovery (${dataset.id})`,
                      description: `[${dataset.id}] discovery agent across scenarios`,
                      examples: discoveryExamples,
                    },
                    {
                      name: `sigevents: Discovery memory (${dataset.id})`,
                      description: `[${dataset.id}] discovery agent memory-aware scenarios`,
                      examples: memoryExamples,
                    },
                  ]
                    .filter(({ examples }) => examples.length > 0)
                    .map(({ name, description, examples }) => ({
                      name,
                      description,
                      examples: examples.map(({ scenario }) => ({
                        id: scenario.input.scenario_id,
                        input: {
                          ...scenario.input,
                          snapshot_source: scenario.snapshot_source,
                        },
                        output: { ...scenario.output, criteria: scenario.output.criteria },
                        metadata: {
                          ...scenario.metadata,
                          test_index: MANAGED_STREAM_SEARCH_PATTERN,
                        },
                      })),
                    })),
                ],
                concurrency: 1,
                trustUpstreamDataset: TRUST_UPSTREAM,
                task: async ({ input }: { input: DiscoveryScenario['input'] }) => {
                  const data = detectionsByScenario.get(input.scenario_id);
                  if (!data) {
                    throw new Error(`No pre-collected data for scenario "${input.scenario_id}"`);
                  }

                  const { detections, snapshotKey, memoryPages } = data;
                  const snapshotSource = snapshotSources.get(input.scenario_id);
                  if (!snapshotSource) {
                    throw new Error(`No snapshot source found for scenario "${input.scenario_id}"`);
                  }

                  // Each scenario must start with an empty events index. Scenarios that share a
                  // snapshot (e.g. ledger-db-disconnect-misgrouped-auth) are independent episodes.
                  await cleanSignificantEventsDataStreams(esClient, log, { includeLogs: false });

                  // Memory must be hermetic per scenario: prior scenarios may have seeded pages or
                  // the agent may have created first-sight chronic pages — either would leak a
                  // severity cap (or its absence) into this scenario's grading.
                  await resetMemoryPages({ esClient, log });
                  if (memoryPages && memoryPages.length > 0) {
                    await replayIntoMemoryPages({
                      log,
                      kbnClient,
                      memoryPages,
                    });
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
                    lastReplayShift = {
                      maxTimestamp: stats.maxTimestamp,
                      replayNow: stats.replayNow,
                    };
                  }

                  // Replay captured KIs into the live KI stream so search_knowledge_indicators
                  // resolves them over /converse.
                  await replayKnowledgeIndicatorsSnapshot(
                    esClient,
                    log,
                    snapshotSource.snapshotName,
                    snapshotSource.gcs
                  );

                  // Stamp detection change points onto the timeline of the replay the agent will
                  // actually query, so the grounding skill's pre/post rate windows frame the real
                  // incident neighborhood instead of the canonical dummy timestamp. Chronic-seed
                  // scenarios instead seed a synthetic rate-flat pattern and stamp from its
                  // change point (already in live coordinates).
                  let stampedDetections = detections;
                  if (input.chronic_seed) {
                    const [rule] = detections;
                    const seeded = await seedChronicBackground({
                      esClient,
                      log,
                      streamName: input.stream_name,
                      ruleUuid: rule.rule_uuid,
                      ruleName: rule.rule_name ?? rule.rule_uuid,
                      config: input.chronic_seed,
                    });
                    stampedDetections = detections.map((d) => ({
                      ...d,
                      '@timestamp': seeded.detectionTimestamp,
                    }));
                  } else if (lastReplayShift) {
                    stampedDetections = canonicalDetectionsFromGroundTruth({
                      streamName: input.stream_name,
                      rules: input.detections,
                      shift: lastReplayShift,
                    });
                  }

                  // Same message shape as the production batch.
                  const agentInput = buildDiscoveryInput({ detections: stampedDetections });

                  const converseResult = await agentBuilderClient.converse({
                    agentId: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
                    input: agentInput,
                  });

                  return {
                    // Agent outputs via events_write tool calls; extract significant events from steps.
                    significantEvents: extractSignificantEventsFromToolCall(converseResult.steps),
                    // Thread the input detections through so snapshot-mode evaluators can access them.
                    inputDetections: stampedDetections,
                    // Raw steps — trajectory/grounding evaluators read tool calls from these.
                    steps: converseResult.steps,
                    // Agent runs inline, so its gen_ai spans nest under the eval's trace.
                    traceId: getCurrentTraceId(),
                  };
                },
              },
              [
                ...createDiscoveryEvaluators({
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

        const continuationSuites = [
          {
            title: 'continuation - open significant event with same rules',
            description:
              'same detection rule re-fires during an open significant event; events_write must include topology arrays',
            includesPath: (path: string) => path === 'rule-uuid-no-topology',
          },
          {
            title: 'continuation - open significant events with topology-related rules',
            description:
              'topology-linked cascading rules join an open significant event; events_write must send expected causal_features and blast_radius',
            includesPath: (path: string) => path === 'cascade',
          },
          {
            title: 'continuation - closed significant event',
            description:
              'a detection starts a new significant event after the prior event closes; the new write must include topology arrays',
            includesPath: (path: string) => path === 'rule-uuid-closed',
          },
        ] as const;

        for (const continuationSuite of continuationSuites) {
          evaluate(
            `Discovery agent — ${continuationSuite.title}`,
            async ({
              executorClient,
              evaluators,
              esClient,
              agentBuilderClient,
              apiServices,
              log,
            }) => {
              // One run per (scenario × path): rule-uuid re-fires the anchor; cascade resolves the
              // declared ordered rule_name chain to detections. Keep runs with ≥2 cycles (one
              // establishing + one gradable follow-up).
              const runs = collectedExamples.flatMap(({ scenario, detections, snapshotKey }) => {
                if (detections.length === 0) return [];
                if (scenario.memoryPages?.length) return [];
                // Chronic-seeded scenarios grade the rate gate only; continuation policy for
                // known-chronic patterns is owned by the memory-usage work.
                if (scenario.input.chronic_seed) return [];
                const byRuleName = new Map(detections.map((d) => [d.rule_name, d]));
                const continuationChains = Object.entries(scenario.continuationChains ?? {});
                const allPlans: ContinuationPlan[] = [
                  {
                    path: 'rule-uuid-no-topology',
                    sequence: [detections[0], detections[0]],
                    stripSeedTopology: true,
                  },
                  {
                    path: 'rule-uuid-closed',
                    sequence: [detections[0], detections[0]],
                    expectReuse: false,
                    seedStatus: 'closed',
                  },
                  ...continuationChains
                    .filter(([path]) => path === 'cascade')
                    .map(
                      ([path, ruleNames]): ContinuationPlan => ({
                        path,
                        expectTopologyEventSearch: true,
                        sequence: ruleNames
                          .map((name) => byRuleName.get(name))
                          .filter((d): d is Detection => Boolean(d)),
                      })
                    ),
                ];
                const plans = allPlans.filter(
                  (plan) => plan.sequence.length >= 2 && continuationSuite.includesPath(plan.path)
                );

                return plans.map((plan) => ({
                  id: `${scenario.input.scenario_id}__${plan.path}`,
                  scenario,
                  sequence: plan.sequence,
                  snapshotKey,
                  expectReuse: plan.expectReuse,
                  expectTopologyEventSearch: plan.expectTopologyEventSearch,
                  seedStatus: plan.seedStatus,
                  stripSeedTopology: plan.stripSeedTopology,
                }));
              });

              if (runs.length === 0) {
                log.info(`No gradable continuation runs for dataset "${dataset.id}" — skipping`);
                evaluate.skip();
                return;
              }

              const runById = new Map(runs.map((run) => [run.id, run]));
              let lastReplayedSnapshotKey: string | undefined;
              let lastReplayShift: ReplayShift | undefined;

              await executorClient.runExperiment(
                {
                  datasets: [
                    {
                      name: `sigevents: Discovery agent ${continuationSuite.title} (${dataset.id})`,
                      description: `[${dataset.id}] ${continuationSuite.description}`,
                      examples: runs.map((run) => ({
                        id: run.id,
                        input: {
                          ...run.scenario.input,
                          snapshot_source: run.scenario.snapshot_source,
                          continuation_run: run.id,
                        },
                        output: { ...run.scenario.output },
                        metadata: {
                          ...run.scenario.metadata,
                          test_index: MANAGED_STREAM_SEARCH_PATTERN,
                          continuation_expect_reuse: run.expectReuse ?? true,
                          continuation_expect_topology_event_search:
                            run.expectTopologyEventSearch ?? false,
                          continuation_seed_status: run.seedStatus,
                          continuation_without_topology: run.stripSeedTopology,
                        },
                      })),
                    },
                  ],
                  concurrency: 1,
                  trustUpstreamDataset: TRUST_UPSTREAM,
                  task: async ({
                    input,
                  }: {
                    input: DiscoveryScenario['input'] & { continuation_run: string };
                  }) => {
                    const run = runById.get(input.continuation_run);
                    if (!run) {
                      throw new Error(`No continuation run "${input.continuation_run}"`);
                    }

                    // Continuation examples must not inherit events from a previous path.
                    // The cycles within this task still share state.
                    await cleanSignificantEventsDataStreams(esClient, log, { includeLogs: false });

                    // Wipe memory pages so first-sight chronic pages created by earlier runs do
                    // not cap this run's severity reasoning.
                    await resetMemoryPages({ esClient, log });

                    const snapshotSource = snapshotSources.get(input.scenario_id);
                    if (!snapshotSource) {
                      throw new Error(
                        `No snapshot source found for scenario "${input.scenario_id}"`
                      );
                    }

                    if (run.snapshotKey !== lastReplayedSnapshotKey) {
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
                      lastReplayedSnapshotKey = run.snapshotKey;
                      lastReplayShift = {
                        maxTimestamp: stats.maxTimestamp,
                        replayNow: stats.replayNow,
                      };
                    }

                    await replayKnowledgeIndicatorsSnapshot(
                      esClient,
                      log,
                      snapshotSource.snapshotName,
                      snapshotSource.gcs
                    );

                    const cycles: ContinuationCycle[] = [];
                    // Tracks event_ids seeded by this run so they can be deleted after all cycles
                    // complete. Without this cleanup the next run's cycle-0 event_search would
                    // find the previous run's open episodes and either reuse a foreign event ID or
                    // produce spurious noise. Deleting by explicit IDs is safer than wiping the
                    // entire stream and works correctly even when concurrency > 1.
                    const seededEventUuids: string[] = [];

                    try {
                      // Feed one detection per cycle, oldest first. After each cycle, seed a
                      // SignificantEvent into the events data stream for each produced event so the
                      // next cycle's `event_search status: "open"` call finds it.
                      for (let i = 0; i < run.sequence.length; i++) {
                        const base = run.sequence[i];
                        // Same re-stamping as the discovery task: change points must live on the
                        // replayed timeline for the grounding rate windows to be meaningful.
                        const authored = run.scenario.input.detections.find(
                          (r) => r.rule_uuid === base.rule_uuid
                        )?.['@timestamp'];
                        const detection: Detection = {
                          ...base,
                          ...(authored && lastReplayShift
                            ? {
                                '@timestamp': shiftSnapshotTimestamp({
                                  timestamp: authored,
                                  ...lastReplayShift,
                                }),
                              }
                            : {}),
                          detection_id: `${base.detection_id ?? base.rule_uuid}-fire-${i}`,
                        };
                        const agentInput = buildDiscoveryInput({ detections: [detection] });

                        const converseResult = await agentBuilderClient.converse({
                          agentId: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
                          input: agentInput,
                        });

                        const significantEvents = extractDiscoveriesFromToolCall(
                          converseResult.steps
                        );
                        if (significantEvents.some((event) => event.event_id)) {
                          await esClient.indices.refresh({
                            index: SIGNIFICANT_EVENTS_EVENTS_DATA_STREAM,
                          });
                        }
                        const producedEventIds = significantEvents
                          .map((event) => event.event_id)
                          .filter((eventId): eventId is string => Boolean(eventId));

                        cycles.push({
                          ruleName: detection.rule_name,
                          producedEventIds,
                          producedEvents: significantEvents.map((event) => ({
                            event_id: event.event_id,
                            severity: event.severity,
                            status: event.status,
                          })),
                          requestedEventIds: extractRequestedEventIdsFromToolCall(
                            converseResult.steps
                          ),
                          writeItems: extractWriteItemsFromToolCall(converseResult.steps),
                          expectReuse: i === 0 ? undefined : run.expectReuse ?? true,
                          expectTopologyEventSearch: run.expectTopologyEventSearch,
                          steps: converseResult.steps,
                        });

                        // Seed a SignificantEvent per produced event so event_search resolves it
                        // as an open episode in subsequent cycles.
                        for (const [idx, event] of significantEvents.entries()) {
                          if (!event.event_id) continue;
                          const eventUuid = `${event.event_id}-cycle-${i}-${idx}`;
                          const seededEvent: SignificantEvent = {
                            ...event,
                            '@timestamp': event['@timestamp'] ?? new Date().toISOString(),
                            event_uuid: eventUuid,
                            ...(run.stripSeedTopology
                              ? { causal_features: [], blast_radius: [] }
                              : {}),
                            ...(i === 0 && run.seedStatus ? { status: run.seedStatus } : {}),
                          };

                          await esClient.index({
                            index: SIGNIFICANT_EVENTS_EVENTS_DATA_STREAM,
                            document: seededEvent,
                          });
                          seededEventUuids.push(eventUuid);
                        }
                        if (producedEventIds.length > 0) {
                          await esClient.indices.refresh({
                            index: SIGNIFICANT_EVENTS_EVENTS_DATA_STREAM,
                          });
                        }
                      }
                    } finally {
                      if (seededEventUuids.length > 0) {
                        await esClient.deleteByQuery({
                          index: SIGNIFICANT_EVENTS_EVENTS_DATA_STREAM,
                          query: { terms: { event_uuid: seededEventUuids } },
                          refresh: true,
                        });
                      }
                    }

                    return { cycles, traceId: getCurrentTraceId() };
                  },
                },
                [
                  // Task returns an event ID trajectory (not discoveries/steps), so only the
                  // continuation checks apply; trace-based evaluators aggregate across all cycles.
                  ...createContinuationEvaluators(),
                  evaluators.traceBasedEvaluators.inputTokens,
                  evaluators.traceBasedEvaluators.outputTokens,
                  evaluators.traceBasedEvaluators.cachedTokens,
                  evaluators.traceBasedEvaluators.toolCalls,
                  evaluators.traceBasedEvaluators.latency,
                ]
              );
            }
          );
        }

        evaluate.afterAll(async ({ esClient, apiServices, log }) => {
          log.debug('Cleaning up discovery test data');
          await deleteTemporaryReplayIndices(esClient, log);
          await apiServices.streams.disable().catch(() => {});
          await cleanSignificantEventsDataStreams(esClient, log);
          await resetMemoryPages({ esClient, log });
        });
      });
    }
  }
);
