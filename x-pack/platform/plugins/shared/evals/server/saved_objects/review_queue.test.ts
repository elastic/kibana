/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
  evalsReviewQueueSavedObjectType,
} from './review_queue';

describe('evals-review-queue saved object type', () => {
  it('is registered under its public name', () => {
    expect(evalsReviewQueueSavedObjectType.name).toBe(EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE);
    expect(EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE).toBe('evals-review-queue');
  });

  it('is hidden, space-isolated and not exportable', () => {
    expect(evalsReviewQueueSavedObjectType.hidden).toBe(true);
    expect(evalsReviewQueueSavedObjectType.namespaceType).toBe('multiple-isolated');
    expect(evalsReviewQueueSavedObjectType.management?.importableAndExportable).toBe(false);
  });

  it('maps the fields a queue is looked up by and leaves the free text unindexed', () => {
    const { dynamic, properties } = evalsReviewQueueSavedObjectType.mappings;

    expect(dynamic).toBe(false);
    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining(['name', 'evaluator_name', 'evaluator_version', 'strategy'])
    );
    expect(properties).not.toHaveProperty('rubric');
  });
});
