/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnifiedAttachmentsFindQueryParamsRt } from './v2';

describe('UnifiedAttachmentsFindQueryParamsRt', () => {
  it('accepts an omitted type (every attachment type)', () => {
    expect(UnifiedAttachmentsFindQueryParamsRt.decode({})._tag).toBe('Right');
  });

  it('accepts a single type string', () => {
    expect(UnifiedAttachmentsFindQueryParamsRt.decode({ type: 'comment' })._tag).toBe('Right');
  });

  it('accepts a non-empty type array', () => {
    expect(
      UnifiedAttachmentsFindQueryParamsRt.decode({ type: ['comment', 'security.alert'] })._tag
    ).toBe('Right');
  });

  it('rejects an empty type array', () => {
    expect(UnifiedAttachmentsFindQueryParamsRt.decode({ type: [] })._tag).toBe('Left');
  });
});
