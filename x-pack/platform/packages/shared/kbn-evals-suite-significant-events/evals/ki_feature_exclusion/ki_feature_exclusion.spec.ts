/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import {
  getCurrentTraceId,
  createChatCallsEvaluator,
  createSpanLatencyEvaluator,
} from '@kbn/evals';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
  replaySignificantEventsSnapshot,
} from '../../src/data_generators/replay';
import { evaluate } from '../../src/evaluate';
import {
  getActiveDatasets,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  MANAGED_STREAM_SEARCH_PATTERN,
  type KIFeatureExclusionScenario,
} from '../../src/datasets';
import { createExcludeSemanticEvaluator } from '../../src/evaluators/ki_feature_exclusion/evaluators';
import {
  initialFeatureCountEvaluator,
  followUpReturnedCountEvaluator,
  followUpRetainedCountEvaluator,
} from '../../src/evaluators/ki_feature_exclusion/feature_counts';
import { createReportedTokenEvaluators } from '../../src/evaluators/reported_tokens';
import { buildAvailableSnapshotsBySource } from '../shared';
import { runExcludeExperiment } from './run_exclude_experiment';

evaluate.describe.configure({ timeout: 1_200_000 });

evaluate.describe(
  'Streams features exclusion',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
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

      const snapshots = await buildAvailableSnapshotsBySource(
        activeDatasets,
        (dataset) => dataset.kiFeatureExclusion ?? [],
        esClient,
        log
      );
      snapshots.forEach((v, k) => availableSnapshotsBySource.set(k, v));
    });

    for (const dataset of activeDatasets) {
      evaluate.describe(dataset.id, () => {
        const availableScenarios: KIFeatureExclusionScenario[] = [];
        const snapshotSources = new Map<string, { snapshotName: string; gcs: GcsConfig }>();

        evaluate.beforeAll(async ({ log }) => {
          for (const scenario of dataset.kiFeatureExclusion ?? []) {
            const source = resolveScenarioSnapshotSource({
              scenarioId: scenario.input.scenario_id,
              datasetGcs: dataset.gcs,
              snapshotSource: scenario.snapshot_source,
            });

            const available =
              availableSnapshotsBySource.get(snapshotCatalogKey(source.gcs)) ?? new Set();

            if (!available.has(source.snapshotName)) {
              log.info(
                `Snapshot "${source.snapshotName}" not found in run "${SIGEVENTS_SNAPSHOT_RUN}" ` +
                  `(source: ${source.gcs.bucket}/${source.gcs.basePathPrefix}) - skipping`
              );
              continue;
            }

            availableScenarios.push(scenario);
            const exampleId = `${scenario.input.scenario_id}:exclude-${scenario.input.exclude_count}`;
            snapshotSources.set(exampleId, source);
          }

          if (availableScenarios.length === 0) {
            log.info(`No scenarios available for dataset "${dataset.id}" - skipping`);
            evaluate.skip();
          }
        });

        evaluate(
          'KI feature exclusion',
          async ({
            esClient,
            inferenceClient,
            agentBuilderClient,
            evaluationConnector,
            evaluators,
            traceEsClient,
            log,
            executorClient,
          }) => {
            const evaluatorInferenceClient = inferenceClient.bindTo({
              connectorId: evaluationConnector.id,
            });

            let lastReplayedSnapshot: string | undefined;

            await executorClient.runExperiment(
              {
                datasets: [
                  {
                    name: `sigevents: KI feature exclusion (${dataset.id})`,
                    description: `[${dataset.id}] KI feature exclusion across scenarios`,
                    examples: availableScenarios.map((scenario) => ({
                      id: `${scenario.input.scenario_id}:exclude-${scenario.input.exclude_count}`,
                      input: scenario.input,
                    })),
                  },
                ],
                concurrency: 1,
                task: async ({ input }: { input: KIFeatureExclusionScenario['input'] }) => {
                  const exampleId = `${input.scenario_id}:exclude-${input.exclude_count}`;
                  const source = snapshotSources.get(exampleId);
                  if (!source) {
                    throw new Error(`No snapshot source found for example "${exampleId}"`);
                  }

                  if (source.snapshotName !== lastReplayedSnapshot) {
                    await cleanSignificantEventsDataStreams(esClient, log);
                    await replaySignificantEventsSnapshot(
                      esClient,
                      log,
                      source.snapshotName,
                      source.gcs
                    );
                    await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });
                    lastReplayedSnapshot = source.snapshotName;
                  }

                  const result = await runExcludeExperiment({
                    esClient,
                    excludeCount: input.exclude_count,
                    followUpRuns: input.follow_up_runs,
                    agentBuilderClient,
                    sampleSize: input.sample_document_count,
                    log,
                  });
                  const traceId = getCurrentTraceId();
                  return { ...result, traceId };
                },
              },
              [
                createExcludeSemanticEvaluator({ inferenceClient: evaluatorInferenceClient }),
                initialFeatureCountEvaluator,
                followUpReturnedCountEvaluator,
                followUpRetainedCountEvaluator,
                ...createReportedTokenEvaluators(),
                evaluators.traceBasedEvaluators.inputTokens,
                evaluators.traceBasedEvaluators.outputTokens,
                evaluators.traceBasedEvaluators.cachedTokens,
                createChatCallsEvaluator({ traceEsClient, log }),
                createSpanLatencyEvaluator({ traceEsClient, log, operationName: 'chat' }),
              ]
            );
          }
        );

        evaluate.afterAll(async ({ esClient, log }) => {
          log.debug('Cleaning replayed logs and index template');
          await cleanSignificantEventsDataStreams(esClient, log);
        });
      });
    }
  }
);
