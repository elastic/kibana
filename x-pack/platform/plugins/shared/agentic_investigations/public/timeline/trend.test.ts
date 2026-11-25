/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTrendTone, pickTrendSeries } from './trend';

describe('getTrendTone', () => {
  it('reads the words of the series first', () => {
    expect(getTrendTone('customer_impact', 'failed bulk writes')).toBe('bad');
    expect(getTrendTone('recovery', 'Plans succeeded')).toBe('good');
    expect(getTrendTone('recovery', 'clusters recovered from RED')).toBe('good');
    // A failing number is bad even in a recovery: red, going down.
    expect(getTrendTone('recovery', 'POST quote-old (failing)')).toBe('bad');
    expect(getTrendTone('failure', 'successful requests')).toBe('good');
  });

  it('falls back to the kind of event when the name says both or neither', () => {
    expect(getTrendTone('recovery', 'RED vs GREEN per 30 min')).toBe('good');
    expect(getTrendTone('failure', 'requests per minute')).toBe('bad');
    expect(getTrendTone('mitigation', undefined)).toBe('good');
    expect(getTrendTone('change', 'available replicas')).toBe('good');
    expect(getTrendTone('change', 'replicas')).toBe('neutral');
  });
});

describe('pickTrendSeries', () => {
  const series = [{ name: 'successful' }, { name: 'failed' }];

  it('draws the trouble for what went wrong and the improvement for a recovery', () => {
    expect(pickTrendSeries('customer_impact', series)?.name).toBe('failed');
    expect(pickTrendSeries('recovery', series)?.name).toBe('successful');
  });

  it('takes the first series when nothing is told apart, and nothing when there is none', () => {
    expect(pickTrendSeries('recovery', [{ name: 'a' }, { name: 'b' }])?.name).toBe('a');
    expect(pickTrendSeries('recovery', [])).toBeUndefined();
    expect(pickTrendSeries('recovery', undefined)).toBeUndefined();
  });
});
