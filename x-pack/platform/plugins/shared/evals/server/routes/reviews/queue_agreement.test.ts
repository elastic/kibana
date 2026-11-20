/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReviewItem } from '../../storage/reviews/review_client';
import { computeQueueAgreement } from './queue_agreement';

const context = {
  queue_id: 'queue-1',
  evaluator: { name: 'correctness', version: '1.0.0' },
  counts: { pending: 0, reviewed: 4, skipped: 0 },
};

const item = (
  judge: { label?: string; value?: number },
  human?: { label?: string; value?: number },
  status: ReviewItem['status'] = 'reviewed'
): ReviewItem =>
  ({
    id: 'queue-1:0',
    queue_id: 'queue-1',
    position: 0,
    status,
    source: { source: 'online', trace_id: 't' },
    evaluator: context.evaluator,
    score: judge,
    ...(human ? { human: { ...human, reviewed_at: '2026-01-01T00:00:00.000Z' } } : {}),
  } as ReviewItem);

describe('computeQueueAgreement', () => {
  it('reports kappa 1 and full agreement when the human matches the judge', () => {
    const result = computeQueueAgreement(
      [
        item({ label: 'pass' }, { label: 'pass' }),
        item({ label: 'fail' }, { label: 'fail' }),
        item({ label: 'pass' }, { label: 'pass' }),
        item({ label: 'fail' }, { label: 'fail' }),
      ],
      context
    );

    expect(result.binary?.n).toBe(4);
    expect(result.binary?.rawAgreement).toBe(1);
    expect(result.binary?.kappa).toBe(1);
    expect(result.ordinal).toBeNull();
  });

  it('counts a judge pass the human failed as a false positive', () => {
    const result = computeQueueAgreement(
      [
        item({ label: 'pass' }, { label: 'fail' }),
        item({ label: 'pass' }, { label: 'pass' }),
        item({ label: 'fail' }, { label: 'fail' }),
      ],
      context
    );

    expect(result.binary?.confusion).toEqual({ tp: 1, fp: 1, fn: 0, tn: 1 });
  });

  it('ignores pending and skipped items', () => {
    const result = computeQueueAgreement(
      [
        item({ label: 'pass' }, { label: 'pass' }),
        item({ label: 'pass' }, undefined, 'pending'),
        item({ label: 'fail' }, undefined, 'skipped'),
      ],
      context
    );

    expect(result.binary?.n).toBe(1);
  });

  it('returns no agreement when nothing has been reviewed', () => {
    const result = computeQueueAgreement([item({ label: 'pass' }, undefined, 'pending')], context);

    expect(result.binary).toBeNull();
    expect(result.ordinal).toBeNull();
  });

  it('computes an ordinal agreement from numeric scores on both sides', () => {
    const result = computeQueueAgreement(
      [
        item({ value: 1 }, { value: 1 }),
        item({ value: 3 }, { value: 3 }),
        item({ value: 5 }, { value: 5 }),
      ],
      context
    );

    expect(result.binary).toBeNull();
    expect(result.ordinal).toEqual({ n: 3, weightedKappa: 1 });
  });
});
