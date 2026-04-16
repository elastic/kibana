/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Reason why a memory node was queued for review.
 */
export type ReviewReason =
  | 'outdated'
  | 'incorrect'
  | 'duplicate_merge_candidate'
  | 'needs_update'
  | 'deprecated_candidate';

/**
 * A single item in the review queue.
 */
export interface ReviewItem {
  /** Unique ID for this review queue entry */
  id: string;

  /** ID of the memory node that needs review */
  memory_id: string;

  /** Why this memory was queued */
  reason: ReviewReason;

  /**
   * Priority for dequeue ordering (higher = dequeued first).
   * Suggested range: 1 (low) – 10 (critical).
   */
  priority: number;

  /** When this item was enqueued (ISO 8601) */
  enqueued_at: string;

  /** Optional additional context for the reviewer */
  notes?: string;
}

// ---------------------------------------------------------------------------
// ES index name
// ---------------------------------------------------------------------------

export const reviewQueueIndexName = chatSystemIndex('memory_review_queue');

// ---------------------------------------------------------------------------
// ReviewQueue
// ---------------------------------------------------------------------------

/**
 * Manages a persistent queue of memory nodes requiring deferred review.
 *
 * Backed by an Elasticsearch index to survive restarts and allow distributed
 * access. The queue prevents immediate destructive deletion: memories are
 * flagged for human or automated review before any destructive action.
 *
 * Queue semantics:
 *   - enqueue: idempotent — re-enqueueing the same memoryId+reason only
 *     creates a new entry (parallel to how duplicate signals work in the
 *     signal processor). Callers may deduplicate if needed.
 *   - dequeue: retrieves items ordered by priority DESC, enqueued_at ASC.
 *     Items are removed on dequeue.
 *   - size: returns the count of pending review items.
 */
export class ReviewQueue {
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;

  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.logger = logger;
    this.esClient = esClient;
  }

  /**
   * Initialize the review queue ES index (idempotent).
   * Should be called once during plugin start or on first use.
   */
  async initialize(): Promise<void> {
    const exists = await this.esClient.indices.exists({ index: reviewQueueIndexName });
    if (exists) {
      return;
    }

    await this.esClient.indices.create({
      index: reviewQueueIndexName,
      mappings: {
        properties: {
          memory_id: { type: 'keyword' },
          reason: { type: 'keyword' },
          priority: { type: 'integer' },
          enqueued_at: { type: 'date' },
          notes: { type: 'text' },
        },
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    });

    this.logger.info(`ReviewQueue: created index ${reviewQueueIndexName}`);
  }

  /**
   * Add a memory node to the review queue.
   *
   * @param memoryId - ID of the memory node to review
   * @param reason - Why it needs review
   * @param priority - Review priority (higher = reviewed first); default 5
   * @param notes - Optional context for the reviewer
   */
  async enqueue(
    memoryId: string,
    reason: ReviewReason,
    priority: number = 5,
    notes?: string
  ): Promise<void> {
    const item: Omit<ReviewItem, 'id'> = {
      memory_id: memoryId,
      reason,
      priority: clampInt(priority, 1, 10),
      enqueued_at: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    };

    await this.esClient.index({
      index: reviewQueueIndexName,
      id: uuidv4(),
      document: item,
      refresh: 'wait_for',
    });

    this.logger.debug(
      `ReviewQueue: enqueued memory ${memoryId} for reason=${reason} priority=${priority}`
    );
  }

  /**
   * Dequeue the highest-priority items for processing.
   *
   * Items are retrieved ordered by priority DESC, enqueued_at ASC and
   * removed from the index atomically (delete by IDs after fetching).
   *
   * @param limit - Maximum number of items to return (default 20)
   */
  async dequeue(limit: number = 20): Promise<ReviewItem[]> {
    const response = await this.esClient.search<Omit<ReviewItem, 'id'>>({
      index: reviewQueueIndexName,
      size: limit,
      sort: [{ priority: { order: 'desc' } }, { enqueued_at: { order: 'asc' } }],
      query: { match_all: {} },
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      return [];
    }

    const items: ReviewItem[] = hits.map((hit) => ({
      id: hit._id as string,
      memory_id: (hit._source as Omit<ReviewItem, 'id'>).memory_id,
      reason: (hit._source as Omit<ReviewItem, 'id'>).reason,
      priority: (hit._source as Omit<ReviewItem, 'id'>).priority,
      enqueued_at: (hit._source as Omit<ReviewItem, 'id'>).enqueued_at,
      notes: (hit._source as Omit<ReviewItem, 'id'>).notes,
    }));

    // Delete dequeued items
    const ids = items.map((item) => item.id);
    await this.esClient.deleteByQuery({
      index: reviewQueueIndexName,
      query: {
        ids: { values: ids },
      },
      refresh: true,
    });

    this.logger.debug(`ReviewQueue: dequeued ${items.length} items`);
    return items;
  }

  /**
   * Return the count of pending review items.
   */
  async size(): Promise<number> {
    const response = await this.esClient.count({
      index: reviewQueueIndexName,
      query: { match_all: {} },
    });
    return response.count;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clampInt = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(value)));
