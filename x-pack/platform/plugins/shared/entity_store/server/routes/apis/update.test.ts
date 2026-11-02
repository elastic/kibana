/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateBodySchema } from './update';

describe('UpdateBodySchema', () => {
  it('accepts log extraction on its own', () => {
    expect(UpdateBodySchema.safeParse({ logExtraction: { delay: '5m' } }).success).toBe(true);
  });

  it('accepts history snapshot interval and retention on their own', () => {
    expect(
      UpdateBodySchema.safeParse({ historySnapshot: { frequency: '12h', retentionDays: 90 } })
        .success
    ).toBe(true);
    expect(UpdateBodySchema.safeParse({ historySnapshot: { frequency: '1h' } }).success).toBe(true);
    expect(UpdateBodySchema.safeParse({ historySnapshot: { retentionDays: 1 } }).success).toBe(
      true
    );
  });

  it('accepts both config sections together', () => {
    expect(
      UpdateBodySchema.safeParse({
        logExtraction: { frequency: '2m' },
        historySnapshot: { retentionDays: 60 },
      }).success
    ).toBe(true);
  });

  it('rejects an empty body', () => {
    const result = UpdateBodySchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('required'))).toBe(true);
    }
  });

  it('rejects an empty history snapshot object', () => {
    expect(UpdateBodySchema.safeParse({ historySnapshot: {} }).success).toBe(false);
  });

  it('rejects a history snapshot interval shorter than 1 hour', () => {
    const result = UpdateBodySchema.safeParse({ historySnapshot: { frequency: '30m' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => typeof issue.message === 'string' && issue.message.includes('1 hour')
        )
      ).toBe(true);
    }
  });

  it('rejects retentionDays outside 1..3650', () => {
    expect(UpdateBodySchema.safeParse({ historySnapshot: { retentionDays: 0 } }).success).toBe(
      false
    );
    expect(UpdateBodySchema.safeParse({ historySnapshot: { retentionDays: 3651 } }).success).toBe(
      false
    );
    expect(UpdateBodySchema.safeParse({ historySnapshot: { retentionDays: 1.5 } }).success).toBe(
      false
    );
  });
});
