/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFromSourceQuery } from './extract_from_source_query';

describe('extractFromSourceQuery', () => {
  it('returns empty string for empty input', () => {
    expect(extractFromSourceQuery('')).toBe('');
    expect(extractFromSourceQuery('   ')).toBe('');
  });

  it('extracts FROM from a simple query', () => {
    expect(extractFromSourceQuery('FROM logs-* | LIMIT 10')).toBe('FROM logs-*');
  });

  it('extracts FROM from a STATS pipeline', () => {
    expect(
      extractFromSourceQuery(
        'FROM kibana_sample_data_flights | STATS COUNT(*) BY DestCityName, timestamp | WHERE Cancelled == "true"'
      )
    ).toBe('FROM kibana_sample_data_flights');
  });

  it('extracts FROM with dotted index name', () => {
    expect(extractFromSourceQuery('FROM metrics-* | WHERE host.name == "a"')).toBe(
      'FROM metrics-*'
    );
  });

  it('returns empty string when query has no source command', () => {
    expect(extractFromSourceQuery('STATS COUNT(*)')).toBe('');
  });

  it('extracts FROM with multiple indices', () => {
    expect(extractFromSourceQuery('FROM logs-*, metrics-* | LIMIT 10')).toBe(
      'FROM logs-*, metrics-*'
    );
  });

  it('extracts TS from a simple timeseries query', () => {
    expect(extractFromSourceQuery('TS metrics-* | LIMIT 10')).toBe('TS metrics-*');
  });

  it('extracts TS from a STATS pipeline', () => {
    expect(
      extractFromSourceQuery(
        'TS metrics-kubeletstatsreceiver.otel-* | STATS COUNT(*) BY @timestamp | WHERE throttled == true'
      )
    ).toBe('TS metrics-kubeletstatsreceiver.otel-*');
  });

  it('extracts FROM after a leading comment', () => {
    expect(extractFromSourceQuery('// a comment\nFROM logs-* | LIMIT 10')).toBe('FROM logs-*');
  });

  it('extracts FROM after a SET header', () => {
    expect(extractFromSourceQuery('SET unmapped_fields = "FAIL"; FROM logs-* | LIMIT 10')).toBe(
      'FROM logs-*'
    );
  });

  it('extracts ROW', () => {
    expect(extractFromSourceQuery('ROW a = 1')).toBe('ROW a = 1');
  });

  it('extracts SHOW', () => {
    expect(extractFromSourceQuery('SHOW INFO')).toBe('SHOW INFO');
  });

  it('extracts PROMQL', () => {
    expect(
      extractFromSourceQuery(
        'PROMQL index=metrics step=1m start=?_tstart end=?_tend (avg(cpu_usage))'
      )
    ).toBe('PROMQL index=metrics step=1m start=?_tstart end=?_tend (avg(cpu_usage))');
  });
});
