/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Writable } from '@kbn/utility-types';
import { TimeSeriesQuerySchema, TimeSeriesQuery } from './time_series_types';
import { runTests } from './core_query_types.test';
import { TypeOf } from '@kbn/config-schema';

const DefaultParams: Writable<Partial<TimeSeriesQuery>> = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  groupBy: 'all',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
};

describe('TimeSeriesParams validate()', () => {
  runTests(TimeSeriesQuerySchema, DefaultParams);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let params: any;
  beforeEach(() => {
    params = { ...DefaultParams };
  });

  it('passes for minimal valid input', async () => {
    expect(validate()).toBeTruthy();
  });

  it('passes for maximal valid input', async () => {
    params.aggType = 'avg';
    params.aggField = 'agg-field';
    params.groupBy = 'top';
    params.termField = 'group-field';
    params.termSize = 100;
    params.dateStart = new Date().toISOString();
    params.dateEnd = new Date().toISOString();
    params.interval = '1s';
    expect(validate()).toBeTruthy();
  });

  it('fails for invalid dateStart', async () => {
    params.dateStart = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[dateStart]: expected value of type [string] but got [number]"`
    );

    params.dateStart = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`"[dateStart]: invalid date x"`);
  });

  it('fails for invalid dateEnd', async () => {
    params.dateEnd = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[dateEnd]: expected value of type [string] but got [number]"`
    );

    params.dateEnd = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`"[dateEnd]: invalid date x"`);
  });

  it('fails for invalid interval', async () => {
    params.interval = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[interval]: expected value of type [string] but got [number]"`
    );

    params.interval = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[interval]: invalid duration: \\"x\\""`
    );
  });

  it('fails for dateStart > dateEnd', async () => {
    params.dateStart = '2021-01-01T00:00:00.000Z';
    params.dateEnd = '2020-01-01T00:00:00.000Z';
    params.interval = '1s';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[dateStart]: is greater than [dateEnd]"`
    );
  });

  it('fails for dateStart != dateEnd and no interval', async () => {
    params.dateStart = '2020-01-01T00:00:00.000Z';
    params.dateEnd = '2021-01-01T00:00:00.000Z';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[interval]: must be specified if [dateStart] does not equal [dateEnd]"`
    );
  });

  it('fails for too many intervals', async () => {
    params.dateStart = '2020-01-01T00:00:00.000Z';
    params.dateEnd = '2021-01-01T00:00:00.000Z';
    params.interval = '1s';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"calculated number of intervals 31622400 is greater than maximum 1000"`
    );
  });

  function onValidate(): () => void {
    return () => validate();
  }

  function validate(): TypeOf<typeof TimeSeriesQuerySchema> {
    return TimeSeriesQuerySchema.validate(params);
  }
});
