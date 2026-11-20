/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ReviewItemAlreadyReviewedError } from './review_item_already_reviewed_error';
import { ReviewItemNotFoundError } from './review_item_not_found_error';
import {
  MAX_REVIEW_ITEMS_PER_QUEUE,
  ReviewClient,
  getReviewItemId,
  type NewReviewItem,
  type ReviewsStorageAdapter,
} from './review_client';
import type { ReviewItemStorageProperties } from './reviews_storage';

type Query = Record<string, any>;

const matches = (id: string, source: ReviewItemStorageProperties, query: Query): boolean => {
  if (query.term) {
    const [[field, value]] = Object.entries(query.term) as Array<[string, string]>;
    return field === '_id'
      ? id === value
      : (source as unknown as Record<string, unknown>)[field] === value;
  }
  if (query.terms) {
    const [[field, values]] = Object.entries(query.terms) as Array<[string, string[]]>;
    const actual = (source as unknown as Record<string, unknown>)[field];
    return Array.isArray(actual) && actual.some((entry) => values.includes(entry as string));
  }
  if (query.exists) {
    return (source as unknown as Record<string, unknown>)[query.exists.field] !== undefined;
  }
  if (query.bool) {
    const { filter = [], should = [], must_not: mustNot } = query.bool;
    const mustNotClauses = (Array.isArray(mustNot) ? mustNot : mustNot ? [mustNot] : []) as Query[];
    return (
      (filter as Query[]).every((clause) => matches(id, source, clause)) &&
      !mustNotClauses.some((clause) => matches(id, source, clause)) &&
      (should.length === 0 || (should as Query[]).some((clause) => matches(id, source, clause)))
    );
  }
  throw new Error(`Unsupported mock query: ${JSON.stringify(query)}`);
};

const createMockAdapter = () => {
  const rows = new Map<string, ReviewItemStorageProperties>();

  const storage = {
    search: jest.fn(async (request: Record<string, any>) => {
      const hits = [...rows.entries()]
        .filter(([id, source]) => matches(id, source, request.query))
        .sort(([, a], [, b]) => a.position - b.position)
        .slice(0, request.size)
        .map(([_id, _source]) => ({ _id, _source }));

      const counts = new Map<string, number>();
      if (request.aggs?.by_status) {
        for (const [id, source] of rows) {
          if (matches(id, source, request.query)) {
            counts.set(source.status, (counts.get(source.status) ?? 0) + 1);
          }
        }
      }

      return {
        hits: { hits },
        aggregations: {
          by_status: {
            buckets: [...counts.entries()].map(([key, doc_count]) => ({ key, doc_count })),
          },
        },
      };
    }),
    bulk: jest.fn(async ({ operations }: { operations: Array<Record<string, any>> }) => {
      for (const operation of operations) {
        rows.set(operation.index._id, operation.index.document);
      }
      return { errors: false, items: operations.map(() => ({ index: { result: 'created' } })) };
    }),
    index: jest.fn(async ({ id, document }: { id: string; document: any }) => {
      rows.set(id, document);
      return { result: 'updated' };
    }),
  };

  return {
    rows,
    storage,
    adapter: { getClient: () => storage } as unknown as ReviewsStorageAdapter,
  };
};

const item = (position: number, overrides: Partial<NewReviewItem> = {}): NewReviewItem => ({
  queue_id: 'ignored',
  position,
  source: {
    source: 'experiment',
    experiment_id: 'exp-1',
    example_id: `ex-${position}`,
    repetition_index: 0,
    trace_id: `trace-${position}`,
  },
  evaluator: { name: 'tone', version: '1.0.0' },
  score: { value: 1, label: 'pass' },
  ...overrides,
});

describe('ReviewClient', () => {
  const setup = (spaceId = 'default') => {
    const mock = createMockAdapter();
    const client = new ReviewClient({
      storageAdapter: mock.adapter,
      logger: loggingSystemMock.createLogger(),
      spaceId,
    });
    return { ...mock, client };
  };

  it('writes sampled items as pending with the queue id, space and a deterministic id', async () => {
    const { client, rows } = setup('team-a');

    await expect(client.createPendingItems('q1', [item(0), item(1)])).resolves.toBe(2);

    const stored = rows.get(getReviewItemId('q1', 1));
    expect(stored).toMatchObject({
      queue_id: 'q1',
      space_ids: ['team-a'],
      status: 'pending',
      position: 1,
      score: { value: 1, label: 'pass' },
    });
    expect(stored?.human).toBeUndefined();
  });

  it('is idempotent when the same queue is written twice', async () => {
    const { client, rows } = setup();

    await client.createPendingItems('q1', [item(0)]);
    await client.createPendingItems('q1', [item(0)]);

    expect(rows.size).toBe(1);
  });

  it('refuses more items than a queue can hold', async () => {
    const { client } = setup();
    const tooMany = Array.from({ length: MAX_REVIEW_ITEMS_PER_QUEUE + 1 }, (_, i) => item(i));

    await expect(client.createPendingItems('q1', tooMany)).rejects.toThrow(/at most/);
  });

  it('throws when the bulk write reports an error', async () => {
    const { client, storage } = setup();
    storage.bulk.mockResolvedValueOnce({
      errors: true,
      items: [{ index: { error: { reason: 'boom' } } }],
    } as any);

    await expect(client.createPendingItems('q1', [item(0)])).rejects.toThrow('boom');
  });

  it('returns the lowest-position pending item and skips reviewed ones', async () => {
    const { client } = setup();
    await client.createPendingItems('q1', [item(2), item(0), item(1)]);
    await client.submitVerdict('q1', getReviewItemId('q1', 0), { label: 'pass' });

    const next = await client.getNextPending('q1');

    expect(next?.position).toBe(1);
  });

  it('returns undefined once the queue is drained', async () => {
    const { client } = setup();
    await client.createPendingItems('q1', [item(0)]);
    await client.submitVerdict('q1', getReviewItemId('q1', 0), { label: 'fail' });

    await expect(client.getNextPending('q1')).resolves.toBeUndefined();
  });

  it('does not return items from another queue or another space', async () => {
    const { client, rows } = setup('default');
    await client.createPendingItems('q1', [item(0)]);
    rows.set('q2:0', { ...rows.get(getReviewItemId('q1', 0))!, queue_id: 'q2' });
    rows.set('q3:0', {
      ...rows.get(getReviewItemId('q1', 0))!,
      queue_id: 'q1',
      space_ids: ['other'],
      position: 5,
    });

    const items = await client.listItems('q1');

    expect(items.map((i) => i.id)).toEqual([getReviewItemId('q1', 0)]);
  });

  it('stores the human verdict without touching the judge score', async () => {
    const { client } = setup();
    await client.createPendingItems('q1', [item(0, { score: { value: 0.4, label: 'fail' } })]);

    const reviewed = await client.submitVerdict('q1', getReviewItemId('q1', 0), {
      label: 'pass',
      value: 1,
      rationale: 'Answer is correct',
      reviewer_profile_uid: 'u_1',
    });

    expect(reviewed.status).toBe('reviewed');
    expect(reviewed.score).toEqual({ value: 0.4, label: 'fail' });
    expect(reviewed.human).toMatchObject({
      label: 'pass',
      value: 1,
      rationale: 'Answer is correct',
      reviewer_profile_uid: 'u_1',
    });
    expect(typeof reviewed.human?.reviewed_at).toBe('string');
  });

  it('refuses a second verdict on the same item', async () => {
    const { client } = setup();
    await client.createPendingItems('q1', [item(0)]);
    await client.submitVerdict('q1', getReviewItemId('q1', 0), { label: 'pass' });

    await expect(
      client.submitVerdict('q1', getReviewItemId('q1', 0), { label: 'fail' })
    ).rejects.toBeInstanceOf(ReviewItemAlreadyReviewedError);
  });

  it('refuses a verdict on an unknown item', async () => {
    const { client } = setup();

    await expect(client.submitVerdict('q1', 'q1:9', { label: 'pass' })).rejects.toBeInstanceOf(
      ReviewItemNotFoundError
    );
  });

  it('marks an item skipped when asked', async () => {
    const { client } = setup();
    await client.createPendingItems('q1', [item(0)]);

    const skipped = await client.submitVerdict('q1', getReviewItemId('q1', 0), {}, 'skipped');

    expect(skipped.status).toBe('skipped');
  });

  it('counts items by status', async () => {
    const { client } = setup();
    await client.createPendingItems('q1', [item(0), item(1), item(2)]);
    await client.submitVerdict('q1', getReviewItemId('q1', 0), { label: 'pass' });
    await client.submitVerdict('q1', getReviewItemId('q1', 1), {}, 'skipped');

    await expect(client.countByStatus('q1')).resolves.toEqual({
      pending: 1,
      reviewed: 1,
      skipped: 1,
    });
  });
});
