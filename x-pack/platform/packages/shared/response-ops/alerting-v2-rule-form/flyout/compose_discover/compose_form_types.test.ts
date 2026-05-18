/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposedQuery, StandaloneQuery } from './compose_form_types';
import { getBreachQuery, getRecoverQuery } from './compose_form_types';

const BASE = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
const ALERT_BLOCK = '| WHERE count > 100';
const RECOVERY_BLOCK = '| WHERE count < 100';

describe('getBreachQuery', () => {
  it('returns empty string for undefined input', () => {
    expect(getBreachQuery(undefined)).toBe('');
  });

  it('returns breach directly for standalone query', () => {
    const query: StandaloneQuery = { format: 'standalone', breach: 'FROM logs-* | LIMIT 10' };
    expect(getBreachQuery(query)).toBe('FROM logs-* | LIMIT 10');
  });

  it('returns empty string for standalone query with empty breach', () => {
    const query: StandaloneQuery = { format: 'standalone', breach: '' };
    expect(getBreachQuery(query)).toBe('');
  });

  it('joins base and breach for composed query', () => {
    const query: ComposedQuery = {
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK },
    };
    expect(getBreachQuery(query)).toBe(`${BASE}\n${ALERT_BLOCK}`);
  });

  it('returns just breach when composed base is empty', () => {
    const query: ComposedQuery = {
      format: 'composed',
      base: '',
      blocks: { breach: ALERT_BLOCK },
    };
    expect(getBreachQuery(query)).toBe(ALERT_BLOCK);
  });

  it('returns just base when composed breach is empty', () => {
    const query: ComposedQuery = {
      format: 'composed',
      base: BASE,
      blocks: { breach: '' },
    };
    expect(getBreachQuery(query)).toBe(BASE);
  });
});

describe('getRecoverQuery', () => {
  it('returns empty string for undefined input', () => {
    expect(getRecoverQuery(undefined)).toBe('');
  });

  it('returns recover for standalone query with recovery', () => {
    const query: StandaloneQuery = {
      format: 'standalone',
      breach: 'FROM logs-*',
      recover: 'FROM logs-* | WHERE status = "ok"',
    };
    expect(getRecoverQuery(query)).toBe('FROM logs-* | WHERE status = "ok"');
  });

  it('returns empty string for standalone query without recovery', () => {
    const query: StandaloneQuery = { format: 'standalone', breach: 'FROM logs-*' };
    expect(getRecoverQuery(query)).toBe('');
  });

  it('joins base and recover for composed query with recovery block', () => {
    const query: ComposedQuery = {
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK, recover: RECOVERY_BLOCK },
    };
    expect(getRecoverQuery(query)).toBe(`${BASE}\n${RECOVERY_BLOCK}`);
  });

  it('returns empty string for composed query without recovery block', () => {
    const query: ComposedQuery = {
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK },
    };
    expect(getRecoverQuery(query)).toBe('');
  });

  it('returns empty string for composed query with undefined recovery block', () => {
    const query: ComposedQuery = {
      format: 'composed',
      base: BASE,
      blocks: { breach: ALERT_BLOCK, recover: undefined },
    };
    expect(getRecoverQuery(query)).toBe('');
  });

  it('returns just recover when composed base is empty', () => {
    const query: ComposedQuery = {
      format: 'composed',
      base: '',
      blocks: { breach: '', recover: RECOVERY_BLOCK },
    };
    expect(getRecoverQuery(query)).toBe(RECOVERY_BLOCK);
  });
});
