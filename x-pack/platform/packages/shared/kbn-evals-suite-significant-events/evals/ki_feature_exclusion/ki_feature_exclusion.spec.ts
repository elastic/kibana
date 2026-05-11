/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
  listAvailableSnapshots,
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
import { runExcludeExperiment } from './run_exclude_experiment';

evaluate.describe.configure({ timeout: 1_200_000 });

evaluate.describe(
  'Streams features exclusion',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, log }) => {
      const uniqueCatalogSources = new Map<string, GcsConfig>();
      for (const dataset of activeDatasets) {
        for (const scenario of dataset.kiFeatureExclusion ?? []) {
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
            evaluationConnector,
            evaluators,
            traceEsClient,
            log,
            logger,
            executorClient,
          }) => {
            const evaluatorInferenceClient = inferenceClient.bindTo({
              connectorId: evaluationConnector.id,
            });

            let lastReplayedSnapshot: string | undefined;

            await executorClient.runExperiment(
              {
                dataset: {
                  name: `sigevents: KI feature exclusion (${dataset.id})`,
                  description: `[${dataset.id}] KI feature exclusion across scenarios`,
                  examples: availableScenarios.map((scenario) => ({
                    id: `${scenario.input.scenario_id}:exclude-${scenario.input.exclude_count}`,
                    input: scenario.input,
                  })),
                },
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
                    inferenceClient,
                    logger,
                    sampleSize: input.sample_document_count,
                    log,
                  });
                  const traceId = getCurrentTraceId();
                  return { ...result, traceId };
                },
              },
              [
                createExcludeSemanticEvaluator({ inferenceClient: evaluatorInferenceClient }),
                evaluators.traceBasedEvaluators.inputTokens,
                evaluators.traceBasedEvaluators.outputTokens,
                evaluators.traceBasedEvaluators.cachedTokens,
                createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
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
