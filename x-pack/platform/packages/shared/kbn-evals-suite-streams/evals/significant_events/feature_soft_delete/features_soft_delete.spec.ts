/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { isDuplicateFeature } from '@kbn/streams-schema';
import { identifyFeatures, type DeletedFeatureSummary } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import { sampleSize as lodashSampleSize } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { GcsConfig } from '../../../src/data_generators/replay';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
  listAvailableSnapshots,
  replaySignificantEventsSnapshot,
} from '../../../src/data_generators/replay';
import { evaluate } from '../../../src/evaluate';
import {
  getActiveDatasets,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  MANAGED_STREAM_NAME,
  MANAGED_STREAM_SEARCH_PATTERN,
  type FeatureSoftDeleteScenario,
} from '../datasets';
import {
  createSoftDeleteSemanticEvaluator,
  type SoftDeleteTaskOutput,
} from '../../../src/evaluators/soft_delete/soft_delete_evaluators';

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe(
  'Streams features soft delete',
  { tag: tags.serverless.observability.complete },
  () => {
    const activeDatasets = getActiveDatasets();
    const softDeleteRuns = activeDatasets.flatMap((dataset) =>
      dataset.featureSoftDelete.map((scenario) => ({ dataset, scenario }))
    );
    const availableSnapshotsBySource = new Map<string, Set<string>>();

    evaluate.beforeAll(async ({ esClient, log }) => {
      const uniqueCatalogSources = new Map<string, GcsConfig>();
      for (const { dataset, scenario } of softDeleteRuns) {
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

    async function fetchSampleDocuments({
      esClient,
      sampleSize,
      log,
    }: {
      esClient: Client;
      sampleSize: number;
      log: ToolingLog;
    }): Promise<Array<SearchHit<Record<string, unknown>>>> {
      const result = await esClient.search<Record<string, unknown>>({
        index: MANAGED_STREAM_SEARCH_PATTERN,
        size: sampleSize,
        query: { match_all: {} },
        sort: [{ '@timestamp': { order: 'desc' } }],
      });

      const sampleDocuments = result.hits.hits;
      log.info(
        `Fetched ${sampleDocuments.length} sample documents from ${MANAGED_STREAM_SEARCH_PATTERN}`
      );

      if (sampleDocuments.length === 0) {
        throw new Error(
          `No sample documents found in ${MANAGED_STREAM_SEARCH_PATTERN}. Ensure the snapshot has been replayed.`
        );
      }

      return sampleDocuments;
    }

    async function runSoftDeleteExperiment({
      esClient,
      deleteCount,
      followUpRuns,
      inferenceClient,
      logger,
      sampleSize,
      log,
    }: {
      esClient: Client;
      deleteCount: number;
      followUpRuns: number;
      inferenceClient: BoundInferenceClient;
      logger: Logger;
      sampleSize: number;
      log: ToolingLog;
    }): Promise<SoftDeleteTaskOutput> {
      const abortController = new AbortController();

      const initialSampleDocuments = await fetchSampleDocuments({
        esClient,
        sampleSize,
        log,
      });

      const { features: initialFeatures } = await identifyFeatures({
        streamName: MANAGED_STREAM_NAME,
        sampleDocuments: initialSampleDocuments,
        systemPrompt: featuresPrompt,
        inferenceClient,
        logger,
        signal: abortController.signal,
      });

      log.info(`Initial identification returned ${initialFeatures.length} features`);

      if (initialFeatures.length < deleteCount) {
        log.info(
          `Not enough features identified (${initialFeatures.length}) to delete ${deleteCount}, skipping follow-up runs`
        );
        return {
          initialFeatures,
          deletedFeatures: [],
          followUpRuns: [],
        };
      }

      const featuresToDelete = lodashSampleSize(initialFeatures, deleteCount);
      const deletedFeatures: DeletedFeatureSummary[] = featuresToDelete.map(
        ({ id, type, subtype, title, description, properties }) => ({
          id,
          type,
          subtype,
          title,
          description,
          properties,
        })
      );

      const outputs: SoftDeleteTaskOutput['followUpRuns'] = [];

      for (let i = 0; i < followUpRuns; i++) {
        const sampleDocuments = await fetchSampleDocuments({
          esClient,
          sampleSize,
          log,
        });

        const { features: rawFeatures, ignoredFeatures } = await identifyFeatures({
          streamName: MANAGED_STREAM_NAME,
          sampleDocuments,
          deletedFeatures,
          systemPrompt: featuresPrompt,
          inferenceClient,
          logger,
          signal: abortController.signal,
        });

        const features = rawFeatures.filter(
          (feature) => !deletedFeatures.some((deleted) => isDuplicateFeature(feature, deleted))
        );

        outputs.push({ features, rawFeatures, ignoredFeatures });
      }

      return {
        initialFeatures,
        deletedFeatures,
        followUpRuns: outputs,
      };
    }

    for (const { dataset, scenario } of softDeleteRuns) {
      const scenarioLabel = `${dataset.id} / ${scenario.input.scenario_id} (delete ${scenario.input.delete_count})`;

      evaluate.describe(scenarioLabel, () => {
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

          await esClient.indices.refresh({ index: MANAGED_STREAM_SEARCH_PATTERN });
        });

        evaluate(
          scenarioLabel,
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

            await executorClient.runExperiment(
              {
                dataset: {
                  name: `sigevents: soft delete: ${scenario.input.scenario_id} (${dataset.id}, delete ${scenario.input.delete_count})`,
                  description: `[${dataset.id}] Soft-delete ${scenario.input.delete_count} feature(s) from ${scenario.input.scenario_id}, verify exclusion across ${scenario.input.follow_up_runs} follow-up runs`,
                  examples: [{ input: scenario.input }],
                },
                task: async ({ input }: { input: FeatureSoftDeleteScenario['input'] }) => {
                  const result = await runSoftDeleteExperiment({
                    esClient,
                    deleteCount: input.delete_count,
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
                createSoftDeleteSemanticEvaluator({ inferenceClient: evaluatorInferenceClient }),
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
