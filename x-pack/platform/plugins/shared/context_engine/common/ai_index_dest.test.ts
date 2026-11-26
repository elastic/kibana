/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIndexPattern } from './ai_index_dest';

describe('isIndexPattern', () => {
  it('returns false for a concrete index or data stream name', () => {
    expect(isIndexPattern('ai-index-idx-sample-ki')).toBe(false);
    expect(isIndexPattern('ai-index-ds-customer_support')).toBe(false);
  });

  it('returns true when the dest value contains a wildcard', () => {
    expect(isIndexPattern('ai-index-idx-logs-*')).toBe(true);
    expect(isIndexPattern('ai-index-ds-customer_support*')).toBe(true);
  });

  it('returns true when the dest value lists multiple expressions', () => {
    expect(isIndexPattern('ai-index-idx-logs-*,ai-index-idx-kibana*')).toBe(true);
  });
});
