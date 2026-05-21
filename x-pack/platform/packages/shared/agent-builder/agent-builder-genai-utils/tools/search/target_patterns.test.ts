/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIndexPattern } from './target_patterns';

describe('isIndexPattern', () => {
  it('returns true when the target is a lone asterisk', () => {
    expect(isIndexPattern('*')).toBe(true);
  });

  it('returns true for wildcard index patterns', () => {
    expect(isIndexPattern('logs-*')).toBe(true);
  });

  it('returns true for comma-separated index patterns', () => {
    expect(isIndexPattern('logs-*,auditbeat-*')).toBe(true);
  });

  it('returns true for multiple comma-separated indices', () => {
    expect(isIndexPattern('logs-test,auditbeat-test')).toBe(true);
  });

  it('returns false for concrete single targets', () => {
    expect(isIndexPattern('kibana_sample_data_logs')).toBe(false);
  });

  it('returns false for empty target', () => {
    expect(isIndexPattern('')).toBe(false);
  });
});
