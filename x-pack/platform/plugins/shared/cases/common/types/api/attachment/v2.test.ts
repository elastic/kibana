/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnifiedAttachmentsFindQueryParamsSchema } from './v2';

describe('UnifiedAttachmentsFindQueryParamsSchema', () => {
  it('accepts an omitted type (every attachment type)', () => {
    expect(UnifiedAttachmentsFindQueryParamsSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a single type string', () => {
    expect(UnifiedAttachmentsFindQueryParamsSchema.safeParse({ type: 'comment' }).success).toBe(
      true
    );
  });

  it('accepts a non-empty type array', () => {
    expect(
      UnifiedAttachmentsFindQueryParamsSchema.safeParse({ type: ['comment', 'security.alert'] })
        .success
    ).toBe(true);
  });

  it('rejects an empty type array', () => {
    expect(UnifiedAttachmentsFindQueryParamsSchema.safeParse({ type: [] }).success).toBe(false);
  });
});
