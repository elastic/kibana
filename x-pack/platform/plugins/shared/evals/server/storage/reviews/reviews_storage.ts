/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { EvaluationIndices } from '@kbn/evals-common';
import { types } from '@kbn/storage-adapter';

/**
 * Human review items. Kept apart from `.evaluation-scores` so a human label never rewrites a
 * judge score: the judge's verdict is copied in at sampling time and left alone afterwards.
 */
export const reviewsStorageSettings = {
  name: EvaluationIndices.REVIEWS,
  schema: {
    properties: {
      queue_id: types.keyword({}),
      space_ids: types.keyword({}),
      status: types.keyword({}),
      // The order the sampler drew the item in, so reviewers see a stable random order.
      position: types.long({}),
      source: types.object({
        dynamic: false,
        properties: {
          source: types.keyword({}),
          experiment_id: types.keyword({}),
          monitor_id: types.keyword({}),
          example_id: types.keyword({}),
          repetition_index: types.long({}),
          trace_id: types.keyword({}),
        },
      }),
      evaluator: types.object({
        dynamic: false,
        properties: {
          name: types.keyword({}),
          version: types.keyword({}),
        },
      }),
      score: types.object({
        dynamic: false,
        properties: {
          value: types.float({}),
          label: types.keyword({}),
        },
      }),
      human: types.object({
        dynamic: false,
        properties: {
          label: types.keyword({}),
          value: types.float({}),
          rationale: types.text({}),
          reviewer_profile_uid: types.keyword({}),
          reviewed_at: types.date({}),
        },
      }),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export type ReviewItemStatus = 'pending' | 'reviewed' | 'skipped';

export interface ReviewItemSourceRef {
  source: 'experiment' | 'online';
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
  reviewer_profile_uid?: string;
  reviewed_at: string;
}

export interface ReviewItemStorageProperties {
  queue_id: string;
  space_ids: string[];
  status: ReviewItemStatus;
  position: number;
  source: ReviewItemSourceRef;
  evaluator: { name: string; version: string };
  score: { value?: number; label?: string };
  human?: ReviewHumanVerdict;
  created_at: string;
  updated_at: string;
}
