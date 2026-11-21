/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type DiagnosticResult } from '@elastic/elasticsearch';
import type {
  BulkResponse,
  QueryDslQueryContainer,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
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

type Query = QueryDslQueryContainer;
type MockSearchRequest = Pick<SearchRequest, 'query' | 'size' | 'aggs'>;
interface MockBulkOperation {
  create: { _id: string; document: ReviewItemStorageProperties };
}

const conflictMeta: DiagnosticResult = {
  statusCode: 409,
  body: {},
  headers: {},
  warnings: [],
  meta: {
    context: null,
    name: 'review-client-test',
    request: { params: { method: 'PUT', path: '/reviews' }, options: {}, id: 1 },
    connection: null,
    attempts: 0,
    aborted: false,
  },
};

const toArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const matches = (
  id: string,
  source: ReviewItemStorageProperties,
  query: Query | undefined
): boolean => {
  const fields: Record<string, unknown> = { ...source };
  if (query?.term) {
    const [[field, value]] = Object.entries(query.term);
    return field === '_id' ? id === value : fields[field] === value;
  }
  if (query?.terms) {
    const [[field, values]] = Object.entries(query.terms);
    const actual = fields[field];
    return (
      Array.isArray(actual) &&
      Array.isArray(values) &&
      actual.some((entry) => values.some((candidate) => candidate === entry))
    );
  }
  if (query?.exists) {
    return fields[query.exists.field] !== undefined;
  }
  if (query?.bool) {
    const filter = toArray(query.bool.filter);
    const should = toArray(query.bool.should);
    const mustNot = toArray(query.bool.must_not);
    return (
      filter.every((clause) => matches(id, source, clause)) &&
      !mustNot.some((clause) => matches(id, source, clause)) &&
      (should.length === 0 || should.some((clause) => matches(id, source, clause)))
    );
  }
  throw new Error(`Unsupported mock query: ${JSON.stringify(query)}`);
};

const createMockAdapter = () => {
  const rows = new Map<string, ReviewItemStorageProperties>();
  const versions = new Map<string, number>();

  const storage = {
    search: jest.fn(async (request: MockSearchRequest) => {
      const hits = [...rows.entries()]
        .filter(([id, source]) => matches(id, source, request.query))
        .sort(([, a], [, b]) => a.position - b.position)
        .slice(0, request.size ?? 10)
        .map(([_id, _source]) => ({
          _id,
          _source,
          _seq_no: versions.get(_id) ?? 1,
          _primary_term: 1,
        }));

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
    bulk: jest.fn(
      async ({ operations }: { operations: MockBulkOperation[] }): Promise<BulkResponse> => {
        const items = operations.map((operation): BulkResponse['items'][number] => {
          const id = operation.create._id;
          if (rows.has(id)) {
            return {
              create: {
                _index: 'reviews',
                status: 409,
                error: { type: 'version_conflict_engine_exception', reason: 'version conflict' },
              },
            };
          }
          rows.set(id, operation.create.document);
          versions.set(id, 1);
          return { create: { _index: 'reviews', status: 201, result: 'created' } };
        });
        return { took: 1, errors: items.some((entry) => entry.create?.status === 409), items };
      }
    ),
    index: jest.fn(
      async ({
        id,
        document,
        if_seq_no: ifSeqNo,
      }: {
        id: string;
        document: ReviewItemStorageProperties;
        if_seq_no?: number;
      }) => {
        if (ifSeqNo != null && ifSeqNo !== versions.get(id)) {
          throw new errors.ResponseError(conflictMeta);
        }
        rows.set(id, document);
        versions.set(id, (versions.get(id) ?? 0) + 1);
        return { result: 'updated' };
      }
    ),
  };

  return {
    rows,
    versions,
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

  it('does not overwrite a reviewed item when the queue is written again', async () => {
    const { client, rows } = setup();
    await client.createPendingItems('q1', [item(0)]);
    await client.submitVerdict('q1', getReviewItemId('q1', 0), { label: 'fail' });

    await client.createPendingItems('q1', [item(0)]);

    expect(rows.get(getReviewItemId('q1', 0))?.status).toBe('reviewed');
  });

  it('refuses a verdict that lost a race with a concurrent submit', async () => {
    const { client, versions, storage } = setup();
    await client.createPendingItems('q1', [item(0)]);
    const id = getReviewItemId('q1', 0);
    const realSearch = storage.search.getMockImplementation()!;
    // Another reviewer's write lands between this reviewer's read and write.
    storage.search.mockImplementationOnce(async (request: MockSearchRequest) => {
      const response = await realSearch(request);
      versions.set(id, (versions.get(id) ?? 0) + 1);
      return response;
    });

    await expect(client.submitVerdict('q1', id, { label: 'pass' })).rejects.toBeInstanceOf(
      ReviewItemAlreadyReviewedError
    );
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
      took: 1,
      items: [
        { create: { _index: 'reviews', status: 500, error: { type: 'boom', reason: 'boom' } } },
      ],
    });

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
