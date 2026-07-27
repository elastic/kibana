/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import { featuresPrompt } from '@kbn/streams-ai/src/features/prompt';
import {
  createMemoryDiscoveryTools,
  MemoryServiceImpl,
} from '@kbn/significant-events-plugin/server';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '@kbn/significant-events-plugin/common';
import { tags } from '@kbn/scout';
import { getCurrentTraceId, createSpanLatencyEvaluator } from '@kbn/evals';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import {
  createEvalSignificantEventSearchTool,
  type AgentBuilderToolResult,
} from '../../src/tools/significant_event_search_tool';
import {
  SIGEVENTS_SNAPSHOT_RUN,
  cleanSignificantEventsDataStreams,
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
import { buildAvailableSnapshotsBySource } from '../shared';
import { collectSampleDocuments } from './collect_sample_documents';

const TRUST_UPSTREAM = process.env.SIGEVENTS_TRUST_UPSTREAM === 'true';

interface CollectedExample {
  scenario: KIFeatureExtractionScenario;
  sampleDocuments: Array<SearchHit<Record<string, unknown>>>;
}

evaluate.describe('KI feature extraction', { tag: tags.serverless.observability.complete }, () => {
  const activeDatasets = getActiveDatasets();
  const availableSnapshotsBySource = new Map<string, Set<string>>();

  evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
    // The significant_event_search tool is only registered when significant
    // events availability is on (defaults to false); enable it before any run.
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
      (dataset) => dataset.kiFeatureExtraction,
      esClient,
      log
    );
    snapshots.forEach((v, k) => availableSnapshotsBySource.set(k, v));
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
        async ({
          esClient,
          executorClient,
          evaluators,
          inferenceClient,
          logger,
          traceEsClient,
          log,
          fetch,
        }) => {
          const heavyDataByScenario = new Map(
            collectedExamples.map(({ scenario, sampleDocuments }) => [
              scenario.input.scenario_id,
              { sampleDocuments },
            ])
          );

          // Exercise the same grounding tools that production feature extraction
          // now wires in, so the eval covers the memory + prior-SigEvents paths.
          const memoryTools = createMemoryDiscoveryTools({
            memoryService: new MemoryServiceImpl({ logger: logger.get('memory'), esClient }),
          });

          const executeAgentBuilderTool = async (
            toolId: string,
            toolParams: Record<string, unknown>
          ) =>
            (await fetch('/api/agent_builder/tools/_execute', {
              method: 'POST',
              version: '2023-10-31',
              body: JSON.stringify({ tool_id: toolId, tool_params: toolParams }),
            })) as { results?: AgentBuilderToolResult[] };

          const eventSearchTool = createEvalSignificantEventSearchTool({
            executeTool: executeAgentBuilderTool,
            streamName: MANAGED_STREAM_NAME,
            logger,
          });

          await executorClient.runExperiment(
            {
              datasets: [
                {
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
              ],
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
                  systemPrompt: `${featuresPrompt}\n${memoryTools.promptSnippet}\n${eventSearchTool.promptSnippet}`,
                  inferenceClient,
                  logger,
                  signal: new AbortController().signal,
                  additionalTools: { ...memoryTools.tools, ...eventSearchTool.tools },
                  additionalToolCallbacks: {
                    ...memoryTools.callbacks,
                    ...eventSearchTool.callbacks,
                  },
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
});
