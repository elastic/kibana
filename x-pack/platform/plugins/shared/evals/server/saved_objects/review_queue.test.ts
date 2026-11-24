/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConfigSchema } from '@kbn/config-schema';
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

  describe('model version 1', () => {
    const { modelVersions } = evalsReviewQueueSavedObjectType;
    const versions = typeof modelVersions === 'function' ? modelVersions() : modelVersions;
    const schemas = versions?.[1]?.schemas;
    const valid = {
      name: 'Queue',
      source_filter: { source: 'experiment', experiment_id: 'exp-1' },
      evaluator_name: 'Correctness',
      evaluator_version: '1.0.0',
      sample_size: 10,
      strategy: 'uniform',
      rubric: '',
      created_at: '2026-01-01T00:00:00.000Z',
    };

    it('is the only model version and carries no mapping changes', () => {
      expect(Object.keys(versions ?? {})).toEqual(['1']);
      expect(versions?.[1]?.changes).toEqual([]);
    });

    it('accepts a fully populated queue on create', () => {
      expect(() => schemas?.create?.validate(valid)).not.toThrow();
    });

    it('rejects an unknown strategy on create', () => {
      expect(() => schemas?.create?.validate({ ...valid, strategy: 'other' })).toThrow();
    });

    it('drops attributes written by a newer version on read', () => {
      const forwardCompatibility = schemas?.forwardCompatibility;
      if (!isConfigSchema(forwardCompatibility)) {
        throw new Error('expected a config schema for forward compatibility');
      }
      expect(forwardCompatibility.validate({ ...valid, added_later: 1 })).toEqual(valid);
    });
  });

  it('bounds every keyword field with ignore_above', () => {
    const { properties } = evalsReviewQueueSavedObjectType.mappings;
    const keywords = Object.values(properties).filter((field) => field.type === 'keyword');

    expect(keywords).toHaveLength(4);
    for (const field of keywords) {
      expect(field).toEqual(expect.objectContaining({ ignore_above: expect.any(Number) }));
    }
  });
});
