/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { healAlertsAliasInFromClause } from './heal_alerts_alias';

describe('healAlertsAliasInFromClause', () => {
  it('rewrites the per-space alias form to the wildcard form (default space)', () => {
    expect(healAlertsAliasInFromClause('FROM .alerts-security.alerts-default | LIMIT 10')).toBe(
      'FROM .alerts-security.alerts-* | LIMIT 10'
    );
  });

  it('rewrites custom-space aliases (alphanumerics, underscores, hyphens)', () => {
    expect(healAlertsAliasInFromClause('FROM .alerts-security.alerts-custom_space-1')).toBe(
      'FROM .alerts-security.alerts-*'
    );
  });

  it('is a no-op when the FROM clause already targets the wildcard', () => {
    const correct = 'FROM .alerts-security.alerts-* | LIMIT 10';
    expect(healAlertsAliasInFromClause(correct)).toBe(correct);
  });

  it('handles `FROM` in lower-case', () => {
    expect(healAlertsAliasInFromClause('from .alerts-security.alerts-default | LIMIT 10')).toBe(
      'FROM .alerts-security.alerts-* | LIMIT 10'
    );
  });

  it('preserves optional cluster prefix', () => {
    expect(
      healAlertsAliasInFromClause('FROM remote:.alerts-security.alerts-default | LIMIT 10')
    ).toBe('FROM remote:.alerts-security.alerts-* | LIMIT 10');
  });

  it('does NOT touch the underlying backing index name (different shape)', () => {
    const backing = 'FROM .internal.alerts-security.alerts-default-000001';
    expect(healAlertsAliasInFromClause(backing)).toBe(backing);
  });

  it('does NOT touch unrelated dot-prefixed indices', () => {
    const ml = 'FROM .ml-anomalies-shared | LIMIT 10';
    expect(healAlertsAliasInFromClause(ml)).toBe(ml);
  });

  it('does NOT touch FROM clauses that mention the alias inside a string literal', () => {
    const query =
      'FROM .alerts-security.alerts-default | WHERE host.name == "alerts-security.alerts-default"';
    expect(healAlertsAliasInFromClause(query)).toBe(
      'FROM .alerts-security.alerts-* | WHERE host.name == "alerts-security.alerts-default"'
    );
  });

  it('handles the alias appearing without a trailing pipe / token boundary', () => {
    expect(healAlertsAliasInFromClause('FROM .alerts-security.alerts-default')).toBe(
      'FROM .alerts-security.alerts-*'
    );
  });

  it('returns the input unchanged for empty / non-string values', () => {
    expect(healAlertsAliasInFromClause('')).toBe('');
    // @ts-expect-error - exercising defensive runtime guard
    expect(healAlertsAliasInFromClause(null)).toBe(null);
    // @ts-expect-error - exercising defensive runtime guard
    expect(healAlertsAliasInFromClause(undefined)).toBe(undefined);
  });
});
