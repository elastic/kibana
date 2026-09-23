/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeFieldResolutionQuery } from './get_time_field_resolution_query';
import type { RuleQuery } from '../../form/types';

const composedQuery: RuleQuery = {
  format: 'composed',
  base: 'FROM kibana_sample_data_flights | STATS COUNT(*) BY timestamp',
  breach: { segment: '| WHERE Cancelled == "true"' },
};

const standaloneQuery: RuleQuery = {
  format: 'standalone',
  breach: { query: 'FROM logs-* | LIMIT 10' },
};

const PROMQL_QUERY = 'PROMQL index=metrics step=1m start=?_tstart end=?_tend (avg(cpu_usage))';

describe('getTimeFieldResolutionQuery', () => {
  it('returns the base query in alert mode when committed', () => {
    expect(getTimeFieldResolutionQuery(composedQuery, true, true)).toBe(composedQuery.base);
  });

  it('returns the breach query in signal mode when committed', () => {
    expect(getTimeFieldResolutionQuery(standaloneQuery, false, true)).toBe(
      standaloneQuery.breach.query
    );
  });

  it('falls back to the breach query for standalone alert rules (YAML sandbox)', () => {
    expect(getTimeFieldResolutionQuery(standaloneQuery, true, true)).toBe(
      standaloneQuery.breach.query
    );
  });

  it('returns empty when the query is not committed', () => {
    expect(getTimeFieldResolutionQuery(composedQuery, true, false)).toBe('');
  });

  it('returns empty when the candidate query has no source command', () => {
    expect(
      getTimeFieldResolutionQuery(
        { format: 'composed', base: '', breach: { segment: '| WHERE count > 1' } },
        true,
        true
      )
    ).toBe('');
  });

  it('returns a committed TS composed base query in alert mode', () => {
    const tsQuery: RuleQuery = {
      format: 'composed',
      base: 'TS metrics-kubeletstatsreceiver.otel-* | STATS COUNT(*) BY @timestamp',
      breach: { segment: '| WHERE throttled == true' },
    };
    expect(getTimeFieldResolutionQuery(tsQuery, true, true)).toBe(tsQuery.base);
  });

  it('returns a committed TS standalone query in signal mode', () => {
    const tsQuery: RuleQuery = {
      format: 'standalone',
      breach: { query: 'TS metrics-* | LIMIT 10' },
    };
    expect(getTimeFieldResolutionQuery(tsQuery, false, true)).toBe(tsQuery.breach.query);
  });

  it('returns a committed PROMQL query', () => {
    const promqlQuery: RuleQuery = {
      format: 'standalone',
      breach: { query: PROMQL_QUERY },
    };
    expect(getTimeFieldResolutionQuery(promqlQuery, false, true)).toBe(PROMQL_QUERY);
  });

  it('returns a committed ROW query', () => {
    const rowQuery: RuleQuery = {
      format: 'standalone',
      breach: { query: 'ROW a = 1' },
    };
    expect(getTimeFieldResolutionQuery(rowQuery, true, true)).toBe('ROW a = 1');
  });

  it('returns a committed query that starts with SET then FROM', () => {
    const setQuery: RuleQuery = {
      format: 'standalone',
      breach: { query: 'SET unmapped_fields = "FAIL"; FROM logs-* | LIMIT 10' },
    };
    expect(getTimeFieldResolutionQuery(setQuery, true, true)).toBe(setQuery.breach.query);
  });
});
