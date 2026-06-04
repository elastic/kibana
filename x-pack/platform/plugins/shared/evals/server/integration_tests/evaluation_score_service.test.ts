/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { clearTimeout as nodeClearTimeout, setTimeout as nodeSetTimeout } from 'node:timers';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { EvaluationIndices, type IngestScoresRequestBodyInput } from '@kbn/evals-common';
import { EvaluationScoreService } from '../storage/evaluation_score_service';
import { evaluationsDataStreamDefinition } from '../storage/scores_index_template';

const getPayload = (experimentId: string): IngestScoresRequestBodyInput => ({
  experiment_id: experimentId,
  task_model: {
    id: 'task-model-1',
    family: 'family-a',
    provider: 'provider-a',
  },
  evaluator_model: {
    id: 'evaluator-model-1',
    family: 'family-b',
    provider: 'provider-b',
  },
  metadata: {
    execution_id: experimentId,
    suite_id: 'suite-1',
    total_repetitions: 1,
    hostname: 'localhost',
    git: {
      branch: 'main',
      commit_sha: 'abc123',
    },
  },
  scores: [
    {
      example: {
        id: 'example-1',
        index: 0,
        input: { prompt: 'hello' },
        dataset: {
          id: 'dataset-1',
          name: 'Dataset 1',
        },
      },
      task: {
        trace_id: 'trace-1',
        repetition_index: 0,
        output: { answer: 'world' },
      },
      evaluator: {
        name: 'quality',
        score: 1,
        label: 'pass',
        explanation: 'looks good',
        metadata: { source: 'integration-test' },
        trace_id: 'eval-trace-1',
      },
    },
  ],
});

const cleanupScoresStorage = async (esClient: ElasticsearchClient) => {
  await esClient.indices.deleteDataStream({ name: EvaluationIndices.SCORES }).catch(() => {});
  await esClient.indices
    .deleteIndexTemplate({
      name: EvaluationIndices.SCORES,
    })
    .catch(() => {});
};

describe('EvaluationScoreService integration', () => {
  jest.setTimeout(180000);

  let manageES: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let coreDataStreams: DataStreamsStart;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let initializeDataStreamClient: () => Promise<unknown>;
  let originalSetTimeout: typeof global.setTimeout;
  let originalClearTimeout: typeof global.clearTimeout;

  beforeAll(async () => {
    jest.useRealTimers();
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;
    global.setTimeout = nodeSetTimeout as unknown as typeof global.setTimeout;
    global.clearTimeout = nodeClearTimeout as unknown as typeof global.clearTimeout;

    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    root = createRootWithCorePlugins({}, { oss: true });
    await root.preboot();
    const coreSetup = await root.setup();
    coreSetup.dataStreams.registerDataStream(evaluationsDataStreamDefinition);
    const coreStart = await root.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;
    coreDataStreams = coreStart.dataStreams;
    initializeDataStreamClient = () => coreDataStreams.initializeClient(EvaluationIndices.SCORES);
  });

  afterAll(async () => {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    await root?.shutdown().catch(() => {});
    await manageES?.stop().catch(() => {});
  });

  beforeEach(async () => {
    jest.useRealTimers();
    if (esClient) {
      await cleanupScoresStorage(esClient);
      await initializeDataStreamClient();
    }
  });

  afterEach(async () => {
    if (esClient) {
      await cleanupScoresStorage(esClient);
    }
  });

  it('ingests scores with deterministic conflicts on rewrite', async () => {
    const service = new EvaluationScoreService(loggingSystemMock.createLogger(), coreDataStreams);
    const experimentId = `service-integration-experiment-${Date.now()}`;
    const payload = getPayload(experimentId);

    expect(
      await esClient.indices.existsIndexTemplate({
        name: EvaluationIndices.SCORES,
      })
    ).toBe(true);

    const dataStream = await esClient.indices.getDataStream({
      name: EvaluationIndices.SCORES,
    });
    expect(dataStream.data_streams.map(({ name }) => name)).toContain(EvaluationIndices.SCORES);

    const firstWrite = await service.write(payload);
    expect(firstWrite).toEqual({ ingested: payload.scores.length, conflicted: 0, failed: [] });

    const searchResult = await service.search({
      query: {
        term: {
          experiment_id: experimentId,
        },
      },
    });
    expect(searchResult.hits.hits).toHaveLength(payload.scores.length);

    const secondWrite = await service.write(payload);
    expect(secondWrite).toEqual({ ingested: 0, conflicted: payload.scores.length, failed: [] });
  });
});
