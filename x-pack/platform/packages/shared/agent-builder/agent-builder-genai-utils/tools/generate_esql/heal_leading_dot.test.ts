/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { healLeadingDotInFromClause } from './heal_leading_dot';

describe('healLeadingDotInFromClause', () => {
  it('restores the leading dot on .alerts-* indices when the LLM dropped it', () => {
    expect(healLeadingDotInFromClause('FROM alerts-security.alerts-default | LIMIT 10')).toBe(
      'FROM .alerts-security.alerts-default | LIMIT 10'
    );
  });

  it('is a no-op when the leading dot is already present', () => {
    const correct = 'FROM .alerts-security.alerts-default | LIMIT 10';
    expect(healLeadingDotInFromClause(correct)).toBe(correct);
  });

  it('handles `FROM` in lower-case', () => {
    expect(healLeadingDotInFromClause('from alerts-security.alerts-default | LIMIT 10')).toBe(
      'FROM .alerts-security.alerts-default | LIMIT 10'
    );
  });

  it('preserves optional cluster prefix', () => {
    expect(
      healLeadingDotInFromClause('FROM remote:alerts-security.alerts-default | LIMIT 10')
    ).toBe('FROM remote:.alerts-security.alerts-default | LIMIT 10');
  });

  it('does NOT touch non-allow-listed indices (no false positive on user data)', () => {
    const userIndex = 'FROM logs-system.auth-default | LIMIT 10';
    expect(healLeadingDotInFromClause(userIndex)).toBe(userIndex);
  });

  it('does NOT touch indices that share a prefix but are not on the allow-list', () => {
    const tricky = 'FROM alertsX-security | LIMIT 10';
    expect(healLeadingDotInFromClause(tricky)).toBe(tricky);
  });

  it('heals .ml-anomalies-*, .entities.*, and .siem-signals-* patterns', () => {
    expect(healLeadingDotInFromClause('FROM ml-anomalies-shared')).toBe(
      'FROM .ml-anomalies-shared'
    );
    expect(healLeadingDotInFromClause('FROM entities.foo-default')).toBe(
      'FROM .entities.foo-default'
    );
    expect(healLeadingDotInFromClause('FROM siem-signals-default')).toBe(
      'FROM .siem-signals-default'
    );
  });

  it('heals only the FROM clause, not other clauses that mention an index name', () => {
    const query =
      'FROM alerts-security.alerts-default | WHERE host.name == "alerts-security.alerts-default"';
    expect(healLeadingDotInFromClause(query)).toBe(
      'FROM .alerts-security.alerts-default | WHERE host.name == "alerts-security.alerts-default"'
    );
  });

  it('returns the input unchanged for empty / non-string values', () => {
    expect(healLeadingDotInFromClause('')).toBe('');
    // @ts-expect-error - exercising defensive runtime guard
    expect(healLeadingDotInFromClause(null)).toBe(null);
    // @ts-expect-error - exercising defensive runtime guard
    expect(healLeadingDotInFromClause(undefined)).toBe(undefined);
  });
});
