/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { tags } from '@kbn/scout';
import type { GcsConfig } from '../../../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
  listAvailableSnapshots,
  replaySignificantEventsSnapshot,
} from '../../../src/data_generators/replay';
import { evaluate } from '../../../src/evaluate';
import { createFeatureExtractionEvaluators } from '../../../src/evaluators/feature_extraction_evaluators';
import { getActiveDatasets, resolveScenarioSnapshotSource } from '../datasets';
import { collectSampleDocuments } from './collect_sample_documents';

const INDEX_REFRESH_WAIT_MS = 2500;

const snapshotCatalogKey = (gcs: GcsConfig): string => `${gcs.bucket}/${gcs.basePathPrefix}`;

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe(
  'Streams feature extraction',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const featureExtractionRuns = activeDatasets.flatMap((dataset) =>
      dataset.featureExtraction.map((scenario) => ({ dataset, scenario }))
    );
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, log }) => {
      const uniqueCatalogSources = new Map<string, GcsConfig>();
      for (const { dataset, scenario } of featureExtractionRuns) {
        const source = resolveScenarioSnapshotSource({
          scenarioId: scenario.input.scenario_id,
          datasetGcs: dataset.gcs,
          snapshotSource: scenario.snapshot_source,
        });
        uniqueCatalogSources.set(snapshotCatalogKey(source.gcs), source.gcs);
      }

      for (const [catalogSourceKey, gcs] of uniqueCatalogSources.entries()) {
        const availableSnapshots = await listAvailableSnapshots(esClient, log, gcs);
        availableSnapshotsBySource.set(catalogSourceKey, new Set(availableSnapshots));
      }
    });

    for (const { dataset, scenario } of featureExtractionRuns) {
      evaluate.describe(`${dataset.id} / ${scenario.input.scenario_id}`, () => {
        let sampleDocuments: Array<Record<string, unknown>> = [];

        evaluate.beforeAll(async ({ esClient, log }) => {
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
            evaluate.skip();
            return;
          }

          await cleanSignificantEventsDataStreams(esClient, log);
          await replaySignificantEventsSnapshot(esClient, log, source.snapshotName, source.gcs);

          log.debug('Waiting for replayed indices to refresh');
          await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

          sampleDocuments = await collectSampleDocuments({ esClient, scenario, log });
          if (sampleDocuments.length === 0) {
            throw new Error(
              `No log documents found after replaying snapshot ${source.snapshotName}`
            );
          }
        });

        evaluate(
          'feature extraction',
          async ({ executorClient, evaluators, inferenceClient, logger }) => {
            await executorClient.runExperiment(
              {
                dataset: {
                  name: `sigevents: feature extraction: ${scenario.input.scenario_id} (${dataset.id})`,
                  description: `[${dataset.id}] Feature extraction from ${scenario.metadata.failure_domain} / ${scenario.metadata.failure_mode}`,
                  examples: [
                    {
                      input: { sample_documents: sampleDocuments },
                      output: {
                        ...scenario.output,
                        expected: scenario.output.expected_ground_truth,
                      },
                      metadata: scenario.metadata,
                    },
                  ],
                },
                concurrency: 1,
                task: async ({ input }) => {
                  const taskSampleDocuments = (
                    input as { sample_documents: Array<Record<string, unknown>> }
                  ).sample_documents;

                  const { features } = await identifyFeatures({
                    streamName: 'logs',
                    sampleDocuments: taskSampleDocuments,
                    systemPrompt: featuresPrompt,
                    inferenceClient,
                    logger,
                    signal: new AbortController().signal,
                  });

                  return features;
                },
              },
              createFeatureExtractionEvaluators({
                criteriaFn: evaluators.criteria.bind(evaluators),
                criteria: scenario.output.criteria,
              })
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
