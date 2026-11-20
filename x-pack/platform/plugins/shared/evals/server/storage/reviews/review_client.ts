/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { InternalIStorageClient, StorageIndexAdapter } from '@kbn/storage-adapter';
import { buildSpaceFilter } from '@kbn/evals-common';
import { isResponseError } from '@kbn/es-errors';
import { ReviewItemAlreadyReviewedError } from './review_item_already_reviewed_error';
import { ReviewItemNotFoundError } from './review_item_not_found_error';
import type {
  ReviewHumanVerdict,
  ReviewItemStatus,
  ReviewItemStorageProperties,
  reviewsStorageSettings,
} from './reviews_storage';

type ReviewItemStorageDocument = ReviewItemStorageProperties & { _id?: string };

export type ReviewsStorageAdapter = StorageIndexAdapter<
  typeof reviewsStorageSettings,
  ReviewItemStorageDocument
>;

export interface ReviewItem extends ReviewItemStorageProperties {
  id: string;
}

export type NewReviewItem = Omit<
  ReviewItemStorageProperties,
  'space_ids' | 'status' | 'created_at' | 'updated_at' | 'human'
>;

/** The most items one queue can hold, which also bounds every read of it. */
export const MAX_REVIEW_ITEMS_PER_QUEUE = 1000;

export const getReviewItemId = (queueId: string, position: number): string =>
  `${queueId}:${position}`;

/**
 * Reads and writes review items in one space. A label is written to the item's own `human`
 * field; the judge score copied in at sampling time is never touched.
 */
export class ReviewClient {
  private readonly storage: InternalIStorageClient<ReviewItemStorageDocument>;
  private readonly logger: Logger;
  private readonly spaceId: string;
  private readonly spaceFilter: QueryDslQueryContainer;

  constructor({
    storageAdapter,
    logger,
    spaceId,
  }: {
    storageAdapter: ReviewsStorageAdapter;
    logger: Logger;
    spaceId: string;
  }) {
    this.storage = storageAdapter.getClient();
    this.logger = logger;
    this.spaceId = spaceId;
    this.spaceFilter = buildSpaceFilter(spaceId);
  }

  private scoped(...filters: QueryDslQueryContainer[]): QueryDslQueryContainer {
    return { bool: { filter: [this.spaceFilter, ...filters] } };
  }

  /**
   * Writes a queue's sampled items as pending. Ids derive from queue and position and the write
   * is a `create`, so a retry skips items that already exist instead of overwriting a verdict.
   */
  async createPendingItems(queueId: string, items: NewReviewItem[]): Promise<number> {
    if (items.length === 0) {
      return 0;
    }
    if (items.length > MAX_REVIEW_ITEMS_PER_QUEUE) {
      throw new Error(`A review queue holds at most ${MAX_REVIEW_ITEMS_PER_QUEUE} items`);
    }

    const timestamp = new Date().toISOString();
    const response = await this.storage.bulk({
      operations: items.map((item) => ({
        create: {
          _id: getReviewItemId(queueId, item.position),
          document: {
            ...item,
            queue_id: queueId,
            space_ids: [this.spaceId],
            status: 'pending' as const,
            created_at: timestamp,
            updated_at: timestamp,
          },
        },
      })),
      refresh: true,
    });

    if (response.errors) {
      // 409 means the item already exists, which is what a retry is expected to hit.
      const [failure] = response.items
        .map((item) => item.create)
        .filter((result) => result?.error && result.status !== 409)
        .map((result) => result!.error!);
      if (failure) {
        this.logger.error(`Failed to write review items: ${failure.reason ?? 'unknown'}`);
        throw new Error(`Failed to write review items: ${failure.reason ?? 'unknown bulk error'}`);
      }
    }

    return response.items.length;
  }

  async getItem(queueId: string, itemId: string): Promise<ReviewItem | undefined> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: 1,
      query: this.scoped({ term: { queue_id: queueId } }, { term: { _id: itemId } }),
    });

    const [hit] = response.hits.hits;
    return hit?._source && hit._id ? { id: hit._id, ...hit._source } : undefined;
  }

  /** The pending item with the lowest position, or `undefined` once the queue is drained. */
  async getNextPending(queueId: string): Promise<ReviewItem | undefined> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: 1,
      query: this.scoped({ term: { queue_id: queueId } }, { term: { status: 'pending' } }),
      sort: [{ position: { order: 'asc' } }],
    });

    const [hit] = response.hits.hits;
    return hit?._source && hit._id ? { id: hit._id, ...hit._source } : undefined;
  }

  async listItems(queueId: string, status?: ReviewItemStatus): Promise<ReviewItem[]> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: MAX_REVIEW_ITEMS_PER_QUEUE,
      query: this.scoped(
        { term: { queue_id: queueId } },
        ...(status ? [{ term: { status } }] : [])
      ),
      sort: [{ position: { order: 'asc' } }],
    });

    return response.hits.hits.flatMap((hit) =>
      hit._source && hit._id ? [{ id: hit._id, ...hit._source }] : []
    );
  }

  async countByStatus(queueId: string): Promise<Record<ReviewItemStatus, number>> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: 0,
      query: this.scoped({ term: { queue_id: queueId } }),
      aggs: { by_status: { terms: { field: 'status', size: 3 } } },
    });

    const counts: Record<ReviewItemStatus, number> = { pending: 0, reviewed: 0, skipped: 0 };
    const buckets =
      (response.aggregations?.by_status as { buckets?: Array<{ key: string; doc_count: number }> })
        ?.buckets ?? [];
    for (const bucket of buckets) {
      if (bucket.key in counts) {
        counts[bucket.key as ReviewItemStatus] = bucket.doc_count;
      }
    }
    return counts;
  }

  /**
   * Records the reviewer's verdict on a pending item. A reviewed item is final in v1, so a
   * second submit is refused rather than silently replacing the first label.
   */
  async submitVerdict(
    queueId: string,
    itemId: string,
    verdict: Omit<ReviewHumanVerdict, 'reviewed_at'>,
    status: Extract<ReviewItemStatus, 'reviewed' | 'skipped'> = 'reviewed'
  ): Promise<ReviewItem> {
    const response = await this.storage.search({
      track_total_hits: false,
      size: 1,
      seq_no_primary_term: true,
      query: this.scoped({ term: { queue_id: queueId } }, { term: { _id: itemId } }),
    });
    const [hit] = response.hits.hits;
    if (!hit?._source || !hit._id) {
      throw new ReviewItemNotFoundError(itemId);
    }
    if (hit._source.status !== 'pending') {
      throw new ReviewItemAlreadyReviewedError(itemId);
    }
    if (hit._seq_no == null || hit._primary_term == null) {
      throw new Error(`Review item "${itemId}" was read without _seq_no/_primary_term`);
    }
    const current: ReviewItem = { id: hit._id, ...hit._source };

    const timestamp = new Date().toISOString();
    const { id, ...rest } = current;
    const document: ReviewItemStorageProperties = {
      ...rest,
      status,
      human: { ...verdict, reviewed_at: timestamp },
      updated_at: timestamp,
    };

    try {
      // Conditional on the version just read, so a concurrent submit loses instead of overwriting.
      await this.storage.index({
        id,
        document,
        refresh: true,
        if_seq_no: hit._seq_no,
        if_primary_term: hit._primary_term,
      });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 409) {
        throw new ReviewItemAlreadyReviewedError(itemId);
      }
      throw error;
    }
    return { id, ...document };
  }
}
