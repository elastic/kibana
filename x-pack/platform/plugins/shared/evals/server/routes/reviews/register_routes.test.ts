/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import {
  API_VERSIONS,
  EVALS_EVALUATOR_REVIEW_AGREEMENT_URL,
  EVALS_REVIEW_QUEUES_URL,
  EVALS_REVIEW_QUEUE_AGREEMENT_URL,
  EVALS_REVIEW_QUEUE_ITEM_URL,
  EVALS_REVIEW_QUEUE_NEXT_URL,
  EVALS_REVIEW_QUEUE_URL,
} from '@kbn/evals-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { ReviewItemAlreadyReviewedError } from '../../storage/reviews/review_item_already_reviewed_error';
import { ReviewItemNotFoundError } from '../../storage/reviews/review_item_not_found_error';
import type { RouteDependencies } from '../register_routes';
import { registerReviewQueueRoutes } from './register_routes';

const queueAttributes = {
  name: 'Weekly sample',
  source_filter: { source: 'online' as const, monitor_id: 'monitor-1' },
  evaluator_name: 'correctness',
  evaluator_version: '1.0.0',
  sample_size: 2,
  strategy: 'uniform' as const,
  rubric: 'Pass when the answer is correct.',
  created_at: '2026-01-01T00:00:00.000Z',
};

const queueSo = { id: 'queue-1', type: 'evals-review-queue', attributes: queueAttributes };

const storedItem = {
  id: 'queue-1:0',
  queue_id: 'queue-1',
  position: 0,
  status: 'pending' as const,
  source: { source: 'online' as const, monitor_id: 'monitor-1', trace_id: 'trace-1' },
  evaluator: { name: 'correctness', version: '1.0.0' },
  score: { value: 1, label: 'pass' },
};

describe('human review queue routes', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockResolvedValue(queueSo as never);

    registerReviewQueueRoutes({
      router,
      logger,
      getInternalReviewQueuesSoClient: async () => soClient,
      getSpaceId: jest.fn().mockResolvedValue('space-a'),
      getCurrentUsername: jest.fn().mockResolvedValue('reviewer'),
      getCurrentProfileUid: jest.fn().mockResolvedValue('profile-1'),
    } as unknown as RouteDependencies);

    const versioned = router.versioned as MockedVersionedRouter;
    const handlerFor = (method: 'get' | 'post', url: string) =>
      versioned.getRoute(method, url).versions[API_VERSIONS.internal.v1].handler;

    const reviewClient = {
      createPendingItems: jest.fn(),
      getNextPending: jest.fn(),
      listItems: jest.fn(),
      countByStatus: jest.fn().mockResolvedValue({ pending: 2, reviewed: 0, skipped: 0 }),
      submitVerdict: jest.fn(),
    };
    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };
    const onlineScoreService = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: { monitor: { id: 'monitor-1' }, trace_id: 't-1', score: { label: 'pass' } },
            },
            {
              _source: { monitor: { id: 'monitor-1' }, trace_id: 't-2', score: { label: 'fail' } },
            },
          ],
        },
      }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        evaluationScoreService,
        onlineScoreService,
        reviewService: { getClient: jest.fn().mockReturnValue(reviewClient) },
      } as never,
    });

    return { versioned, handlerFor, soClient, reviewClient, onlineScoreService, context, logger };
  };

  it.each([
    ['post', EVALS_REVIEW_QUEUES_URL],
    ['get', EVALS_REVIEW_QUEUES_URL],
    ['get', EVALS_REVIEW_QUEUE_URL],
    ['get', EVALS_REVIEW_QUEUE_NEXT_URL],
    ['post', EVALS_REVIEW_QUEUE_ITEM_URL],
    ['get', EVALS_REVIEW_QUEUE_AGREEMENT_URL],
    ['get', EVALS_EVALUATOR_REVIEW_AGREEMENT_URL],
  ] as const)('guards %s %s with the review privilege only', (method, url) => {
    const { versioned } = setup();

    const { config } = versioned.getRoute(method, url);

    expect(config.security).toEqual({
      authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.review] },
    });
  });

  it('creates a queue from sampled scores and returns it with pending counts', async () => {
    const { handlerFor, soClient, reviewClient, context } = setup();
    soClient.create.mockResolvedValue(queueSo as never);

    const response = await handlerFor('post', EVALS_REVIEW_QUEUES_URL)(
      context as never,
      httpServerMock.createKibanaRequest({ body: queueAttributes }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(soClient.create).toHaveBeenCalledWith(
      'evals-review-queue',
      expect.objectContaining({ evaluator_name: 'correctness', created_by: 'reviewer' }),
      expect.objectContaining({ namespace: 'space-a' })
    );
    expect(reviewClient.createPendingItems).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ position: 0 })])
    );
    expect(response.payload).toMatchObject({ counts: { pending: 2 } });
  });

  it('rejects a queue when no scored trace matches, creating nothing', async () => {
    const { handlerFor, soClient, onlineScoreService, context } = setup();
    onlineScoreService.search.mockResolvedValueOnce({ hits: { hits: [] } });

    const response = await handlerFor('post', EVALS_REVIEW_QUEUES_URL)(
      context as never,
      httpServerMock.createKibanaRequest({ body: queueAttributes }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('removes the queue when its items cannot be written', async () => {
    const { handlerFor, soClient, reviewClient, context } = setup();
    soClient.create.mockResolvedValue(queueSo as never);
    reviewClient.createPendingItems.mockRejectedValue(new Error('es down'));
    soClient.delete.mockResolvedValue({});

    const response = await handlerFor('post', EVALS_REVIEW_QUEUES_URL)(
      context as never,
      httpServerMock.createKibanaRequest({ body: queueAttributes }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
    expect(soClient.delete).toHaveBeenCalledWith(
      'evals-review-queue',
      'queue-1',
      expect.objectContaining({ namespace: 'space-a' })
    );
  });

  it('withholds the judge verdict from the next pending item', async () => {
    const { handlerFor, reviewClient, context } = setup();
    reviewClient.getNextPending.mockResolvedValue(storedItem);

    const response = await handlerFor('get', EVALS_REVIEW_QUEUE_NEXT_URL)(
      context as never,
      httpServerMock.createKibanaRequest({ params: { queueId: 'queue-1' } }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.item).toMatchObject({ id: 'queue-1:0', status: 'pending' });
    expect(response.payload.item).not.toHaveProperty('score');
    expect(JSON.stringify(response.payload)).not.toContain('"label":"pass"');
  });

  it('returns a null item when the queue has nothing left to review', async () => {
    const { handlerFor, reviewClient, context } = setup();
    reviewClient.getNextPending.mockResolvedValue(undefined);

    const response = await handlerFor('get', EVALS_REVIEW_QUEUE_NEXT_URL)(
      context as never,
      httpServerMock.createKibanaRequest({ params: { queueId: 'queue-1' } }),
      kibanaResponseFactory
    );

    expect(response.payload).toEqual({ item: null });
  });

  it('reveals the judge verdict only in the submit response', async () => {
    const { handlerFor, reviewClient, context } = setup();
    reviewClient.submitVerdict.mockResolvedValue({
      ...storedItem,
      status: 'reviewed',
      human: { label: 'fail', reviewed_at: '2026-01-01T00:00:00.000Z' },
    });

    const response = await handlerFor('post', EVALS_REVIEW_QUEUE_ITEM_URL)(
      context as never,
      httpServerMock.createKibanaRequest({
        params: { queueId: 'queue-1', itemId: 'queue-1:0' },
        body: { label: 'fail', rationale: 'wrong date' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(reviewClient.submitVerdict).toHaveBeenCalledWith(
      'queue-1',
      'queue-1:0',
      {
        label: 'fail',
        value: undefined,
        rationale: 'wrong date',
        reviewer_profile_uid: 'profile-1',
      },
      'reviewed'
    );
    expect(response.payload.item.score).toEqual({ value: 1, label: 'pass' });
  });

  it('records a skip without a label', async () => {
    const { handlerFor, reviewClient, context } = setup();
    reviewClient.submitVerdict.mockResolvedValue({ ...storedItem, status: 'skipped' });

    await handlerFor('post', EVALS_REVIEW_QUEUE_ITEM_URL)(
      context as never,
      httpServerMock.createKibanaRequest({
        params: { queueId: 'queue-1', itemId: 'queue-1:0' },
        body: { skip: true, label: 'pass' },
      }),
      kibanaResponseFactory
    );

    expect(reviewClient.submitVerdict).toHaveBeenCalledWith(
      'queue-1',
      'queue-1:0',
      { reviewer_profile_uid: 'profile-1' },
      'skipped'
    );
  });

  it('rejects a submit that carries neither a verdict nor a skip', async () => {
    const { handlerFor, reviewClient, context } = setup();

    const response = await handlerFor('post', EVALS_REVIEW_QUEUE_ITEM_URL)(
      context as never,
      httpServerMock.createKibanaRequest({
        params: { queueId: 'queue-1', itemId: 'queue-1:0' },
        body: { rationale: 'hm' },
      }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(reviewClient.submitVerdict).not.toHaveBeenCalled();
  });

  it('answers 409 when the item was already reviewed and 404 when it does not exist', async () => {
    const { handlerFor, reviewClient, context } = setup();
    const request = httpServerMock.createKibanaRequest({
      params: { queueId: 'queue-1', itemId: 'queue-1:0' },
      body: { label: 'pass' },
    });
    const handler = handlerFor('post', EVALS_REVIEW_QUEUE_ITEM_URL);

    reviewClient.submitVerdict.mockRejectedValueOnce(
      new ReviewItemAlreadyReviewedError('queue-1:0')
    );
    expect((await handler(context as never, request, kibanaResponseFactory)).status).toBe(409);

    reviewClient.submitVerdict.mockRejectedValueOnce(new ReviewItemNotFoundError('queue-1:0'));
    expect((await handler(context as never, request, kibanaResponseFactory)).status).toBe(404);
  });

  it('answers 404 for a queue that does not exist in the space', async () => {
    const { handlerFor, soClient, context } = setup();
    soClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('evals-review-queue', 'nope')
    );

    const response = await handlerFor('get', EVALS_REVIEW_QUEUE_URL)(
      context as never,
      httpServerMock.createKibanaRequest({ params: { queueId: 'nope' } }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('computes agreement over the reviewed items', async () => {
    const { handlerFor, reviewClient, context } = setup();
    reviewClient.listItems.mockResolvedValue([
      {
        ...storedItem,
        status: 'reviewed',
        human: { label: 'pass', reviewed_at: '2026-01-01T00:00:00.000Z' },
      },
    ]);

    const response = await handlerFor('get', EVALS_REVIEW_QUEUE_AGREEMENT_URL)(
      context as never,
      httpServerMock.createKibanaRequest({ params: { queueId: 'queue-1' } }),
      kibanaResponseFactory
    );

    expect(reviewClient.listItems).toHaveBeenCalledWith('queue-1', 'reviewed');
    expect(response.payload).toMatchObject({
      queue_id: 'queue-1',
      evaluator: { name: 'correctness', version: '1.0.0' },
      binary: { n: 1, rawAgreement: 1 },
    });
  });

  describe('evaluator agreement across a major version', () => {
    const reviewed = (queueId: string, label: string) => ({
      ...storedItem,
      queue_id: queueId,
      status: 'reviewed' as const,
      human: { label, reviewed_at: '2026-01-01T00:00:00.000Z' },
    });

    it('pools the queues of the same evaluator and major, and leaves other majors out', async () => {
      const { handlerFor, soClient, reviewClient, context } = setup();
      const queue = (id: string, name: string, version: string) => ({
        id,
        type: 'evals-review-queue',
        attributes: { ...queueAttributes, evaluator_name: name, evaluator_version: version },
      });
      soClient.find.mockResolvedValue({
        saved_objects: [
          queue('q-1', 'correctness', '2.0.0'),
          queue('q-2', 'correctness', '2.3.1'),
          queue('q-3', 'correctness', '1.9.0'),
          queue('q-4', 'tone', '2.0.0'),
        ],
      } as never);
      reviewClient.listItems.mockImplementation(async (queueId: string) => [
        reviewed(queueId, 'pass'),
      ]);

      const response = await handlerFor('get', EVALS_EVALUATOR_REVIEW_AGREEMENT_URL)(
        context as never,
        httpServerMock.createKibanaRequest({
          params: { name: 'correctness' },
          query: { version: '2.1.0' },
        }),
        kibanaResponseFactory
      );

      expect(reviewClient.listItems.mock.calls.map(([id]) => id)).toEqual(['q-1', 'q-2']);
      expect(response.payload).toMatchObject({
        evaluator_name: 'correctness',
        version_major: 2,
        queue_count: 2,
        binary: { n: 2 },
      });
    });

    it('reports no agreement when no queue matches', async () => {
      const { handlerFor, soClient, context } = setup();
      soClient.find.mockResolvedValue({ saved_objects: [] } as never);

      const response = await handlerFor('get', EVALS_EVALUATOR_REVIEW_AGREEMENT_URL)(
        context as never,
        httpServerMock.createKibanaRequest({
          params: { name: 'correctness' },
          query: { version: '3.0.0' },
        }),
        kibanaResponseFactory
      );

      expect(response.payload).toMatchObject({ queue_count: 0, binary: null });
    });
  });
});
