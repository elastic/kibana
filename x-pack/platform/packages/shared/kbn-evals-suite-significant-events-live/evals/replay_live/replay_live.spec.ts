/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
  SIGNIFICANT_EVENTS_JUDGE_AGENT_ID,
} from '@kbn/significant-events-plugin/server';
import { tags } from '@kbn/scout';
import { getCurrentTraceId } from '@kbn/evals';
import type { GcsConfig } from '@kbn/evals-suite-significant-events';
import {
  buildAvailableSnapshotsBySource,
  cleanSignificantEventsDataStreams,
  deleteTemporaryReplayIndices,
  ensureStreamsEnabled,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  SIGEVENTS_SNAPSHOT_RUN,
  SIGEVENTS_WIRED_ROOTS,
  snapshotCatalogKey,
} from '@kbn/evals-suite-significant-events';
import {
  clearInferenceFeaturePins,
  deleteAllSignalRules,
  fetchAgentConversationData,
  pinInferenceFeaturesToConnector,
  readDetections,
  readLatestDiscoveries,
  readLatestSignificantEvents,
  readSignalCountsByRule,
  replayBaselineSliceIntoManagedStream,
  runLiveOnboarding,
  runOrchestratorToCompletion,
  streamIncidentTail,
  wipePipelineData,
} from '../../src/data_generators';
import { evaluate } from '../../src/evaluate';
import { getActiveReplayDatasets } from '../../src/scenarios';
import type { ReplayLiveConfig, ReplayScenario } from '../../src/scenarios';
import { createReplayLiveEvaluators } from '../../src/evaluators/replay_live';

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

const DEFAULT_MAX_TAIL_MINUTES = 15;
/** Whole-test budget: two scenarios at up to ~55 minutes each, plus scoring. */
const LIVE_TEST_TIMEOUT_MS = 2.5 * 60 * 60 * 1000;

interface LiveScenario extends ReplayScenario {
  live: ReplayLiveConfig;
}

const isLiveScenario = (scenario: ReplayScenario): scenario is LiveScenario =>
  scenario.live !== undefined;

evaluate.describe(
  'Significant Events Live - Live replay',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveReplayDatasets();
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
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

      // The alerting v2 HTTP surface (used for between-run rule cleanup) is gated behind an
      // advanced setting that defaults to false; the pipeline's server-side rule installation
      // works either way, but the cleanup API needs the switch on.
      await kbnClient.uiSettings
        .update({ 'alerting:v2:enabled': true })
        .then(() => log.info('Enabled the alerting v2 advanced setting'))
        .catch((error) =>
          log.warning(
            `Could not enable the alerting v2 advanced setting: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );

      const snapshots = await buildAvailableSnapshotsBySource(
        activeDatasets,
        (dataset) => dataset.scenarios.filter(isLiveScenario),
        esClient,
        log
      );
      snapshots.forEach((value, key) => availableSnapshotsBySource.set(key, value));
    });

    for (const dataset of activeDatasets) {
      const liveScenarios = dataset.scenarios.filter(isLiveScenario);
      if (liveScenarios.length === 0) {
        continue;
      }

      evaluate.describe(dataset.id, () => {
        interface CollectedExample {
          scenario: LiveScenario;
          snapshotSource: { snapshotName: string; gcs: GcsConfig };
        }

        const collectedExamples: CollectedExample[] = [];

        evaluate.beforeAll(async ({ log }) => {
          for (const scenario of liveScenarios) {
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
            log.info(`No live replay scenarios available for dataset "${dataset.id}" — skipping`);
            evaluate.skip();
          }
        });

        evaluate(
          'Live replay',
          async ({
            executorClient,
            evaluators,
            esClient,
            kbnClient,
            apiServices,
            connector,
            log,
          }) => {
            evaluate.setTimeout(LIVE_TEST_TIMEOUT_MS);

            const scenariosById = new Map(
              collectedExamples.map((example) => [example.scenario.input.scenario_id, example])
            );

            // One pin for the whole experiment: every LLM stage (extraction, query generation,
            // discovery, triage) runs on the evaluated connector so the experiment measures a
            // single model end to end.
            await pinInferenceFeaturesToConnector(kbnClient, log, connector.id);

            try {
              await executorClient.runExperiment(
                {
                  datasets: [
                    {
                      name: `sigevents: Live replay (${dataset.id})`,
                      description: `[${dataset.id}] fully live pipeline: LLM onboarding -> real alerting rules over a streamed incident tail -> orchestrator (detect -> discover -> triage) -> significant events`,
                      examples: collectedExamples.map(({ scenario }) => ({
                        id: scenario.input.scenario_id,
                        input: {
                          ...scenario.input,
                          detections: [],
                          snapshot_source: scenario.snapshot_source,
                        },
                        output: {
                          criteria: scenario.live.criteria,
                          expect_open_event: scenario.output.expected_events.some((entry) =>
                            entry.statuses.includes('open')
                          ),
                          expect_no_open_events: scenario.output.expect_no_open_events,
                          expected_ground_truth: scenario.output.expected_ground_truth,
                        },
                        metadata: {
                          ...scenario.metadata,
                          test_index: MANAGED_STREAM_SEARCH_PATTERN,
                          mode: 'live',
                        },
                      })),
                    },
                  ],
                  // Scenarios rebuild the full pipeline state AND depend on wall-clock pacing;
                  // they must never overlap.
                  concurrency: 1,
                  trustUpstreamDataset: TRUST_UPSTREAM,
                  task: async ({ input }: { input: ReplayScenario['input'] }) => {
                    const collected = scenariosById.get(input.scenario_id);
                    if (!collected) {
                      throw new Error(`No pre-collected scenario "${input.scenario_id}"`);
                    }
                    const { scenario, snapshotSource } = collected;
                    const runStartMs = Date.now();

                    // --- Stage 0: full state reset -------------------------------------------
                    await wipePipelineData(esClient, log);
                    await deleteAllSignalRules(kbnClient, log);
                    await cleanSignificantEventsDataStreams(esClient, log);
                    for (const name of SIGEVENTS_WIRED_ROOTS) {
                      await esClient.indices.deleteDataStream({ name }).catch(() => {});
                      await esClient.indices
                        .delete({ index: name, ignore_unavailable: true })
                        .catch(() => {});
                    }
                    await ensureStreamsEnabled({ esClient, apiServices, log });

                    // --- Stage 1: baseline replay (pre-onset docs only, shifted to end ~now) --
                    const baseline = await replayBaselineSliceIntoManagedStream(
                      esClient,
                      log,
                      snapshotSource.snapshotName,
                      snapshotSource.gcs,
                      {
                        incidentOnsetOffsetMinutes: scenario.live.incident_onset_offset_minutes,
                      }
                    );
                    if (baseline.stats.created === 0) {
                      throw new Error(
                        `No baseline documents indexed from snapshot "${snapshotSource.snapshotName}"`
                      );
                    }
                    await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });

                    // --- Stage 2: live LLM onboarding + promote ------------------------------
                    // No snapshot KI replay in live mode: onboarding must produce its own
                    // features and queries from the baseline data. The replayed baseline ends at
                    // ~now, so a last-24h sampling window covers all of it.
                    const onboardingNowMs = Date.now();
                    const { generatedQueries, tokensUsed: onboardingTokens } =
                      await runLiveOnboarding({
                        kbnClient,
                        esClient,
                        log,
                        streamName: scenario.input.stream_name,
                        samplingWindow: {
                          from: new Date(onboardingNowMs - 24 * 60 * 60 * 1000).toISOString(),
                          to: new Date(onboardingNowMs).toISOString(),
                        },
                      });
                    const onboardingDurationMs = Date.now() - onboardingNowMs;

                    // --- Stage 3: stream the incident tail at 1x while rules fire ------------
                    const streamingStartMs = Date.now();
                    const tailStats = await streamIncidentTail(esClient, log, {
                      tempIndices: baseline.tempIndices,
                      cutTimestampMs: baseline.cutTimestampMs,
                      maxTailMinutes: scenario.live.max_tail_minutes ?? DEFAULT_MAX_TAIL_MINUTES,
                    });
                    const streamingDurationMs = Date.now() - streamingStartMs;
                    const signalCountsByRule = await readSignalCountsByRule(esClient);
                    log.info(
                      `Real rule executions produced ${Object.values(signalCountsByRule).reduce(
                        (sum, count) => sum + count,
                        0
                      )} signal(s) across ${Object.keys(signalCountsByRule).length} rule(s)`
                    );

                    // --- Stage 4: orchestrator (detect -> discover -> triage) ----------------
                    const orchestratorStartMs = Date.now();
                    await runOrchestratorToCompletion({ kbnClient, log });
                    const orchestratorDurationMs = Date.now() - orchestratorStartMs;

                    // --- Stage 5: collect the funnel ------------------------------------------
                    const detections = await readDetections(esClient);
                    const discoveries = await readLatestDiscoveries(esClient);
                    const significantEvents = await readLatestSignificantEvents(esClient);
                    const [discoveryConversation, judgeConversation] = await Promise.all([
                      fetchAgentConversationData({
                        kbnClient,
                        log,
                        agentId: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
                        sinceMs: runStartMs,
                      }),
                      fetchAgentConversationData({
                        kbnClient,
                        log,
                        agentId: SIGNIFICANT_EVENTS_JUDGE_AGENT_ID,
                        sinceMs: runStartMs,
                      }),
                    ]);

                    log.info(
                      `Live pipeline finished: discoveries=[${
                        discoveries.map((d) => d.title).join(', ') || 'none'
                      }]; significant events=[${
                        significantEvents
                          .map((event) => `${event.status} "${event.title}"`)
                          .join(', ') || 'none'
                      }]`
                    );

                    return {
                      generatedQueries,
                      signalCountsByRule,
                      detections,
                      discoveries,
                      inputDetections: detections,
                      significantEvents,
                      steps: discoveryConversation.steps,
                      judgeSteps: judgeConversation.steps,
                      tokenUsage: {
                        onboarding: onboardingTokens,
                        discovery: discoveryConversation.tokensUsed,
                        judge: judgeConversation.tokensUsed,
                      },
                      stageDurationsMs: {
                        onboarding: onboardingDurationMs,
                        streaming: streamingDurationMs,
                        orchestrator: orchestratorDurationMs,
                        total: Date.now() - runStartMs,
                      },
                      traceId: getCurrentTraceId(),
                    };
                  },
                },
                // No trace-based evaluators here: the pipeline's LLM calls run inside
                // server-side workflow executions whose spans carry Kibana's trace ids, so
                // trace queries under the eval's trace id always come back empty. The
                // live_* usage evaluators inside createReplayLiveEvaluators cover tokens, LLM
                // calls, tool calls, and duration deterministically instead.
                createReplayLiveEvaluators({
                  criteriaFn: evaluators.criteria.bind(evaluators),
                })
              );
            } finally {
              await clearInferenceFeaturePins(kbnClient, log);
            }
          }
        );

        evaluate.afterAll(async ({ esClient, kbnClient, apiServices, log }) => {
          log.debug('Cleaning up live replay test data');
          await deleteAllSignalRules(kbnClient, log).catch(() => {});
          await deleteTemporaryReplayIndices(esClient, log);
          await apiServices.streams.disable().catch(() => {});
          await cleanSignificantEventsDataStreams(esClient, log);
          await wipePipelineData(esClient, log);
        });
      });
    }
  }
);
