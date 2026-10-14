/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationType, transactionDurationParamsSchema } from './v1';

const base = {
  windowSize: 5,
  windowUnit: 'm',
  threshold: 1500,
  aggregationType: AggregationType.Avg,
  serviceName: 'opbeans-java',
  transactionType: 'request',
  transactionName: 'GET /api/orders',
  environment: 'production',
  groupBy: ['service.name', 'service.environment'],
};

describe('transactionDurationParamsSchema', () => {
  it('accepts valid params, including maximum length strings and ten group by fields', () => {
    expect(() => transactionDurationParamsSchema.validate(base)).not.toThrow();
    expect(() =>
      transactionDurationParamsSchema.validate({
        ...base,
        serviceName: 'a'.repeat(1024),
        groupBy: Array.from({ length: 10 }, () => 'a'.repeat(1024)),
      })
    ).not.toThrow();
  });

  it.each(['serviceName', 'transactionType', 'environment'])('rejects an over-long %s', (field) => {
    expect(() =>
      transactionDurationParamsSchema.validate({ ...base, [field]: 'a'.repeat(1025) })
    ).toThrow(/maximum length/);
  });

  it('accepts a transactionName up to 10,000 characters and rejects a longer one', () => {
    expect(() =>
      transactionDurationParamsSchema.validate({ ...base, transactionName: 'a'.repeat(10_000) })
    ).not.toThrow();
    expect(() =>
      transactionDurationParamsSchema.validate({ ...base, transactionName: 'a'.repeat(10_001) })
    ).toThrow(/maximum length/);
  });

  it('rejects an over-long windowUnit', () => {
    expect(() =>
      transactionDurationParamsSchema.validate({ ...base, windowUnit: 'm'.repeat(11) })
    ).toThrow(/maximum length/);
  });

  it('rejects an over-long groupBy item', () => {
    expect(() =>
      transactionDurationParamsSchema.validate({ ...base, groupBy: ['a'.repeat(1025)] })
    ).toThrow(/maximum length/);
  });

  it('rejects more than ten groupBy fields', () => {
    expect(() =>
      transactionDurationParamsSchema.validate({
        ...base,
        groupBy: Array.from({ length: 11 }, () => 'a'),
      })
    ).toThrow(/cannot be greater than \[10\]/);
  });
});
