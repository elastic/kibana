/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeFieldResolutionQuery } from './get_time_field_resolution_query';
import type { RuleQuery } from '../../form/types';

const splitQuery: RuleQuery = {
  base: 'FROM kibana_sample_data_flights | STATS COUNT(*) BY timestamp',
  breach: { segment: '| WHERE Cancelled == "true"' },
};

const unsplitQuery: RuleQuery = {
  base: 'FROM logs-* | LIMIT 10',
  breach: { segment: '' },
};

const PROMQL_QUERY = 'PROMQL index=metrics step=1m start=?_tstart end=?_tend (avg(cpu_usage))';

describe('getTimeFieldResolutionQuery', () => {
  it('returns the base query when committed', () => {
    expect(getTimeFieldResolutionQuery(splitQuery, true)).toBe(splitQuery.base);
  });

  it('returns the whole pipeline when the breach segment is empty', () => {
    expect(getTimeFieldResolutionQuery(unsplitQuery, true)).toBe(unsplitQuery.base);
  });

  it('returns empty when the query is not committed', () => {
    expect(getTimeFieldResolutionQuery(splitQuery, false)).toBe('');
  });

  it('returns empty when the base query has no source command', () => {
    expect(
      getTimeFieldResolutionQuery({ base: '', breach: { segment: '| WHERE count > 1' } }, true)
    ).toBe('');
  });

  it('returns a committed TS base query', () => {
    const tsQuery: RuleQuery = {
      base: 'TS metrics-kubeletstatsreceiver.otel-* | STATS COUNT(*) BY @timestamp',
      breach: { segment: '| WHERE throttled == true' },
    };
    expect(getTimeFieldResolutionQuery(tsQuery, true)).toBe(tsQuery.base);
  });

  it('returns a committed PROMQL query', () => {
    const promqlQuery: RuleQuery = { base: PROMQL_QUERY, breach: { segment: '' } };
    expect(getTimeFieldResolutionQuery(promqlQuery, true)).toBe(PROMQL_QUERY);
  });

  it('returns a committed ROW query', () => {
    const rowQuery: RuleQuery = { base: 'ROW a = 1', breach: { segment: '' } };
    expect(getTimeFieldResolutionQuery(rowQuery, true)).toBe('ROW a = 1');
  });

  it('returns a committed query that starts with SET then FROM', () => {
    const setQuery: RuleQuery = {
      base: 'SET unmapped_fields = "FAIL"; FROM logs-* | LIMIT 10',
      breach: { segment: '' },
    };
    expect(getTimeFieldResolutionQuery(setQuery, true)).toBe(setQuery.base);
  });
});
