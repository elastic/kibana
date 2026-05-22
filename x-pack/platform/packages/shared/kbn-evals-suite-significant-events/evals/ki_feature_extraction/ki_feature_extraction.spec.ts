/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { tags } from '@kbn/scout';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { GcsConfig } from '../../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
  listAvailableSnapshots,
  replaySignificantEventsSnapshot,
} from '../../src/data_generators/replay';
import { evaluate } from '../../src/evaluate';
import { createKIFeatureExtractionEvaluators } from '../../src/evaluators/ki_feature_extraction';
import {
  getActiveDatasets,
  MANAGED_STREAM_NAME,
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  type KIFeatureExtractionScenario,
} from '../../src/datasets';
import { collectSampleDocuments } from './collect_sample_documents';

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

interface CollectedExample {
  scenario: KIFeatureExtractionScenario;
  sampleDocuments: Array<SearchHit<Record<string, unknown>>>;
}

evaluate.describe('KI feature extraction', { tag: tags.serverless.observability.complete }, () => {
  const activeDatasets = getActiveDatasets();
  const availableSnapshotsBySource = new Map<string, Set<string>>();

  evaluate.beforeAll(async ({ esClient, log }) => {
    const uniqueCatalogSources = new Map<string, GcsConfig>();
    for (const dataset of activeDatasets) {
      for (const scenario of dataset.kiFeatureExtraction) {
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
      const collectedExamples: CollectedExample[] = [];

      evaluate.beforeAll(async ({ esClient, log }) => {
        for (const scenario of dataset.kiFeatureExtraction) {
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

          await cleanSignificantEventsDataStreams(esClient, log);
          await replaySignificantEventsSnapshot(esClient, log, source.snapshotName, source.gcs);
          await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });

          const sampleDocuments = await collectSampleDocuments({
            esClient,
            scenario,
            log,
          });
          if (sampleDocuments.length === 0) {
            throw new Error(
              `No log documents found after replaying snapshot ${source.snapshotName}`
            );
          }

          collectedExamples.push({ scenario, sampleDocuments });
        }

        if (collectedExamples.length === 0) {
          log.info(`No scenarios available for dataset "${dataset.id}" - skipping`);
          evaluate.skip();
        }
      });

      evaluate(
        'KI feature extraction',
        async ({ executorClient, evaluators, inferenceClient, logger, traceEsClient, log }) => {
          const heavyDataByScenario = new Map(
            collectedExamples.map(({ scenario, sampleDocuments }) => [
              scenario.input.scenario_id,
              { sampleDocuments },
            ])
          );

          await executorClient.runExperiment(
            {
              dataset: {
                name: `sigevents: KI feature extraction (${dataset.id})`,
                description: `[${dataset.id}] KI feature extraction across scenarios`,
                examples: collectedExamples.map(({ scenario }) => ({
                  id: scenario.input.scenario_id,
                  input: {
                    ...scenario.input,
                    snapshot_source: scenario.snapshot_source,
                  },
                  output: scenario.output,
                  metadata: scenario.metadata,
                })),
              },
              concurrency: 1,
              trustUpstreamDataset: TRUST_UPSTREAM,
              task: async ({ input }: { input: KIFeatureExtractionScenario['input'] }) => {
                const heavy = heavyDataByScenario.get(input.scenario_id);
                if (!heavy) {
                  throw new Error(`No pre-collected data for scenario "${input.scenario_id}"`);
                }

                const { features } = await identifyFeatures({
                  streamName: MANAGED_STREAM_NAME,
                  sampleDocuments: heavy.sampleDocuments,
                  systemPrompt: featuresPrompt,
                  inferenceClient,
                  logger,
                  signal: new AbortController().signal,
                });

                return {
                  features,
                  traceId: getCurrentTraceId(),
                  sample_documents: heavy.sampleDocuments,
                };
              },
            },
            [
              ...createKIFeatureExtractionEvaluators({
                criteriaFn: evaluators.criteria.bind(evaluators),
              }),
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
});
