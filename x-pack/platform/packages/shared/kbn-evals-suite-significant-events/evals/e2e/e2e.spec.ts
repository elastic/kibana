/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from '@kbn/significant-events-plugin/server';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import { tags } from '@kbn/scout';
import { getCurrentTraceId } from '@kbn/evals';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  replayIntoManagedStream,
  SIGEVENTS_SNAPSHOT_RUN,
  SIGEVENTS_WIRED_ROOTS,
  cleanSignificantEventsDataStreams,
  ensureStreamsEnabled,
  deleteTemporaryReplayIndices,
  wipePipelineData,
  seedCanonicalRuleBackedQueries,
  synthesizeRuleSignals,
  ensureManagedWorkflowReady,
  executeManagedWorkflow,
  readDetections,
  readLatestSignificantEvents,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
} from '../../src/data_generators/replay';
import { replayKnowledgeIndicatorsSnapshot } from '../../src/data_generators/replay_knowledge_indicators_snapshot';
import { evaluate } from '../../src/evaluate';
import {
  getActiveDatasets,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
} from '../../src/datasets';
import type { E2EScenario } from '../../src/datasets';
import { createE2EEvaluators } from '../../src/evaluators/e2e';
import { extractDiscoveriesFromToolCall } from '../../src/evaluators/discovery/utils/parse_agent_output';
import { buildDiscoveryInput } from '../../src/evaluators/discovery/discovery/build_agent_input';
import { buildAvailableSnapshotsBySource } from '../shared';

/**
 * Opt-in gate: the e2e spec drives real managed workflows (detection, triage) and an agent
 * conversation per scenario, which is slow and needs a fully provisioned environment. Set
 * SIGEVENTS_E2E=true to run it; it is skipped otherwise so the rest of the suite stays fast.
 */
const E2E_ENABLED = process.env.SIGEVENTS_E2E === 'true';
const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

const DISCOVERIES_DATA_STREAM = '.significant_events-discoveries';

/** Floor for the detection lookback: the change_point agg needs >= ~22 buckets at 1m. */
const MIN_LOOKBACK_MINUTES = 40;
const MAX_LOOKBACK_MINUTES = 12 * 60;

/**
 * Size the detection scan window to the replayed logs: lookback from the oldest replayed doc
 * (plus margin) so the whole synthetic signal series is inside the change_point histogram.
 */
async function computeDetectionLookbackMinutes(esClient: Client): Promise<number> {
  const response = await esClient.search({
    index: MANAGED_STREAM_SEARCH_PATTERN,
    size: 0,
    aggs: { min_ts: { min: { field: '@timestamp' } } },
  });
  const minTs = (response.aggregations?.min_ts as { value?: number | null })?.value;
  if (minTs == null) {
    return MIN_LOOKBACK_MINUTES;
  }
  const windowMinutes = Math.ceil((Date.now() - minTs) / 60_000) + 5;
  return Math.min(Math.max(windowMinutes, MIN_LOOKBACK_MINUTES), MAX_LOOKBACK_MINUTES);
}

evaluate.describe(
  'Significant Events - End-to-end pipeline',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
      if (!E2E_ENABLED) {
        log.info('SIGEVENTS_E2E is not set — skipping end-to-end pipeline eval');
        evaluate.skip();
        return;
      }

      // Agents, internal detection routes, and managed workflow installation are all gated on
      // the significant events availability feature flag (defaults to false).
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

      for (const workflowId of [
        SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
        SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
      ]) {
        await ensureManagedWorkflowReady({ kbnClient, log, workflowId });
      }

      const snapshots = await buildAvailableSnapshotsBySource(
        activeDatasets,
        (dataset) => dataset.e2e,
        esClient,
        log
      );
      snapshots.forEach((value, key) => availableSnapshotsBySource.set(key, value));
    });

    for (const dataset of activeDatasets) {
      if (dataset.e2e.length === 0) {
        continue;
      }

      evaluate.describe(dataset.id, () => {
        interface CollectedExample {
          scenario: E2EScenario;
          snapshotSource: { snapshotName: string; gcs: GcsConfig };
        }

        const collectedExamples: CollectedExample[] = [];

        evaluate.beforeAll(async ({ log }) => {
          for (const scenario of dataset.e2e) {
            const snapshotSource = resolveScenarioSnapshotSource({
              scenarioId: scenario.input.scenario_id,
              datasetGcs: dataset.gcs,
              snapshotSource: scenario.snapshot_source,
            });

            const availableSnapshots =
              availableSnapshotsBySource.get(snapshotCatalogKey(snapshotSource.gcs)) ?? new Set();

            if (!availableSnapshots.has(snapshotSource.snapshotName)) {
              log.info(
                `Snapshot "${snapshotSource.snapshotName}" not found in run "${SIGEVENTS_SNAPSHOT_RUN}" ` +
                  `(source: ${snapshotSource.gcs.bucket}/${snapshotSource.gcs.basePathPrefix}) — skipping scenario "${scenario.input.scenario_id}"`
              );
              continue;
            }

            collectedExamples.push({ scenario, snapshotSource });
          }

          if (collectedExamples.length === 0) {
            log.info(`No e2e scenarios available for dataset "${dataset.id}" — skipping`);
            evaluate.skip();
          }
        });

        evaluate(
          'End-to-end pipeline',
          async ({
            executorClient,
            evaluators,
            esClient,
            kbnClient,
            agentBuilderClient,
            apiServices,
            log,
          }) => {
            const scenariosById = new Map(
              collectedExamples.map((example) => [example.scenario.input.scenario_id, example])
            );

            await executorClient.runExperiment(
              {
                datasets: [
                  {
                    name: `sigevents: End-to-end pipeline (${dataset.id})`,
                    description: `[${dataset.id}] full pipeline: replayed logs -> seeded KI queries -> synthetic signals -> detection workflow -> discovery agent -> triage workflow -> significant events`,
                    examples: collectedExamples.map(({ scenario }) => ({
                      id: scenario.input.scenario_id,
                      input: {
                        ...scenario.input,
                        // Structural compatibility with the reused discovery evaluators; the
                        // detections fed to the agent are produced at runtime and threaded
                        // through output.inputDetections.
                        detections: [],
                        snapshot_source: scenario.snapshot_source,
                      },
                      output: scenario.output,
                      metadata: {
                        ...scenario.metadata,
                        test_index: MANAGED_STREAM_SEARCH_PATTERN,
                      },
                    })),
                  },
                ],
                // Every scenario rebuilds the full pipeline state (wipe + replay + seed), so
                // tasks must not overlap.
                concurrency: 1,
                trustUpstreamDataset: TRUST_UPSTREAM,
                task: async ({ input }: { input: E2EScenario['input'] }) => {
                  const collected = scenariosById.get(input.scenario_id);
                  if (!collected) {
                    throw new Error(`No pre-collected scenario "${input.scenario_id}"`);
                  }
                  const { scenario, snapshotSource } = collected;

                  // --- Stage 0: reset pipeline state and replay logs -----------------------
                  await wipePipelineData(esClient, log);
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

                  // --- Stage 1: seed knowledge indicators ----------------------------------
                  // Snapshot KI features give the discovery agent knowledge context via
                  // search_knowledge_indicators; canonical queries are the rule-backed KIs the
                  // detection stage scans for.
                  await replayKnowledgeIndicatorsSnapshot(
                    esClient,
                    log,
                    snapshotSource.snapshotName,
                    snapshotSource.gcs
                  );
                  await seedCanonicalRuleBackedQueries(esClient, log, {
                    streamName: scenario.input.stream_name,
                    queries: scenario.canonical_queries,
                  });

                  // --- Stage 2: synthesize rule signals ------------------------------------
                  const { signalsByRule } = await synthesizeRuleSignals(esClient, log, {
                    queries: scenario.canonical_queries,
                  });

                  const expectedRules = scenario.output.expected_detection_rule_uuids;
                  const rulesWithoutSignals = expectedRules.filter(
                    (rule) => (signalsByRule[rule] ?? 0) === 0
                  );
                  if (
                    expectedRules.length > 0 &&
                    rulesWithoutSignals.length === expectedRules.length
                  ) {
                    // Zero signals across every expected rule is a broken setup (query/template
                    // drift against the snapshot), not a model failure — fail fast.
                    throw new Error(
                      `No signals synthesized for any expected rule of scenario "${input.scenario_id}" — ` +
                        `canonical queries no longer match the snapshot logs`
                    );
                  }

                  // --- Stage 3: real detection workflow ------------------------------------
                  const lookbackMinutes = await computeDetectionLookbackMinutes(esClient);
                  const detectionResult = await executeManagedWorkflow({
                    kbnClient,
                    log,
                    workflowId: SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
                    inputs: {
                      lookback: `now-${lookbackMinutes}m`,
                      bucketInterval: '1m',
                    },
                  });
                  if (
                    detectionResult.status === 'failed' ||
                    detectionResult.status === 'timed_out'
                  ) {
                    throw new Error(
                      `Detection workflow execution ${detectionResult.executionId} ended with status "${detectionResult.status}"`
                    );
                  }

                  const detections = await readDetections(esClient);
                  log.info(
                    `Detection stage produced ${detections.length} detection(s): ${detections
                      .map((detection) => `${detection.rule_name}=${detection.change_point_type}`)
                      .join(', ')}`
                  );

                  // --- Stage 4: discovery agent over the produced detections ---------------
                  let discoveries: ReturnType<typeof extractDiscoveriesFromToolCall> = [];
                  let steps: Awaited<ReturnType<typeof agentBuilderClient.converse>>['steps'] = [];
                  if (detections.length > 0) {
                    const converseResult = await agentBuilderClient.converse({
                      agentId: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
                      input: buildDiscoveryInput({ detections }),
                    });
                    steps = converseResult.steps;
                    // discovery_write persisted these to the live discoveries stream as a side
                    // effect — that is what the triage workflow picks up next.
                    discoveries = extractDiscoveriesFromToolCall(converseResult.steps);
                    await esClient.indices
                      .refresh({ index: DISCOVERIES_DATA_STREAM })
                      .catch(() => {});
                  } else {
                    log.info('No detections produced — skipping discovery and triage stages');
                  }

                  // --- Stage 5: triage workflow (judge -> significant events) --------------
                  if (discoveries.length > 0) {
                    const triageResult = await executeManagedWorkflow({
                      kbnClient,
                      log,
                      workflowId: SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
                      inputs: {
                        discoveryLookback: 'now-1d',
                        discoveryBatchMax: 10,
                      },
                      timeoutMs: 30 * 60 * 1000,
                    });
                    if (triageResult.status !== 'completed') {
                      throw new Error(
                        `Triage workflow execution ${triageResult.executionId} ended with status "${triageResult.status}"`
                      );
                    }
                  }

                  const significantEvents = await readLatestSignificantEvents(esClient);
                  log.info(
                    `Pipeline finished with ${significantEvents.length} significant event(s): ${
                      significantEvents
                        .map((event) => `${event.event_id}=${event.status}`)
                        .join(', ') || 'none'
                    }`
                  );

                  return {
                    signalsByRule,
                    detections,
                    discoveries,
                    inputDetections: detections,
                    significantEvents,
                    steps,
                    traceId: getCurrentTraceId(),
                  };
                },
              },
              [
                ...createE2EEvaluators({
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
          log.debug('Cleaning up e2e pipeline test data');
          await deleteTemporaryReplayIndices(esClient, log);
          await apiServices.streams.disable().catch(() => {});
          await cleanSignificantEventsDataStreams(esClient, log);
          await wipePipelineData(esClient, log);
        });
      });
    }
  }
);
