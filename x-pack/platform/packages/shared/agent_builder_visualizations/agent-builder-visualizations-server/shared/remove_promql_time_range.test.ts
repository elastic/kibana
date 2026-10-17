/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { removePromqlTimeRangeParams } from './remove_promql_time_range';

describe('removePromqlTimeRangeParams', () => {
  it('removes start=?_tstart and end=?_tend from a PROMQL command', () => {
    expect(
      removePromqlTimeRangeParams(
        'PROMQL index=metrics-tsds start=?_tstart end=?_tend rate=(sum by (host) (rate(requests)))'
      )
    ).toBe('PROMQL index=metrics-tsds rate=(sum by (host) (rate(requests)))');
  });

  it('keeps other options and the rest of the query text', () => {
    const query = `PROMQL index=metrics-tsds end=?_tend step=1m start=?_tstart util=(avg by (instance) (node_load1))
| STATS util = AVG(util) BY instance`;
    expect(removePromqlTimeRangeParams(query))
      .toBe(`PROMQL index=metrics-tsds step=1m util=(avg by (instance) (node_load1))
| STATS util = AVG(util) BY instance`);
  });

  it('keeps the expression text of an unaliased PROMQL expression', () => {
    expect(
      removePromqlTimeRangeParams(
        'PROMQL index=metrics-tsds start=?_tstart end=?_tend 100 - (avg(rate(node_cpu_seconds_total{mode="idle"})) * 100)'
      )
    ).toBe(
      'PROMQL index=metrics-tsds 100 - (avg(rate(node_cpu_seconds_total{mode="idle"})) * 100)'
    );
  });

  it('leaves absolute start and end values unchanged', () => {
    const query =
      'PROMQL index=metrics-tsds start="2026-01-01T00:00:00Z" end="2026-01-02T00:00:00Z" v=(sum(rate(requests)))';
    expect(removePromqlTimeRangeParams(query)).toBe(query);
  });

  it('leaves a query with only one of the options unchanged', () => {
    const query = 'PROMQL index=metrics-tsds start=?_tstart v=(sum(rate(requests)))';
    expect(removePromqlTimeRangeParams(query)).toBe(query);
  });

  it('leaves other source commands unchanged', () => {
    const query = 'TS metrics-tsds | WHERE TRANGE(?_tstart, ?_tend) | STATS SUM(RATE(requests))';
    expect(removePromqlTimeRangeParams(query)).toBe(query);
  });

  it('does not parse queries that cannot contain both options', () => {
    const parseSpy = jest.spyOn(Parser, 'parse');
    removePromqlTimeRangeParams('FROM logs-* | STATS COUNT(*) BY BUCKET(@timestamp, 1h)');
    removePromqlTimeRangeParams('TS metrics-tsds | WHERE TRANGE(?_tstart, ?_tend)');
    removePromqlTimeRangeParams('PROMQL index=metrics-tsds start=?_tstart v=(sum(rate(requests)))');
    expect(parseSpy).not.toHaveBeenCalled();
    parseSpy.mockRestore();
  });

  it('leaves queries that fail to parse unchanged', () => {
    const query = 'PROMQL index=metrics-tsds start=?_tstart end=?_tend | NOT_A_COMMAND';
    expect(removePromqlTimeRangeParams(query)).toBe(query);
  });
});
