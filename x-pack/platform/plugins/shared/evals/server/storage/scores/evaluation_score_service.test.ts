/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AnyIDataStreamClient, ClientSearchRequest } from '@kbn/data-streams';
import type { EvaluationScoreDocument, IngestScoresRequestBody } from '@kbn/evals-common';
import { EvaluationIndices } from '@kbn/evals-common';
import {
  EvaluationScoreService,
  computeScoreDocumentId,
  type WriteResult,
} from './evaluation_score_service';

const getBaseRequest = (): IngestScoresRequestBody => ({
  experiment_id: 'exp-1',
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
  metadata: {
    execution_id: 'exec-1',
    suite_id: 'suite-1',
    total_repetitions: 2,
    hostname: 'worker-01',
    git: {
      branch: 'main',
      commit_sha: 'abc123',
    },
    ci: {
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
        metadata: { category: 'es-and-cases-creation' },
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
        direction: 'maximize',
      },
    },
  ],
});

const createDataStreamsMock = () => {
  const create = jest.fn();
  const search = jest.fn();
  const dataStreamClient = {
    create,
    search,
  } as unknown as AnyIDataStreamClient;
  const coreDataStreams = {
    initializeClient: jest.fn().mockResolvedValue(dataStreamClient),
  } as unknown as DataStreamsStart;

  return {
    coreDataStreams,
    initializeClient: coreDataStreams.initializeClient as jest.Mock,
    create,
    search,
  };
};

describe('EvaluationScoreService', () => {
  it('write maps request fields and preserves deterministic ids', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    const capturedDocuments: Array<{ _id: string } & EvaluationScoreDocument> = [];
    const { coreDataStreams, initializeClient, create } = createDataStreamsMock();

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      capturedDocuments.push(...(documents as Array<{ _id: string } & EvaluationScoreDocument>));
      return {
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      };
    });

    const service = new EvaluationScoreService(logger, coreDataStreams);
    const result = await service.write(request, ['default']);

    expect(result).toEqual<WriteResult>({ ingested: 1, conflicted: 0, failed: [] });
    expect(initializeClient).toHaveBeenCalledWith(EvaluationIndices.SCORES);
    expect(create).toHaveBeenCalledWith({
      documents: expect.any(Array),
      refresh: 'wait_for',
    });
    expect(capturedDocuments.map(({ _id }) => _id)).toEqual([
      'exp-1-suite-1-task-model-dataset-1-example-1-correctness-0',
    ]);

    const firstDocument = capturedDocuments[0];
    expect(firstDocument).toMatchObject({
      '@timestamp': expect.any(String),
      _id: expect.any(String),
      experiment_id: request.experiment_id,
      space_ids: ['default'],
      metadata: {
        execution_id: request.metadata.execution_id,
        suite_id: request.metadata.suite_id,
        total_repetitions: request.metadata.total_repetitions,
        hostname: request.metadata.hostname,
        git: request.metadata.git,
        ci: request.metadata.ci,
      },
      example: {
        id: request.scores[0].example.id,
        metadata: request.scores[0].example.metadata,
        dataset: request.scores[0].example.dataset,
      },
      task: { model: request.task_model, repetition_index: 0 },
      evaluator: {
        model: request.evaluator_model,
        name: 'correctness',
        direction: 'maximize',
      },
    });
    expect(computeScoreDocumentId(capturedDocuments[0])).toBe(
      'exp-1-suite-1-task-model-dataset-1-example-1-correctness-0'
    );
  });

  it('leaves direction undefined when the ingest field is absent', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    delete request.scores[0].evaluator.direction;
    const capturedDocuments: Array<{ _id: string } & EvaluationScoreDocument> = [];
    const { coreDataStreams, create } = createDataStreamsMock();

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      capturedDocuments.push(...(documents as Array<{ _id: string } & EvaluationScoreDocument>));
      return {
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      };
    });

    const service = new EvaluationScoreService(logger, coreDataStreams);
    await service.write(request, ['default']);

    expect(capturedDocuments[0].evaluator.direction).toBeUndefined();
  });

  it('persists direction: minimize for lower-is-better evaluators', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    request.scores[0].evaluator = {
      ...request.scores[0].evaluator,
      name: 'Latency',
      direction: 'minimize',
    };
    const capturedDocuments: Array<{ _id: string } & EvaluationScoreDocument> = [];
    const { coreDataStreams, create } = createDataStreamsMock();

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      capturedDocuments.push(...(documents as Array<{ _id: string } & EvaluationScoreDocument>));
      return {
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      };
    });

    const service = new EvaluationScoreService(logger, coreDataStreams);
    await service.write(request, ['default']);

    expect(capturedDocuments[0].evaluator.direction).toBe('minimize');
  });
  describe('evaluator model attribution', () => {
    const captureDocuments = async (request: IngestScoresRequestBody) => {
      const captured: Array<{ _id: string } & EvaluationScoreDocument> = [];
      const { coreDataStreams, create } = createDataStreamsMock();

      create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
        captured.push(...(documents as Array<{ _id: string } & EvaluationScoreDocument>));
        return {
          errors: false,
          items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
        };
      });

      const service = new EvaluationScoreService(loggingSystemMock.createLogger(), coreDataStreams);
      await service.write(request, ['default']);

      return captured;
    };

    const withScoreEvaluator = (
      evaluator: Partial<IngestScoresRequestBody['scores'][number]['evaluator']>
    ): IngestScoresRequestBody => {
      const request = getBaseRequest();
      return {
        ...request,
        scores: [
          {
            ...request.scores[0],
            evaluator: { ...request.scores[0].evaluator, ...evaluator },
          },
        ],
      };
    };

    it('prefers the model the evaluator reports over the request default', async () => {
      const perScoreModel = { id: 'gpt-4o', family: 'GPT', provider: 'OpenAI' };
      const documents = await captureDocuments(
        withScoreEvaluator({ kind: 'llm', model: perScoreModel })
      );

      expect(documents[0].evaluator).toMatchObject({ kind: 'llm', model: perScoreModel });
    });

    it('leaves code evaluators unattributed rather than applying the request default', async () => {
      const documents = await captureDocuments(withScoreEvaluator({ kind: 'code' }));

      expect(documents[0].evaluator).toMatchObject({ kind: 'code' });
      expect(documents[0].evaluator.model).toBeUndefined();
    });

    it('still honors a model a code evaluator reports', async () => {
      const perScoreModel = { id: 'gpt-4o', family: 'GPT', provider: 'OpenAI' };
      const documents = await captureDocuments(
        withScoreEvaluator({ kind: 'code', model: perScoreModel })
      );

      expect(documents[0].evaluator.model).toEqual(perScoreModel);
    });

    it('falls back to the request default when the evaluator reports neither model nor kind', async () => {
      const request = getBaseRequest();
      const documents = await captureDocuments(request);

      expect(documents[0].evaluator.model).toEqual(request.evaluator_model);
      expect(documents[0].evaluator.kind).toBeUndefined();
    });

    it('falls back to the request default for llm evaluators that report no model', async () => {
      const request = withScoreEvaluator({ kind: 'llm' });
      const documents = await captureDocuments(request);

      expect(documents[0].evaluator.model).toEqual(request.evaluator_model);
    });

    it('preserves the evaluator version', async () => {
      const documents = await captureDocuments(withScoreEvaluator({ version: '1.2.0' }));

      expect(documents[0].evaluator.version).toBe('1.2.0');
    });

    it('attributes each score in one request independently', async () => {
      const request = getBaseRequest();
      const judgeModel = { id: 'claude-sonnet-4', family: 'Claude', provider: 'Anthropic' };
      const documents = await captureDocuments({
        ...request,
        scores: [
          {
            ...request.scores[0],
            evaluator: { name: 'correctness', score: 0.8, kind: 'llm', model: judgeModel },
          },
          {
            ...request.scores[0],
            evaluator: { name: 'latency', score: 42, kind: 'code' },
          },
        ],
      });

      expect(documents.map(({ evaluator }) => [evaluator.name, evaluator.model])).toEqual([
        ['correctness', judgeModel],
        ['latency', undefined],
      ]);
    });
  });

  it('treats 409 bulk drops as idempotent conflicts', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    const { coreDataStreams, create } = createDataStreamsMock();

    create.mockResolvedValue({
      errors: true,
      items: [{ create: { _id: 'doc-1', status: 409 } }],
    });

    const service = new EvaluationScoreService(logger, coreDataStreams);
    const result = await service.write(request, ['default']);

    expect(result).toEqual({ ingested: 0, conflicted: 1, failed: [] });
  });

  it('stamps every document with the provided space ids', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = getBaseRequest();
    const capturedDocuments: Array<{ _id: string } & EvaluationScoreDocument> = [];
    const { coreDataStreams, create } = createDataStreamsMock();

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      capturedDocuments.push(...(documents as Array<{ _id: string } & EvaluationScoreDocument>));
      return {
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      };
    });

    const service = new EvaluationScoreService(logger, coreDataStreams);
    await service.write(request, ['marketing', 'sales']);

    expect(capturedDocuments[0].space_ids).toEqual(['marketing', 'sales']);
  });

  it('returns per-document failures when non-409 bulk drops occur', async () => {
    const logger = loggingSystemMock.createLogger();
    const request = {
      ...getBaseRequest(),
      scores: [
        ...getBaseRequest().scores,
        {
          ...getBaseRequest().scores[0],
          evaluator: {
            ...getBaseRequest().scores[0].evaluator,
            name: 'fluency',
          },
        },
      ],
    };
    const { coreDataStreams, create } = createDataStreamsMock();

    create.mockResolvedValue({
      errors: true,
      items: [
        { create: { _id: 'doc-1', status: 409 } },
        {
          create: {
            _id: 'doc-2',
            status: 400,
            error: {
              type: 'mapper_parsing_exception',
              reason: 'bad field',
            },
          },
        },
      ],
    });

    const service = new EvaluationScoreService(logger, coreDataStreams);

    await expect(service.write(request, ['default'])).resolves.toEqual({
      ingested: 0,
      conflicted: 1,
      failed: [{ index: 1, status: 400, reason: 'bad field' }],
    });
  });

  it('search delegates to data stream client search', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, initializeClient, search } = createDataStreamsMock();
    const request: ClientSearchRequest = {
      query: {
        match_all: {},
      },
      size: 10,
    };
    const response = {
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
    } as Awaited<ReturnType<AnyIDataStreamClient['search']>>;
    search.mockResolvedValue(response);

    const service = new EvaluationScoreService(logger, coreDataStreams);
    await expect(service.search(request)).resolves.toBe(response);
    expect(initializeClient).toHaveBeenCalledWith(EvaluationIndices.SCORES);
    expect(search).toHaveBeenCalledWith(request);
  });
});
