/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { canCompileMatchMetric, stripTrailingPipeCommands } from './can_compile_match_metric';
import { compileMatchCountBreachQuery } from './match_count_query_compiler';
import { METRIC_SERIES_LIMIT } from './metric_series_contract';

describe('stripTrailingPipeCommands', () => {
  it('peels trailing SORT / LIMIT / KEEP from the end only', () => {
    expect(
      stripTrailingPipeCommands(
        'FROM logs-* | WHERE level == "error" | SORT @timestamp DESC | LIMIT 10'
      )
    ).toBe('FROM logs-* | WHERE level == "error"');
  });

  it('does not strip KEEP / SORT that sit before a WHERE', () => {
    expect(stripTrailingPipeCommands('FROM logs-* | KEEP message | WHERE level == "error"')).toBe(
      'FROM logs-* | KEEP message | WHERE level == "error"'
    );
    expect(
      stripTrailingPipeCommands('FROM logs-* | SORT @timestamp DESC | WHERE level == "error"')
    ).toBe('FROM logs-* | SORT @timestamp DESC | WHERE level == "error"');
  });

  it('peels trailing SORT/LIMIT without corrupting a pipe inside a WHERE string literal', () => {
    expect(
      stripTrailingPipeCommands(
        'FROM logs-* | WHERE message == "queue full | LIMIT exceeded" | SORT @timestamp DESC | LIMIT 10'
      )
    ).toBe('FROM logs-* | WHERE message == "queue full | LIMIT exceeded"');
  });

  it('leaves a pipe inside a string literal untouched when there is nothing to peel', () => {
    expect(
      stripTrailingPipeCommands('FROM logs-* | WHERE message == "queue full | LIMIT exceeded"')
    ).toBe('FROM logs-* | WHERE message == "queue full | LIMIT exceeded"');
  });
});

describe('canCompileMatchMetric', () => {
  it('accepts filter-only MATCH queries', () => {
    expect(canCompileMatchMetric('FROM logs-* | WHERE level == "error"')).toBe(true);
  });

  it('accepts FROM-only and trailing SORT/LIMIT', () => {
    expect(canCompileMatchMetric('FROM logs-*')).toBe(true);
    expect(
      canCompileMatchMetric(
        'FROM logs-* | WHERE level == "error" | SORT @timestamp DESC | LIMIT 10'
      )
    ).toBe(true);
  });

  it('rejects STATS queries', () => {
    expect(
      canCompileMatchMetric(
        'FROM logs | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)'
      )
    ).toBe(false);
  });

  it('rejects KEEP / SORT / LIMIT / EVAL between FROM and WHERE', () => {
    expect(canCompileMatchMetric('FROM logs-* | KEEP message | WHERE level == "error"')).toBe(
      false
    );
    expect(
      canCompileMatchMetric('FROM logs-* | SORT @timestamp DESC | WHERE level == "error"')
    ).toBe(false);
    expect(canCompileMatchMetric('FROM logs-* | LIMIT 100 | WHERE level == "error"')).toBe(false);
    expect(canCompileMatchMetric('FROM logs-* | EVAL x = 1 | WHERE level == "error"')).toBe(false);
  });

  it('rejects empty and unparseable queries', () => {
    expect(canCompileMatchMetric('   ')).toBe(false);
    expect(canCompileMatchMetric('NOT VALID ESQL !!!')).toBe(false);
  });

  it('fails closed on parser errors (e.g. an unterminated string literal)', () => {
    expect(canCompileMatchMetric('FROM logs-* | WHERE message == "queue full')).toBe(false);
  });

  it('accepts a filter-only query with a pipe inside a WHERE string literal', () => {
    expect(
      canCompileMatchMetric('FROM logs-* | WHERE message == "queue full | LIMIT exceeded"')
    ).toBe(true);
  });
});

describe('compileMatchCountBreachQuery', () => {
  it('compiles a MATCH KI into a closed-minute count series', () => {
    const compiled = compileMatchCountBreachQuery(
      'FROM logs-* | WHERE level == "error"',
      '@timestamp'
    );

    expect(compiled).toContain('FROM logs-*');
    expect(compiled).not.toContain('?_tend');
    expect(compiled).toContain(
      'STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)'
    );
    expect(compiled).toContain('WHERE bucket < DATE_TRUNC(1 minute, NOW())');
    expect(compiled).toContain('KEEP bucket, metric_value');
    expect(compiled).toContain('SORT bucket DESC');
    expect(compiled).toContain(`LIMIT ${METRIC_SERIES_LIMIT}`);
    expect(compiled).not.toContain('TO_LONG');
    expect(compiled).not.toContain('DATE_FORMAT');
    expect(compiled).not.toContain('SORT bucket ASC');
  });

  it('strips trailing SORT/LIMIT while keeping the author WHERE', () => {
    const compiled = compileMatchCountBreachQuery(
      'FROM logs-* | WHERE level == "error" | SORT @timestamp DESC | LIMIT 10',
      '@timestamp'
    );
    const base = compiled.split('\n| ')[0];
    expect(base).toContain('WHERE level == "error"');
    expect(base).not.toMatch(/\bSORT\b/);
    expect(base).not.toMatch(/\bLIMIT\b/);
  });

  it('fails closed for STATS and non-filter MATCH shapes', () => {
    expect(() =>
      compileMatchCountBreachQuery(
        'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
        '@timestamp'
      )
    ).toThrow(/filter-only/);

    expect(() =>
      compileMatchCountBreachQuery(
        'FROM logs-* | KEEP message | WHERE level == "error"',
        '@timestamp'
      )
    ).toThrow(/filter-only/);
  });

  it('fails closed for queries with parser errors', () => {
    expect(() =>
      compileMatchCountBreachQuery('FROM logs-* | WHERE message == "queue full', '@timestamp')
    ).toThrow(/filter-only/);
  });

  it('preserves a pipe inside a WHERE literal and emits valid ES|QL', () => {
    const compiled = compileMatchCountBreachQuery(
      'FROM logs-* | WHERE message == "queue full | LIMIT exceeded" | SORT @timestamp DESC | LIMIT 10',
      '@timestamp'
    );

    // The author WHERE (literal intact) survives; trailing SORT/LIMIT are peeled.
    expect(compiled.split('\n| ')[0]).toBe(
      'FROM logs-* | WHERE message == "queue full | LIMIT exceeded"'
    );
    // The compiled breach query must itself parse cleanly (no corrupted literal).
    expect(Parser.parse(compiled).errors).toHaveLength(0);
  });
});
