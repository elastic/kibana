/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { degradedDocsParamsSchema } from './v1';

describe('degradedDocsParamsSchema', () => {
  const validParams = {
    timeUnit: 'm',
    timeSize: 5,
    threshold: [3],
    comparator: '>',
    groupBy: ['_index', 'host.name'],
    searchConfiguration: { index: 'logs-*' },
  };

  it('validates valid params', () => {
    expect(() => degradedDocsParamsSchema.validate(validParams)).not.toThrow();
  });

  it('validates a between threshold with two values', () => {
    expect(() =>
      degradedDocsParamsSchema.validate({
        ...validParams,
        comparator: 'between',
        threshold: [1, 10],
      })
    ).not.toThrow();
  });

  it('throws when threshold has more than two values', () => {
    expect(() =>
      degradedDocsParamsSchema.validate({ ...validParams, threshold: [1, 2, 3] })
    ).toThrow('[threshold]: array size is [3], but cannot be greater than [2]');
  });

  it('throws when timeUnit exceeds the max length', () => {
    expect(() =>
      degradedDocsParamsSchema.validate({ ...validParams, timeUnit: 'm'.repeat(65) })
    ).toThrow('[timeUnit]: value has length [65] but it must have a maximum length of [64].');
  });

  it('throws when searchConfiguration.index exceeds the max length', () => {
    expect(() =>
      degradedDocsParamsSchema.validate({
        ...validParams,
        searchConfiguration: { index: 'a'.repeat(10001) },
      })
    ).toThrow(
      '[searchConfiguration.index]: value has length [10001] but it must have a maximum length of [10000].'
    );
  });

  it('throws when a groupBy field exceeds the max length', () => {
    expect(() =>
      degradedDocsParamsSchema.validate({ ...validParams, groupBy: ['a'.repeat(1001)] })
    ).toThrow('[groupBy.0]: value has length [1001] but it must have a maximum length of [1000].');
  });

  it('validates groupBy with exactly the max number of fields', () => {
    expect(() =>
      degradedDocsParamsSchema.validate({
        ...validParams,
        groupBy: Array.from({ length: 100 }, (_, i) => `field${i}`),
      })
    ).not.toThrow();
  });

  it('throws when groupBy has too many fields', () => {
    expect(() =>
      degradedDocsParamsSchema.validate({
        ...validParams,
        groupBy: Array.from({ length: 101 }, (_, i) => `field${i}`),
      })
    ).toThrow('[groupBy]: array size is [101], but cannot be greater than [100]');
  });
});
