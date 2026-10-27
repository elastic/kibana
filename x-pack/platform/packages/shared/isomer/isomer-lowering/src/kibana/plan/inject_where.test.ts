/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectWherePredicates } from './inject_where';

describe('injectWherePredicates', () => {
  it('inserts WHERE after FROM when the query has none', () => {
    expect(injectWherePredicates('FROM logs-* | STATS count = COUNT(*)', ['`env` == "prod"'])).toBe(
      'FROM logs-* | WHERE `env` == "prod" | STATS count = COUNT(*)'
    );
  });

  it('ANDs onto an existing WHERE', () => {
    expect(
      injectWherePredicates(
        'FROM logs-* | WHERE @timestamp >= NOW() - 7 day | STATS count = COUNT(*)',
        ['`env` == "prod"', '`service.name` == "checkout"']
      )
    ).toBe(
      'FROM logs-* | WHERE ((`env` == "prod") AND (`service.name` == "checkout")) AND @timestamp >= NOW() - 7 day | STATS count = COUNT(*)'
    );
  });

  it('does not merge into a WHERE that filters aggregation output', () => {
    // `count` exists only after the STATS; `service.name` only before it.
    // Merging here produced a query that referenced both in one clause.
    expect(
      injectWherePredicates('FROM logs | STATS count = COUNT(*) BY service | WHERE count > 10', [
        '`env` == "prod"',
      ])
    ).toBe(
      'FROM logs | WHERE `env` == "prod" | STATS count = COUNT(*) BY service | WHERE count > 10'
    );
  });

  it('still merges when WHERE is the first pipeline command', () => {
    expect(injectWherePredicates('FROM logs | WHERE a == 1 | STATS c = COUNT(*)', ['b == 2'])).toBe(
      'FROM logs | WHERE (b == 2) AND a == 1 | STATS c = COUNT(*)'
    );
  });
});
