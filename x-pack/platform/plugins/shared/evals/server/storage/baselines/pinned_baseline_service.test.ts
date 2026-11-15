/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AnyIDataStreamClient } from '@kbn/data-streams';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { EvaluationIndices } from '@kbn/evals-common';
import { PinnedBaselineService } from './pinned_baseline_service';

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

const getScoreDocument = (overrides?: Partial<EvaluationScoreDocument>) =>
  ({
    '@timestamp': '2026-10-27T00:00:00.000Z',
    experiment_id: 'exp-1',
    space_ids: ['default'],
    example: {
      id: 'example-1',
      index: 1,
      dataset: { id: 'dataset-1', name: 'Dataset 1' },
    },
    task: {
      trace_id: 'trace-1',
      repetition_index: 0,
      model: { id: 'gpt-5', family: 'gpt', provider: 'openai' },
    },
    evaluator: {
      name: 'correctness',
      score: 0.8,
      kind: 'llm',
      model: { id: 'glm-5.2', family: 'glm', provider: 'zai' },
    },
    metadata: {
      execution_id: 'bk-1::suite-1::gpt-5',
      suite_id: 'suite-1',
      git: { branch: 'main', commit_sha: 'abc123' },
    },
    ...overrides,
  } as unknown as EvaluationScoreDocument);

const getPointer = () => ({
  baseline_id: 'baseline-1',
  suite_id: 'suite-1',
  execution_id: 'bk-1::suite-1::gpt-5',
  task_model: { id: 'gpt-5', family: 'gpt', provider: 'openai' },
  judge_model_id: 'glm-5.2',
  git_branch: 'main',
  git_commit_sha: 'abc123',
  pinned_by: 'rakesh',
  reason: 'monthly baseline',
});

describe('PinnedBaselineService', () => {
  it('pin writes one pointer and the snapshotted scores with deterministic ids', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, initializeClient, create } = createDataStreamsMock();
    const captured: Array<{ _id: string } & Record<string, unknown>> = [];

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      captured.push(...(documents as Array<{ _id: string } & Record<string, unknown>>));
      return {
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      };
    });

    const service = new PinnedBaselineService(logger, coreDataStreams);
    const baseline = await service.pin({
      pointer: getPointer(),
      scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
      spaceIds: ['default'],
    });

    expect(initializeClient).toHaveBeenCalledWith(EvaluationIndices.PINNED_BASELINES);
    expect(create).toHaveBeenCalledWith({ documents: expect.any(Array), refresh: 'wait_for' });
    expect(captured.map(({ _id }) => _id)).toEqual(['baseline-1', 'baseline-1:score-doc-1']);
    expect(captured[0]).toMatchObject({
      doc_kind: 'pointer',
      space_ids: ['default'],
      baseline: {
        id: 'baseline-1',
        suite_id: 'suite-1',
        execution_id: 'bk-1::suite-1::gpt-5',
        judge_model_id: 'glm-5.2',
        score_count: 1,
        dataset_ids: ['dataset-1'],
        reason: 'monthly baseline',
      },
      task: { model: { id: 'gpt-5' } },
    });
    expect(captured[1]).toMatchObject({
      doc_kind: 'score',
      baseline: { id: 'baseline-1' },
      evaluator: { name: 'correctness' },
    });
    expect(baseline).toMatchObject({
      baseline_id: 'baseline-1',
      suite_id: 'suite-1',
      score_count: 1,
      dataset_ids: ['dataset-1'],
    });
  });

  it('pin treats 409 conflicts as a successful retry, and throws on real failures', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    create.mockResolvedValueOnce({
      errors: false,
      items: [{ create: { status: 409 } }, { create: { status: 409 } }],
    });
    await expect(
      service.pin({
        pointer: getPointer(),
        scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
        spaceIds: ['default'],
      })
    ).resolves.toMatchObject({ baseline_id: 'baseline-1' });

    create.mockResolvedValueOnce({
      errors: true,
      items: [{ create: { status: 400, error: { reason: 'mapping failure' } } }],
    });
    await expect(
      service.pin({
        pointer: getPointer(),
        scores: [],
        spaceIds: ['default'],
      })
    ).rejects.toThrow('mapping failure');
  });

  it('findLatest queries pointer docs by suite/model/space and maps the hit', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '2026-10-27T00:00:00.000Z',
              doc_kind: 'pointer',
              space_ids: ['default'],
              baseline: {
                id: 'baseline-1',
                suite_id: 'suite-1',
                execution_id: 'bk-1::suite-1::gpt-5',
                judge_model_id: 'glm-5.2',
                pinned_at: '2026-10-27T00:00:00.000Z',
                pinned_by: 'rakesh',
                reason: 'monthly baseline',
                score_count: 1,
                dataset_ids: ['dataset-1'],
              },
              task: { model: { id: 'gpt-5', family: 'gpt', provider: 'openai' } },
              metadata: { git: { branch: 'main', commit_sha: 'abc123' } },
            },
          },
        ],
      },
    });

    const baseline = await service.findLatest({
      suiteId: 'suite-1',
      modelId: 'gpt-5',
      spaceId: 'default',
    });

    const searchRequest = search.mock.calls[0][0];
    expect(searchRequest.query.bool.must).toEqual(
      expect.arrayContaining([
        { term: { doc_kind: 'pointer' } },
        { term: { 'baseline.suite_id': 'suite-1' } },
        { term: { 'task.model.id': 'gpt-5' } },
      ])
    );
    expect(searchRequest.sort).toEqual([{ 'baseline.pinned_at': { order: 'desc' } }]);
    expect(baseline).toMatchObject({
      baseline_id: 'baseline-1',
      execution_id: 'bk-1::suite-1::gpt-5',
      judge_model_id: 'glm-5.2',
      git_commit_sha: 'abc123',
      pinned_at: '2026-10-27T00:00:00.000Z',
    });
  });

  it('findLatest returns undefined when nothing is pinned', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, search } = createDataStreamsMock();
    search.mockResolvedValue({ hits: { hits: [] } });

    const service = new PinnedBaselineService(logger, coreDataStreams);
    await expect(service.findLatest({ suiteId: 'suite-1' })).resolves.toBeUndefined();
  });

  it('getScores strips the snapshot attribution fields from the returned documents', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              ...getScoreDocument(),
              doc_kind: 'score',
              baseline: { id: 'baseline-1' },
            },
          },
        ],
      },
    });

    const scores = await service.getScores({ baselineId: 'baseline-1', spaceId: 'default' });

    const searchRequest = search.mock.calls[0][0];
    expect(searchRequest.query.bool.must).toEqual(
      expect.arrayContaining([
        { term: { doc_kind: 'score' } },
        { term: { 'baseline.id': 'baseline-1' } },
      ])
    );
    expect(scores).toHaveLength(1);
    expect(scores[0]).not.toHaveProperty('doc_kind');
    expect(scores[0]).not.toHaveProperty('baseline');
    expect(scores[0]).toMatchObject({ experiment_id: 'exp-1' });
  });
});
