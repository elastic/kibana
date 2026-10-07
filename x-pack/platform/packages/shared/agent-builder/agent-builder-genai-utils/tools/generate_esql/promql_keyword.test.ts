/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withPromqlKeyword } from './promql_keyword';

describe('withPromqlKeyword', () => {
  it('adds PROMQL when the request mentions PromQL', () => {
    expect(withPromqlKeyword(['STATS'], 'cpu utilization using PromQL')).toEqual([
      'STATS',
      'PROMQL',
    ]);
  });

  it('matches regardless of case and in the additional context', () => {
    expect(withPromqlKeyword([], 'cpu utilization', 'You MUST use the PROMQL command')).toEqual([
      'PROMQL',
    ]);
  });

  it('does not duplicate PROMQL when it was already requested', () => {
    expect(withPromqlKeyword(['PROMQL', 'STATS'], 'using promql')).toEqual(['PROMQL', 'STATS']);
  });

  it('leaves the keywords unchanged when PromQL is not mentioned', () => {
    const keywords = ['TS', 'STATS'];
    expect(withPromqlKeyword(keywords, 'request rate per instance')).toBe(keywords);
  });
});
