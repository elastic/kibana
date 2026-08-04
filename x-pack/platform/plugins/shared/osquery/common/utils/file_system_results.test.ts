/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyFileListing, FILE_LISTING_WINDOW_CEILING } from './file_system_results';

describe('classifyFileListing', () => {
  it('should report ok with rows when there is data under the ceiling', () => {
    const result = classifyFileListing({ rows: [{ filename: 'a' }, { filename: 'b' }] });
    expect(result.state).toBe('ok');
    expect(result.rows).toHaveLength(2);
    expect(result.truncated).toBe(false);
  });

  it('should report empty when there are no rows and no denial hint', () => {
    const result = classifyFileListing({ rows: [] });
    expect(result.state).toBe('empty');
    expect(result.truncated).toBe(false);
  });

  it('should report access_denied for an empty result with a denial hint (macOS TCC)', () => {
    const result = classifyFileListing({ rows: [], likelyAccessDenied: true });
    expect(result.state).toBe('access_denied');
  });

  it('should report error and drop rows when the query errored', () => {
    const result = classifyFileListing({ rows: [{ filename: 'a' }], errored: true });
    expect(result.state).toBe('error');
    expect(result.rows).toHaveLength(0);
  });

  it('should flag truncation and cap rows at the window ceiling', () => {
    const rows = Array.from({ length: FILE_LISTING_WINDOW_CEILING + 50 }, (_, i) => ({
      filename: `f${i}`,
    }));
    const result = classifyFileListing({ rows, total: rows.length });
    expect(result.state).toBe('ok');
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(FILE_LISTING_WINDOW_CEILING);
    expect(result.total).toBe(FILE_LISTING_WINDOW_CEILING + 50);
  });

  it('should flag truncation from a reported total even when rows are already capped', () => {
    const rows = Array.from({ length: FILE_LISTING_WINDOW_CEILING }, (_, i) => ({
      filename: `f${i}`,
    }));
    const result = classifyFileListing({ rows, total: FILE_LISTING_WINDOW_CEILING + 1000 });
    expect(result.truncated).toBe(true);
  });
});
