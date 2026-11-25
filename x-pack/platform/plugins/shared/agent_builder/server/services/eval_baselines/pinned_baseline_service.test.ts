/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AnyIDataStreamClient } from '@kbn/data-streams';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { EvaluationIndices, buildSpaceFilter } from '@kbn/evals-common';
import { PinnedBaselineService } from './pinned_baseline_service';

const createDataStreamsMock = () => {
  const create = jest.fn();
  // By default no pointer exists yet, so pin()'s already-published lookup finds nothing.
  const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
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
  it('pin writes the snapshotted scores first and publishes the pointer last', async () => {
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
    expect(create).toHaveBeenCalledTimes(2);
    // Scores land before the pointer: an interrupted pin must never leave a pointer
    // referencing a partial snapshot. Only the final pointer write waits for a refresh.
    expect(create.mock.calls.map(([args]) => args.refresh)).toEqual([false, 'wait_for']);
    expect(captured.map(({ _id }) => _id)).toEqual([
      `baseline-1:${createHash('sha256').update('score-doc-1').digest('hex')}`,
      // The first pin's pointer is write-once: racing first pins conflict on this ID
      // instead of publishing competing pointers.
      'baseline-1:pointer',
    ]);
    expect(captured[1]).toMatchObject({
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
    expect(captured[0]).toMatchObject({
      doc_kind: 'score',
      baseline: { id: 'baseline-1' },
      evaluator: { name: 'correctness' },
    });
    // The snapshot is stamped with the pin's spaces, not the source scores' sharing.
    expect(captured[0].space_ids).toEqual(['default']);
    expect(baseline).toMatchObject({
      baseline_id: 'baseline-1',
      suite_id: 'suite-1',
      score_count: 1,
      dataset_ids: ['dataset-1'],
    });
  });

  it('pin scopes snapshot scores to its own spaces and bounds oversized document ids', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const captured: Array<{ _id: string } & Record<string, unknown>> = [];

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      captured.push(...(documents as Array<{ _id: string } & Record<string, unknown>>));
      return {
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      };
    });

    const service = new PinnedBaselineService(logger, coreDataStreams);
    const oversizedId = 'x'.repeat(600);
    await service.pin({
      pointer: getPointer(),
      scores: [
        {
          id: oversizedId,
          // The source score was shared into another space; the snapshot must not be.
          document: getScoreDocument({ space_ids: ['space-a', 'space-b'] } as never),
        },
      ],
      spaceIds: ['space-a'],
    });

    expect(captured[0].space_ids).toEqual(['space-a']);
    // Elasticsearch rejects IDs over 512 bytes, so the oversized source ID is hashed.
    expect(captured[0]._id).toMatch(/^baseline-1:[0-9a-f]{64}$/);
  });

  it('pin treats 409 conflicts as a successful retry, and throws on real failures', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => ({
      errors: false,
      items: documents.map(() => ({ create: { status: 409 } })),
    }));
    await expect(
      service.pin({
        pointer: getPointer(),
        scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
        spaceIds: ['default'],
      })
    ).resolves.toMatchObject({ baseline_id: 'baseline-1' });

    create.mockReset();
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

  it('pin does not publish the pointer when a snapshot score write fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    create.mockResolvedValueOnce({
      errors: true,
      items: [{ create: { status: 400, error: { reason: 'mapping failure' } } }],
    });

    await expect(
      service.pin({
        pointer: getPointer(),
        scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
        spaceIds: ['default'],
      })
    ).rejects.toThrow('mapping failure');

    expect(create).toHaveBeenCalledTimes(1);
    const writtenIds = (
      create.mock.calls[0][0] as { documents: Array<{ _id: string }> }
    ).documents.map(({ _id }) => _id);
    expect(writtenIds).toEqual([
      `baseline-1:${createHash('sha256').update('score-doc-1').digest('hex')}`,
    ]);
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
        // Space isolation: pointers from other Spaces must never be selected.
        buildSpaceFilter('default'),
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

  it('getScores serves a snapshot only through a visible pointer and strips attribution fields', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { doc_kind: 'pointer', baseline: { id: 'baseline-1', score_count: 1 } } },
          ],
        },
      })
      .mockResolvedValueOnce({
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

    // The pointer lookup is space-scoped like the scores read.
    const pointerRequest = search.mock.calls[0][0];
    expect(pointerRequest.query.bool.must).toEqual(
      expect.arrayContaining([
        { term: { doc_kind: 'pointer' } },
        { term: { 'baseline.id': 'baseline-1' } },
        buildSpaceFilter('default'),
      ])
    );
    const scoresRequest = search.mock.calls[1][0];
    expect(scoresRequest.query.bool.must).toEqual(
      expect.arrayContaining([
        { term: { doc_kind: 'score' } },
        { term: { 'baseline.id': 'baseline-1' } },
        // Space isolation: snapshot scores from other Spaces must never be returned.
        buildSpaceFilter('default'),
      ])
    );
    expect(scoresRequest).toMatchObject({
      size: 10000,
      // A failed shard must not silently shrink the baseline a comparison runs on.
      allow_partial_search_results: false,
    });
    expect(scores).toHaveLength(1);
    expect(scores![0]).not.toHaveProperty('doc_kind');
    expect(scores![0]).not.toHaveProperty('baseline');
    expect(scores![0]).toMatchObject({ experiment_id: 'exp-1' });
  });

  it('getScores refuses a snapshot whose readable scores disagree with the pointer count', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { doc_kind: 'pointer', baseline: { id: 'baseline-1', score_count: 2 } } },
          ],
        },
      })
      .mockResolvedValueOnce({
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

    await expect(
      service.getScores({ baselineId: 'baseline-1', spaceId: 'default' })
    ).rejects.toThrow('snapshot is incomplete');
  });

  it('getScores answers an unknown or invisible baseline with undefined, not an empty list', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    search.mockResolvedValueOnce({ hits: { hits: [] } });

    await expect(
      service.getScores({ baselineId: 'nope', spaceId: 'default' })
    ).resolves.toBeUndefined();
    expect(search).toHaveBeenCalledTimes(1);
  });

  const getStoredPointerHit = () => ({
    _source: {
      '@timestamp': '2026-11-01T00:00:00.000Z',
      doc_kind: 'pointer',
      space_ids: ['default'],
      baseline: {
        id: 'baseline-1',
        suite_id: 'suite-1',
        execution_id: 'bk-1::suite-1::gpt-5',
        judge_model_id: 'glm-5.2',
        pinned_at: '2026-11-01T00:00:00.000Z',
        score_count: 7,
        dataset_ids: ['dataset-1'],
      },
      task: { model: { id: 'gpt-5' } },
      metadata: { git: {} },
    },
  });

  it('pin promotes an already-published snapshot with a fresh pointer instead of rewriting it', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    search.mockResolvedValueOnce({ hits: { hits: [getStoredPointerHit()] } });
    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => ({
      errors: false,
      items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
    }));

    const baseline = await service.pin({
      pointer: getPointer(),
      scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
      spaceIds: ['default'],
    });

    // The snapshot is immutable — no score is rewritten — but the pin still publishes a
    // new pointer, so re-pinning a baseline promotes it back to latest (rollback).
    expect(create).toHaveBeenCalledTimes(1);
    const written = (create.mock.calls[0][0] as { documents: Array<Record<string, unknown>> })
      .documents;
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      _id: expect.stringMatching(/^baseline-1:pointer:/),
      doc_kind: 'pointer',
      baseline: expect.objectContaining({
        id: 'baseline-1',
        // The snapshot-derived metadata comes from the stored pointer, not this request.
        score_count: 7,
        // The pin attribution is this request's.
        pinned_by: 'rakesh',
        reason: 'monthly baseline',
      }),
    });
    expect(baseline).toMatchObject({ baseline_id: 'baseline-1', score_count: 7 });
    expect(baseline.pinned_at).not.toBe('2026-11-01T00:00:00.000Z');
  });

  it('pin returns the stored pointer when a concurrent first pin wins the write-once race', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    // No pointer is visible when this pin starts, but the winner's pointer is stored by
    // the time the losing pointer write conflicts.
    search
      .mockResolvedValueOnce({ hits: { hits: [] } })
      .mockResolvedValueOnce({ hits: { hits: [getStoredPointerHit()] } });
    create
      .mockImplementationOnce(async ({ documents }: { documents: Array<{ _id: string }> }) => ({
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      }))
      .mockImplementationOnce(async () => ({
        errors: false,
        items: [{ create: { status: 409 } }],
      }));

    const baseline = await service.pin({
      pointer: getPointer(),
      scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
      spaceIds: ['default'],
    });

    // The winner's view of the snapshot is the published one, not this request's.
    expect(baseline).toMatchObject({
      baseline_id: 'baseline-1',
      score_count: 7,
      pinned_at: '2026-11-01T00:00:00.000Z',
    });
  });

  it('pin holds the expected count against the winning pointer after losing the race', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    // This request's own scores satisfy the expectation (1), but the concurrent winner
    // published a 7-score snapshot: returning success would hand the caller a baseline
    // that does not meet the count it demanded.
    search
      .mockResolvedValueOnce({ hits: { hits: [] } })
      .mockResolvedValueOnce({ hits: { hits: [getStoredPointerHit()] } });
    create
      .mockImplementationOnce(async ({ documents }: { documents: Array<{ _id: string }> }) => ({
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      }))
      .mockImplementationOnce(async () => ({
        errors: false,
        items: [{ create: { status: 409 } }],
      }));

    await expect(
      service.pin({
        pointer: getPointer(),
        scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
        spaceIds: ['default'],
        expectedScoreCount: 1,
      })
    ).rejects.toThrow(/would hold 7 score\(s\), but 1 were expected/);
  });

  it('repin promotes the stored snapshot without reading any source scores', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    search.mockResolvedValueOnce({ hits: { hits: [getStoredPointerHit()] } });
    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => ({
      errors: false,
      items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
    }));

    const baseline = await service.repin({
      baselineId: 'baseline-1',
      pinnedBy: 'pipeline',
      reason: 'rollback',
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(baseline).toMatchObject({
      baseline_id: 'baseline-1',
      score_count: 7,
      pinned_by: 'pipeline',
      reason: 'rollback',
    });
  });

  it('repin answers an unknown baseline with undefined and writes nothing', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    await expect(
      service.repin({ baselineId: 'nope', pinnedBy: null, reason: null })
    ).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it('pin and repin refuse an expected score count the baseline cannot satisfy, before any write', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create, search } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    // Fresh pin: the deduped live scores are the count on offer.
    await expect(
      service.pin({
        pointer: getPointer(),
        scores: [
          { id: 'score-doc-1', document: getScoreDocument() },
          { id: 'score-doc-2', document: getScoreDocument() },
        ],
        spaceIds: ['default'],
        expectedScoreCount: 3,
      })
    ).rejects.toThrow(/would hold 2 score\(s\), but 3 were expected/);
    expect(create).not.toHaveBeenCalled();

    // Promotion paths validate against the stored snapshot's immutable count (7): a
    // mismatched re-pin must not promote the incomplete snapshot back to latest.
    search.mockResolvedValueOnce({ hits: { hits: [getStoredPointerHit()] } });
    await expect(
      service.repin({
        baselineId: 'baseline-1',
        pinnedBy: null,
        reason: null,
        expectedScoreCount: 9,
      })
    ).rejects.toThrow(/stored snapshot is immutable/);
    expect(create).not.toHaveBeenCalled();

    search.mockResolvedValueOnce({ hits: { hits: [getStoredPointerHit()] } });
    await expect(
      service.pin({
        pointer: getPointer(),
        scores: [{ id: 'score-doc-1', document: getScoreDocument() }],
        spaceIds: ['default'],
        expectedScoreCount: 9,
      })
    ).rejects.toThrow(/would hold 7 score\(s\), but 9 were expected/);
    expect(create).not.toHaveBeenCalled();
  });

  it('pin accepts a matching expected score count, counted after dedupe', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => ({
      errors: false,
      items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
    }));

    const baseline = await service.pin({
      pointer: getPointer(),
      scores: [
        { id: 'score-doc-1', document: getScoreDocument() },
        // A duplicate of the same source doc maps to one snapshot ID, so one is expected.
        { id: 'score-doc-1', document: getScoreDocument() },
      ],
      spaceIds: ['default'],
      expectedScoreCount: 1,
    });

    expect(baseline.score_count).toBe(1);
  });

  it('pin counts and writes a score served twice by the source stream only once', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
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
      scores: [
        { id: 'score-doc-1', document: getScoreDocument() },
        // A re-ingest after a rollover duplicates the same score across backing indices.
        { id: 'score-doc-1', document: getScoreDocument() },
        { id: 'score-doc-2', document: getScoreDocument() },
      ],
      spaceIds: ['default'],
    });

    // One snapshot document per source score, and a score_count a read can satisfy.
    expect(captured.filter(({ doc_kind: kind }) => kind === 'score')).toHaveLength(2);
    expect(baseline.score_count).toBe(2);
  });

  it('pin publishes no pointer when a later snapshot chunk fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const service = new PinnedBaselineService(logger, coreDataStreams);

    create
      .mockImplementationOnce(async ({ documents }: { documents: Array<{ _id: string }> }) => ({
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      }))
      .mockImplementationOnce(async () => ({
        errors: true,
        items: [{ create: { status: 503, error: { reason: 'shard unavailable' } } }],
      }));

    await expect(
      service.pin({
        pointer: getPointer(),
        scores: Array.from({ length: 1500 }, (_, index) => ({
          id: `score-doc-${index}`,
          document: getScoreDocument(),
        })),
        spaceIds: ['default'],
      })
    ).rejects.toThrow('shard unavailable');

    // The first chunk succeeded, the second failed, and the pointer write never happened.
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('pin writes a large snapshot in bounded chunks before the pointer', async () => {
    const logger = loggingSystemMock.createLogger();
    const { coreDataStreams, create } = createDataStreamsMock();
    const batchSizes: number[] = [];

    create.mockImplementation(async ({ documents }: { documents: Array<{ _id: string }> }) => {
      batchSizes.push(documents.length);
      return {
        errors: false,
        items: documents.map((document) => ({ create: { _id: document._id, status: 201 } })),
      };
    });

    const service = new PinnedBaselineService(logger, coreDataStreams);
    await service.pin({
      pointer: getPointer(),
      scores: Array.from({ length: 1500 }, (_, index) => ({
        id: `score-doc-${index}`,
        document: getScoreDocument(),
      })),
      spaceIds: ['default'],
    });

    // Two score chunks capped at 1000, then the pointer on its own.
    expect(batchSizes).toEqual([1000, 500, 1]);
  });
});
