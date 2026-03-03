/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureMetadata, extractWhereExpression } from './esql_helpers';

describe('extractWhereExpression', () => {
  it('returns the WHERE expression when present', () => {
    const expr = extractWhereExpression('FROM logs* | WHERE message == "error"');
    expect(expr).toBeDefined();
  });

  it('returns undefined when there is no WHERE clause', () => {
    expect(extractWhereExpression('FROM logs*')).toBeUndefined();
  });
});

describe('ensureMetadata', () => {
  it('adds METADATA _id, _source when missing', () => {
    const result = ensureMetadata('FROM logs* | WHERE x > 1');
    expect(result).toBe('FROM logs* METADATA _id, _source | WHERE x > 1');
  });

  it('does not duplicate METADATA when already present', () => {
    const query = 'FROM logs* METADATA _id, _source | WHERE x > 1';
    expect(ensureMetadata(query)).toBe(query);
  });

  it('handles queries without a WHERE clause', () => {
    const result = ensureMetadata('FROM logs*');
    expect(result).toBe('FROM logs* METADATA _id, _source');
  });

  it('handles multi-index FROM clauses', () => {
    const result = ensureMetadata('FROM logs.child,logs.child.* | WHERE status == "ok"');
    expect(result).toContain('METADATA _id, _source');
    expect(result).toContain('logs.child');
    expect(result).toContain('logs.child.*');
    expect(result).toContain('WHERE status == "ok"');
  });

  it('preserves KQL function calls in the WHERE clause', () => {
    const result = ensureMetadata(
      'FROM logs.child,logs.child.* | WHERE KQL("message: \\"error\\"")'
    );
    expect(result).toContain('METADATA _id, _source');
    expect(result).toContain('KQL("message: \\"error\\""');
  });

  it('returns the original string if there is no FROM command', () => {
    expect(ensureMetadata('SHOW INFO')).toBe('SHOW INFO');
  });
});
