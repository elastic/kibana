/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { EvaluationScoreDocument, IngestScoresRequestBody } from '@kbn/evals-common';
import {
  EvaluationScoreService,
  computeScoreDocumentId,
  type WriteResult,
} from './evaluation_score_service';

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
    helpers: {
      bulk,
    },
  } as unknown as ElasticsearchClient;

  return {
    esClient,
    bulk,
  };
};

describe('EvaluationScoreService', () => {
  it('write maps request fields and preserves deterministic ids', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    const capturedDocuments: EvaluationScoreDocument[] = [];
    const capturedCreateIds: string[] = [];

    const { esClient } = createEsClientMock(async ({ datasource, onDocument }: BulkOptions) => {
      for (const document of datasource) {
        capturedDocuments.push(document.payload);
        const operation = onDocument(document) as [
          { create: { _id: string } },
          EvaluationScoreDocument
        ];
        capturedCreateIds.push(operation[0].create._id);
      }

      return {
        failed: 0,
        successful: datasource.length,
        total: datasource.length,
      };
    });

    const service = new EvaluationScoreService(logger);
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

    const service = new EvaluationScoreService(logger);
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

    const service = new EvaluationScoreService(logger);

    await expect(service.write(esClient, request)).resolves.toEqual({
      ingested: 0,
      conflicted: 1,
      failed: [{ index: 0, status: 500, reason: 'bad field' }],
    });
  });
});
