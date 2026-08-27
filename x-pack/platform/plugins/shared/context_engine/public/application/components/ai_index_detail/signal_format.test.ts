/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { humanizeTagType, signalSummary, tagDescription } from './signal_format';
import { buildSignal } from './signal_test_fixtures';

describe('tagDescription', () => {
  it('returns a curated one-line description for a known tag', () => {
    expect(tagDescription('query_error')).toMatch(/failed/i);
    expect(tagDescription('empty_retrieval')).toMatch(/no rows/i);
    expect(tagDescription('coverage_gap')).toMatch(/raw index access/i);
  });

  it('falls back to a generic description (with the humanized label) for an unknown tag', () => {
    expect(tagDescription('some_new_tag')).toContain('Some New Tag');
  });
});

describe('humanizeTagType', () => {
  it('uses the curated label for a known tag', () => {
    expect(humanizeTagType('query_error')).toBe('Query error');
    expect(humanizeTagType('empty_retrieval')).toBe('Empty retrieval');
    expect(humanizeTagType('coverage_gap')).toBe('Coverage gap');
  });

  it('title-cases an unknown snake_case tag', () => {
    expect(humanizeTagType('some_new_tag')).toBe('Some New Tag');
  });

  it('falls back to "Signal" for an empty tag', () => {
    expect(humanizeTagType('')).toBe('Signal');
  });
});

describe('signalSummary', () => {
  it('reports a failed call when the status is Error (with the error message)', () => {
    const summary = signalSummary(
      buildSignal({ status: 'Error', fell_back_to_raw: false, error: 'oops' }, [])
    );
    expect(summary).toContain('failed');
    expect(summary).toContain('oops');
  });

  it('reports a failed call from the query_error tag', () => {
    const summary = signalSummary(
      buildSignal({ status: 'Ok', fell_back_to_raw: false, error: undefined }, ['query_error'])
    );
    expect(summary).toContain('failed');
  });

  it('reports an empty retrieval when zero rows are returned', () => {
    const summary = signalSummary(
      buildSignal(
        { status: 'Ok', fell_back_to_raw: false, returned: { columns: [], row_count: 0 } },
        []
      )
    );
    expect(summary).toContain('no rows');
  });

  it('reports a coverage gap when tagged coverage_gap', () => {
    const summary = signalSummary(
      buildSignal(
        { status: 'Ok', fell_back_to_raw: false, returned: { columns: [], row_count: 5 } },
        ['coverage_gap']
      )
    );
    expect(summary).toContain('coverage gap');
  });

  it('appends the fell-back-to-raw sentence', () => {
    const summary = signalSummary(
      buildSignal(
        { status: 'Ok', fell_back_to_raw: true, returned: { columns: [], row_count: 5 } },
        []
      )
    );
    expect(summary).toContain('fell back to raw index access');
  });

  it('uses the row-count fallback when no other branch applies', () => {
    const summary = signalSummary(
      buildSignal(
        { status: 'Ok', fell_back_to_raw: false, returned: { columns: [], row_count: 5 } },
        []
      )
    );
    expect(summary).toContain('5 rows');
  });
});
