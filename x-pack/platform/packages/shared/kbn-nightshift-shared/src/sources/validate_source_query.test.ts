/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSourceCommandQuery,
  hasMultipleSourceIndices,
  validateSourceQuery,
} from './validate_source_query';

const expectRejected = (esql: string, messagePart: string) => {
  expect(validateSourceQuery(esql)).toContain(messagePart);
};

describe('validateSourceQuery', () => {
  describe('accepts', () => {
    it.each([
      'FROM logs-*',
      'FROM logs-nginx-*, logs-apache-* | WHERE status >= 500',
      'FROM logs-* | WHERE host.name == "a" | WHERE status >= 500',
      'from logs-* | where status >= 500',
      'TS metrics-*',
      'TS metrics-* | WHERE host.name == "a"',
      'FROM <logs-{now/d}>',
      'FROM $.logs.nginx',
    ])('%s', (esql) => {
      expect(validateSourceQuery(esql)).toBeUndefined();
    });
  });

  describe('rejects', () => {
    it('a query that does not parse', () => {
      expectRejected('FROM logs-* | WHERE', 'Invalid ES|QL query');
    });

    it('a first command that is not FROM or TS', () => {
      expectRejected('ROW a = 1', 'must start with FROM or TS');
      expectRejected('SHOW INFO', 'must start with FROM or TS');
    });

    it.each([
      ['EVAL', 'FROM logs-* | EVAL x = 1'],
      ['STATS', 'FROM logs-* | STATS c = COUNT(*)'],
      ['LIMIT', 'FROM logs-* | LIMIT 10'],
      ['KEEP', 'FROM logs-* | WHERE x > 1 | KEEP x'],
      ['SORT', 'FROM logs-* | SORT @timestamp'],
    ])('%s after the source command', (command, esql) => {
      expectRejected(esql, `Command "${command}" is not allowed`);
    });

    // Assumption check against @elastic/esql: Walker.commands must surface commands that live
    // inside a subquery, otherwise this rule would let branching queries through.
    it('a subquery inside WHERE', () => {
      expectRejected(
        'FROM logs-* | WHERE host.name IN (FROM hosts | STATS BY host.name)',
        'is not allowed'
      );
    });

    it('METADATA on FROM', () => {
      expectRejected('FROM logs-* METADATA _id', 'METADATA is not allowed');
      expectRejected('FROM logs-* METADATA _id, _source | WHERE x > 1', 'METADATA is not allowed');
    });

    // Assumption check against @elastic/esql: TS must produce the same `option` node for
    // METADATA as FROM does.
    it('METADATA on TS', () => {
      expectRejected('TS metrics-* METADATA _id', 'METADATA is not allowed');
    });

    it('a remote cluster prefix', () => {
      expectRejected('FROM remote:logs-*', 'Remote cluster references are not allowed');
      expectRejected('FROM logs-*, remote:logs-* | WHERE x > 1', 'found "remote:logs-*"');
    });

    it('a Nightshift source view', () => {
      expectRejected(
        'FROM $.nightshift.sources.*',
        'Nightshift source views cannot be used as a source'
      );
      expectRejected('FROM $.nightshift.sources.abc', 'found "$.nightshift.sources.abc"');
      expectRejected(
        'FROM logs-*, $.nightshift.sources.foo | WHERE status >= 500',
        'found "$.nightshift.sources.foo"'
      );
    });
  });
});

describe('getSourceCommandQuery', () => {
  it('keeps only the source command', () => {
    expect(getSourceCommandQuery('FROM logs-a, logs-b* | WHERE status >= 500 | WHERE x == 1')).toBe(
      'FROM logs-a, logs-b*'
    );
    expect(getSourceCommandQuery('ts metrics-* | where host.name == "a"')).toBe('TS metrics-*');
  });
});

describe('hasMultipleSourceIndices', () => {
  it('is false for a single source', () => {
    expect(hasMultipleSourceIndices('FROM logs-* | WHERE status >= 500')).toBe(false);
    expect(hasMultipleSourceIndices('TS metrics-*')).toBe(false);
  });

  it('is true when FROM names several indices', () => {
    expect(hasMultipleSourceIndices('FROM logs-a, logs-b* | WHERE status >= 500')).toBe(true);
  });
});
