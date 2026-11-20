/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BinaryAgreement } from '../agreement';

export type ReviewQueueSampleStrategy = 'uniform' | 'stratified_by_label';
export type ReviewQueueSourceKind = 'experiment' | 'online';
export type ReviewItemStatus = 'pending' | 'reviewed' | 'skipped';

export interface ReviewQueueSourceFilter {
  source: ReviewQueueSourceKind;
  experiment_id?: string;
  monitor_id?: string;
}

export interface ReviewQueue {
  id: string;
  name: string;
  source_filter: ReviewQueueSourceFilter;
  evaluator_name: string;
  evaluator_version: string;
  sample_size: number;
  strategy: ReviewQueueSampleStrategy;
  rubric: string;
  created_by?: string;
  created_at: string;
}

export type ReviewQueueCounts = Record<ReviewItemStatus, number>;

export interface ReviewQueueWithCounts extends ReviewQueue {
  counts: ReviewQueueCounts;
}

export interface ReviewItemSourceRef {
  source: ReviewQueueSourceKind;
  experiment_id?: string;
  monitor_id?: string;
  example_id?: string;
  repetition_index?: number;
  trace_id: string;
}

export interface ReviewHumanVerdict {
  label?: string;
  value?: number;
  rationale?: string;
  reviewed_at: string;
}

/** An item as a reviewer sees it: the judge's verdict is withheld until the reviewer submits. */
export interface BlindReviewItem {
  id: string;
  queue_id: string;
  status: ReviewItemStatus;
  position: number;
  source: ReviewItemSourceRef;
  evaluator: { name: string; version: string };
}

/** An item after submit, with the judge's verdict revealed beside the human's. */
export interface RevealedReviewItem extends BlindReviewItem {
  score: { value?: number; label?: string };
  human?: ReviewHumanVerdict;
}

export interface OrdinalAgreement {
  n: number;
  weightedKappa: number | null;
}

export interface ReviewQueueAgreement {
  queue_id: string;
  evaluator: { name: string; version: string };
  counts: ReviewQueueCounts;
  /** Pass/fail pairs, when the judge and the human both gave a pass/fail label. */
  binary: BinaryAgreement | null;
  /** Numeric pairs, when the judge and the human both gave a score. */
  ordinal: OrdinalAgreement | null;
}

/**
 * Agreement pooled across the review queues of one evaluator that share a major version.
 * A major bump changes what the judge measures, so earlier labels stop counting toward it.
 */
export interface EvaluatorReviewAgreement {
  evaluator_name: string;
  /** The major version the pooled queues share, or null when the version has no leading integer. */
  version_major: number | null;
  queue_count: number;
  binary: BinaryAgreement | null;
  ordinal: OrdinalAgreement | null;
}

export interface ListReviewQueuesResponse {
  queues: ReviewQueueWithCounts[];
}

export type GetReviewQueueResponse = ReviewQueueWithCounts;

export interface GetNextReviewItemResponse {
  item: BlindReviewItem | null;
}

export interface SubmitReviewItemResponse {
  item: RevealedReviewItem;
}
