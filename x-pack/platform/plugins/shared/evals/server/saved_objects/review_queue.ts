/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  MAX_EVALUATOR_NAME_LENGTH,
  MAX_EVALUATOR_VERSION_LENGTH,
  MAX_REVIEW_QUEUE_SAMPLE_SIZE,
  MAX_REVIEW_RUBRIC_LENGTH,
  type ReviewQueueSampleStrategy,
  type ReviewQueueSourceFilter,
} from '@kbn/evals-common';
import { MAX_ID_LENGTH, MAX_NAME_LENGTH } from '../../common';

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

const KEYWORD_IGNORE_ABOVE = 1024;
const MAX_AUDIT_STRING_LENGTH = 1024;
const MAX_TIMESTAMP_LENGTH = 64;

const evalsReviewQueueAttributesSchemaV1 = schema.object({
  name: schema.string({ maxLength: MAX_NAME_LENGTH }),
  source_filter: schema.object({
    source: schema.oneOf([schema.literal('experiment'), schema.literal('online')]),
    experiment_id: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
    monitor_id: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
  }),
  evaluator_name: schema.string({ maxLength: MAX_EVALUATOR_NAME_LENGTH }),
  evaluator_version: schema.string({ maxLength: MAX_EVALUATOR_VERSION_LENGTH }),
  sample_size: schema.number({ min: 1, max: MAX_REVIEW_QUEUE_SAMPLE_SIZE }),
  strategy: schema.oneOf([schema.literal('uniform'), schema.literal('stratified_by_label')]),
  rubric: schema.string({ maxLength: MAX_REVIEW_RUBRIC_LENGTH }),
  created_by: schema.maybe(schema.string({ maxLength: MAX_AUDIT_STRING_LENGTH })),
  created_at: schema.string({ maxLength: MAX_TIMESTAMP_LENGTH }),
});

export const evalsReviewQueueSavedObjectType: SavedObjectsType<EvalsReviewQueueAttributes> = {
  name: EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword', ignore_above: KEYWORD_IGNORE_ABOVE },
      evaluator_name: { type: 'keyword', ignore_above: KEYWORD_IGNORE_ABOVE },
      evaluator_version: { type: 'keyword', ignore_above: KEYWORD_IGNORE_ABOVE },
      strategy: { type: 'keyword', ignore_above: KEYWORD_IGNORE_ABOVE },
      created_at: { type: 'date' },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: evalsReviewQueueAttributesSchemaV1,
        forwardCompatibility: evalsReviewQueueAttributesSchemaV1.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
  },
};
