/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { EvaluationScoreDocument, IngestScoresRequestBody } from '@kbn/evals-common';
import {
  EvaluationScoreService,
  computeScoreDocumentId,
  type WriteResult,
} from './evaluation_score_service';
import {
  EVALUATIONS_DATA_STREAM_ALIAS,
  EVALUATIONS_DATA_STREAM_TEMPLATE,
  EVALUATIONS_DEFAULT_ILM_POLICY,
} from './scores_index_template';

const getBaseRequest = (): IngestScoresRequestBody => ({
  run_id: 'run-1',
  experiment_id: 'exp-1',
  suite_id: 'suite-1',
  task_model: {
    id: 'task-model',
    family: 'task-family',
    provider: 'openai',
  },
  evaluator_model: {
    id: 'eval-model',
    family: 'eval-family',
    provider: 'anthropic',
  },
  run_metadata: {
    git_branch: 'main',
    git_commit_sha: 'abc123',
    total_repetitions: 2,
  },
  environment: {
    hostname: 'worker-01',
  },
  ci: {
    buildkite: {
      build_id: 'build-1',
      job_id: 'job-1',
    },
  },
  scores: [
    {
      example: {
        id: 'example-1',
        index: 1,
        input: { question: 'What is Kibana?' },
        dataset: {
          id: 'dataset-1',
          name: 'Dataset 1',
        },
      },
      task: {
        trace_id: 'trace-task-1',
        repetition_index: 0,
        output: { answer: 'An observability platform' },
      },
      evaluator: {
        name: 'correctness',
        score: 0.8,
        label: 'good',
        explanation: 'mostly correct',
        metadata: { rubric: 'v1' },
        trace_id: 'trace-evaluator-1',
      },
    },
  ],
});

interface BulkOptions {
  datasource: Array<{ index: number; payload: EvaluationScoreDocument }>;
  onDocument: (document: { index: number; payload: EvaluationScoreDocument }) => unknown;
  onDrop: (document: unknown) => void;
}

const createEsClientMock = (
  bulkImplementation?: (
    options: BulkOptions
  ) => Promise<{ failed: number; successful: number; total: number }>
) => {
  const bulk = jest.fn(
    bulkImplementation ??
      (async ({ datasource }: BulkOptions) => ({
        failed: 0,
        successful: datasource.length,
        total: datasource.length,
      }))
  );

  const esClient = {
    ilm: {
      putLifecycle: jest.fn().mockResolvedValue({}),
    },
    indices: {
      existsIndexTemplate: jest.fn().mockResolvedValue(false),
      putIndexTemplate: jest.fn().mockResolvedValue({}),
      getDataStream: jest.fn().mockRejectedValue({ statusCode: 404 }),
      createDataStream: jest.fn().mockResolvedValue({}),
    },
    helpers: {
      bulk,
    },
  } as unknown as ElasticsearchClient;

  return {
    esClient,
    bulk,
    ilmPutLifecycle: esClient.ilm.putLifecycle as jest.Mock,
    existsIndexTemplate: esClient.indices.existsIndexTemplate as jest.Mock,
    putIndexTemplate: esClient.indices.putIndexTemplate as jest.Mock,
    getDataStream: esClient.indices.getDataStream as jest.Mock,
    createDataStream: esClient.indices.createDataStream as jest.Mock,
  };
};

describe('EvaluationScoreService', () => {
  it('bootstraps template, data stream, and ILM on stateful deployments', async () => {
    const logger = loggingSystemMock.createLogger();
    const service = new EvaluationScoreService(logger, false);
    const { esClient, ilmPutLifecycle, putIndexTemplate, createDataStream } = createEsClientMock();

    await service.installAssets(esClient);

    expect(ilmPutLifecycle).toHaveBeenCalledWith({
      name: EVALUATIONS_DEFAULT_ILM_POLICY,
      policy: {
        phases: {
          hot: { actions: {} },
          delete: { min_age: '90d', actions: { delete: {} } },
        },
      },
    });
    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVALUATIONS_DATA_STREAM_TEMPLATE,
        template: expect.objectContaining({
          settings: expect.objectContaining({
            index: { lifecycle: { name: EVALUATIONS_DEFAULT_ILM_POLICY } },
          }),
        }),
      })
    );
    expect(createDataStream).toHaveBeenCalledWith({ name: EVALUATIONS_DATA_STREAM_ALIAS });
  });

  it('skips ILM bootstrap on serverless deployments', async () => {
    const logger = loggingSystemMock.createLogger();
    const service = new EvaluationScoreService(logger, true);
    const { esClient, ilmPutLifecycle, putIndexTemplate } = createEsClientMock();

    await service.installAssets(esClient);

    expect(ilmPutLifecycle).not.toHaveBeenCalled();
    expect(putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          settings: expect.not.objectContaining({
            index: expect.anything(),
          }),
        }),
      })
    );
  });

  it('installAssets is idempotent when called multiple times', async () => {
    const logger = loggingSystemMock.createLogger();
    const service = new EvaluationScoreService(logger, false);
    const { esClient, existsIndexTemplate, getDataStream, putIndexTemplate, createDataStream } =
      createEsClientMock();

    existsIndexTemplate.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    getDataStream.mockRejectedValueOnce({ statusCode: 404 }).mockResolvedValueOnce({});

    await service.installAssets(esClient);
    await service.installAssets(esClient);

    expect(existsIndexTemplate).toHaveBeenCalledTimes(2);
    expect(getDataStream).toHaveBeenCalledTimes(2);
    expect(putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(createDataStream).toHaveBeenCalledTimes(1);
  });

  it('retries transient Elasticsearch errors during installAssets', async () => {
    const logger = loggingSystemMock.createLogger();
    const service = new EvaluationScoreService(logger, false);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { esClient, putIndexTemplate, existsIndexTemplate, getDataStream } = createEsClientMock();

    existsIndexTemplate.mockResolvedValue(false);
    putIndexTemplate
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValueOnce({});
    getDataStream.mockResolvedValueOnce({});

    await service.installAssets(esClient);

    expect(putIndexTemplate).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Retrying Elasticsearch operation')
    );

    randomSpy.mockRestore();
  });

  it('write maps request fields and preserves deterministic ids', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    const capturedDocuments: EvaluationScoreDocument[] = [];
    const capturedCreateIds: string[] = [];

    const { esClient } = createEsClientMock(async ({ datasource, onDocument }: BulkOptions) => {
      for (const document of datasource) {
        capturedDocuments.push(document.payload);
        const operation = onDocument(document) as {
          create: { _id: string };
        };
        capturedCreateIds.push(operation.create._id);
      }

      return {
        failed: 0,
        successful: datasource.length,
        total: datasource.length,
      };
    });

    const service = new EvaluationScoreService(logger, false);
    const result = await service.write(esClient, request);

    expect(result).toEqual<WriteResult>({ ingested: 1, conflicted: 0, failed: [] });
    expect(capturedCreateIds).toEqual([
      'run-1-suite-1-task-model-dataset-1-example-1-correctness-0',
    ]);

    const firstDocument = capturedDocuments[0];
    expect(firstDocument).toMatchSnapshot({
      '@timestamp': expect.any(String),
    });
    expect(computeScoreDocumentId(capturedDocuments[0])).toBe(
      'run-1-suite-1-task-model-dataset-1-example-1-correctness-0'
    );
  });

  it('treats 409 bulk drops as idempotent conflicts', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    const { esClient } = createEsClientMock(async ({ datasource, onDrop }) => {
      for (const _document of datasource) {
        onDrop({
          status: 409,
          error: {
            type: 'version_conflict_engine_exception',
            reason: 'document already exists',
          },
        });
      }

      return {
        failed: datasource.length,
        successful: 0,
        total: datasource.length,
      };
    });

    const service = new EvaluationScoreService(logger, false);
    const result = await service.write(esClient, request);

    expect(result).toEqual({ ingested: 0, conflicted: 1, failed: [] });
  });

  it('returns per-document failures when non-409 bulk drops occur', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    const { esClient } = createEsClientMock(async ({ datasource, onDrop }) => {
      onDrop({
        document: datasource[0],
        status: 409,
        error: {
          type: 'version_conflict_engine_exception',
          reason: 'already exists',
        },
      });
      onDrop({
        document: datasource[0],
        status: 500,
        error: {
          type: 'mapper_parsing_exception',
          reason: 'bad field',
        },
      });

      return {
        failed: 2,
        successful: 0,
        total: datasource.length,
      };
    });

    const service = new EvaluationScoreService(logger, false);

    await expect(service.write(esClient, request)).resolves.toEqual({
      ingested: 0,
      conflicted: 1,
      failed: [{ index: 0, status: 500, reason: 'bad field' }],
    });
  });
});
