/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { ReviewQueueSampleStrategy, ReviewQueueSourceFilter } from '@kbn/evals-common';

export const EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE = 'evals-review-queue' as const;

export interface EvalsReviewQueueAttributes {
  name: string;
  source_filter: ReviewQueueSourceFilter;
  evaluator_name: string;
  /** The evaluator version the sampled scores carry; agreement is reported per version. */
  evaluator_version: string;
  sample_size: number;
  strategy: ReviewQueueSampleStrategy;
  rubric: string;
  created_by?: string;
  created_at: string;
}

export const evalsReviewQueueSavedObjectType: SavedObjectsType<EvalsReviewQueueAttributes> = {
  name: EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      evaluator_name: { type: 'keyword' },
      evaluator_version: { type: 'keyword' },
      strategy: { type: 'keyword' },
      created_at: { type: 'date' },
    },
  },
  management: {
    importableAndExportable: false,
  },
};
